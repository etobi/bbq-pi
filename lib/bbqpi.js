var etobiShield = require('etobi-shield');
var uuid = require('node-uuid');

var sessionIdentifier;

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt');

var path = require('path');
var config = require('./../config.json');

var fs = require('fs');

exports.start = function () {
	etobiShield.led1On();
	initializeHttpApp();
	initializeSession();
	initializeMqtt();
	initializeIoSocket();
	etobiShield.led1Off();

	setInterval(function () {
		etobiShield.led1On();
		updateAllProbes();
		etobiShield.led1Off();
	}, 5000);
};

var initializeSession = function () {
	sessionIdentifier = uuid.v1();
	console.log('Session-ID: ', sessionIdentifier);
};

var initializeHttpApp = function () {
	app.set('port', (process.env.PORT || 8081));

	app.use(express.static(path.join(__dirname, '../public/')));
	app.use('/vue', express.static(path.join(__dirname, '../node_modules/vue/dist/')));

	app.get('/', function (req, res) {
		res.sendfile(path.join(__dirname, '../views/index.html'));
	});

	http.listen(app.get('port'), function () {
		console.log('listening on *:' + app.get('port'));
	});
};

var mqttClient;
var initializeMqtt = function () {
	mqttClient = mqtt.connect(
			'mqtt://127.0.0.1', // todo config
			{
				"username": "",
				"will": {
					"topic": "bbqpi/status",
					"payload": "offline",
					"retain": true
				}
			}
	);
	mqttClient.on('connect', function () {
		mqttClient.publish(
				'bbqpi/status',
				'online'
		);
		console.log('mqtt connected');
	});
};

var initializeIoSocket = function () {
	io.on('connection', function (socket) {
		updateAllProbes();

		io.emit('updated-session', {
			sessionIdentifier: sessionIdentifier
		});

		socket.on('update-probe', function (data) {
			config.probes.forEach(function (probe) {
				if (data.probe.channel == probe.channel) {
					updateProbe(probe);
				}
			});
		});
	});
};


var storeValue = function (probe, value) {
	var timestamp = value.timestamp / 1000;
};

var updateProbe = function (probe) {
	etobiShield.readAdcTemp(probe, function (channel, temp) {
		if (temp) {
			var dateNow = Date.now();
			storeValue(probe, {timestamp: dateNow, value: temp});
			var updateValue = {
				timestamp: dateNow,
				probe: {
					channel: probe.channel,
					title: probe['title'] || ('Probe #' + (probe.channel || '?')),
					current: temp,
					value: temp,
					status: 'online',  // TODO
					icon: probe['icon'] || 'fa-question-circle-o',
					color: probe['color'] || 'bg-gray'
				}
			};
			io.emit('updated-probe', updateValue);
			mqttClient.publish('bbqpi/temp/' + probe.channel, temp);
		} else {
			// TODO error handling
		}
	});
};

var updateAllProbes = function () {
	config.probes.forEach(function (probe) {
		updateProbe(probe);
	});
};


