var etobiShield;
try {
	etobiShield = require('etobi-shield');
} catch (e) {
	etobiShield = require('etobi-shield-dummy');
}
var uuid = require('uuid');

var session = {identifier: null, start: null};

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt');
var Influx = require('influx'), influx;
var databasename = 'bbqpi'; // todo config

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

	initializeSession();
	initializeInfluxDb();
	initializeMqtt();
	initializeIoSocket();
	initializeHttpApp();
	initializeCamera();

	etobiShield.led1Off();

	setInterval(function () {
		etobiShield.led1On();
		updateAllProbes();
		etobiShield.led1Off();
	}, 5000);

	updateSysinfo();
	setInterval(function () {
		etobiShield.led2On();
		updateSysinfo();
		etobiShield.led2Off();
	}, 60000);
};

var initializeInfluxDb = function () {
	influx = new Influx.InfluxDB({
		host: 'localhost',
		database: databasename,
		schema: [
			{
				measurement: 'temp', // todo config
				fields: {
					value: Influx.FieldType.FLOAT
				},
				tags: [
					'sessionIdentifier', 'probe'
				]
			}
		]
	});
	influx.getDatabaseNames().then(function (names) {
		if (!names.includes(databasename)) {
			console.log('create influxdb database ' + databasename);
			return influx.createDatabase(databasename);
		}
	});
};

var initializeSession = function () {
	session.identifier = uuid.v1();
	session.start = new Date();
	console.log('Session-ID: ', session.identifier);
};

var initializeHttpApp = function () {
	app.set('port', (process.env.PORT || 8081));

	app.use(express.static(path.join(__dirname, '../public/')));
	app.use('/vue', express.static(path.join(__dirname, '../node_modules/vue/dist/')));
	app.use('/moment', express.static(path.join(__dirname, '../node_modules/moment/min/')));

	app.get('/', function (req, res) {
		res.sendfile(path.join(__dirname, '../views/index.html'));
	});

	app.get('/camera.jpg', function (req, res) {
		res.sendfile(path.join("/tmp/camera.jpg")); // TODO config
	});

	http.listen(app.get('port'), function () {
		console.log('listening on *:' + app.get('port'));
	});
};

var initializeCamera = function () {
	var path = "/tmp/camera.jpg";
	const PiCamera = require('pi-camera');
	const myCamera = new PiCamera({
		mode: 'photo',
		output: path,
		width: 640,
		height: 480,
		nopreview: true
	});

	setInterval(function () {
		io.emit('camera-update', path);
		myCamera.snap()
				.then(function (msg) {
					io.emit('camera-update', path);
				})
				.catch(function (error) {
					console.debug('error');
				});
	}, 10000);

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
			identifier: session.identifier,
			start: session.start
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

		// store for the display
		displayStorage.temp[probe.channel] = (value == null || isNaN(value) ? '-' : value);

		if (value == null || !value || isNaN(value)) {
			return;
		}

		// stroe for influxdb
		var timestampU = timestamp / 1000;
		if (influx) {
			var floatValue = parseFloat(value);
			if (!isNaN(floatValue)) {
				influx.writePoints(
						[
							{
								measurement: 'temp', // todo config
								tags: {
									sessionIdentifier: session.identifier,
									probe: probe.channel
								},
								fields: {
									value: floatValue
								}
							}
						], {
							database: databasename,
							// retentionPolicy: '1d',
							precision: 's'
						});
			}
		}
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

			if (isNaN(temp) || temp <= -50.0) {
				temp = null;
			}

			if (temp != null) {
				temp = Number(temp).toFixed(1);
			}

			emitWebsocket(timestamp, probe, temp);
			publishMqtt(timestamp, probe, temp);
			storeValue(timestamp, probe, temp);
		} else {
			// TODO error handling
		}
	});
};


var displayStorage = {
	version: '0.0.0',
	ip: '<no ip>',
	ssid: '<no ssid>',
	temp: {
		0: '-',
		1: '-',
		2: '-',
		3: '-',
		4: '-',
		5: '-'
	}
};

var updateDisplay = function () {
	var stringPad = function (string, paddingValue) {
		return String(paddingValue + string).slice(-paddingValue.length);
	};
	etobiShield.display.clearAll();
	etobiShield.display.writeLine(0, 'BBQ-PI       ' + displayStorage.version);
	etobiShield.display.writeLine(1, stringPad(displayStorage.temp[0], '     ') + '        ' + stringPad(displayStorage.temp[1], '     '));
	etobiShield.display.writeLine(2, stringPad(displayStorage.temp[2], '     ') + '         ' + stringPad(displayStorage.temp[3], '     '));
	etobiShield.display.writeLine(3, stringPad(displayStorage.temp[4], '     ') + '         ' + stringPad(displayStorage.temp[5], '     '));
	etobiShield.display.writeLine(5, '' + displayStorage.ssid);
	etobiShield.display.writeLine(6, '' + displayStorage.ip);
};


var updateAllProbes = function () {
	config.probes.forEach(function (probe) {
		updateProbe(probe);
	});
	updateDisplay();
};

var updateSysinfo = function () {
	var exec = require('child_process').exec;

	exec("hostname -I | awk '{print $1}'", function (error, stdout, stderr) {
		displayStorage.ip = stdout;
	});

	exec("iwconfig wlan0 | grep ESSID | awk -F'ESSID:' '{print $2}' | awk -F'\"' '{print $2}'", function (error, stdout, stderr) {
		displayStorage.ssid = stdout;
	});

	displayStorage.version = require('../package.json').version;

	updateDisplay();
};

