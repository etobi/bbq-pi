var etobiShield = require('etobi-shield');
var uuid = require('uuid');

var sessionIdentifier;

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt');

var path = require('path');
var config = require('./../config.json');

var fs = require('fs');

var debugMode = false;

process.argv.forEach(function (val, index, array) {
  if (val === '--debug') {
	  debugMode = true;
	  console.log('Enable debug mode');
  }
});

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
					"topic": "bbqpi/status", // todo config
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
		io.emit('probes-config-update', config.probes);

		io.emit('session-update', {
			sessionIdentifier: sessionIdentifier
		});

		updateAllProbes();
	});
};


var updateProbe = function (probe) {

	var emitWebsocket = function (timestamp, probe, value) {
		io.emit('probe-update', {
			timestamp: timestamp,
			channel: probe.channel,
			value: value,
			active: (value !== null)
		});
	};

	var storeValue = function (timestamp, probe, value) {
		var timestampU = timestamp / 1000;
	};

	var publishMqtt = function (timestamp, probe, value) {
		mqttClient.publish(
				'bbqpi/probes/' + probe.channel + '/temp', // todo config
				value + ''
		);
	};

	etobiShield.readAdcTemp(probe, function (channel, temp) {
		if (temp) {
			var timestamp = Date.now();

			if (debugMode) {
				temp = (Math.random() * 200 - 80).toFixed(2);
			}

			if (isNaN(temp) || temp <= -50.0 ) {
				temp = null;
			}

			emitWebsocket(timestamp, probe, temp);
			storeValue(timestamp, probe, temp);
			publishMqtt(timestamp, probe, temp);
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


