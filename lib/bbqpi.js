exports.start = initServer;

var express = require('express'),
		app = express(),
		http = require('http'),
		httpServer = http.createServer(app),
		io = require('socket.io').listen(httpServer),
		ip = require("ip"),
		McpAdc = require('mcp-adc'),
		adc = new McpAdc.Mcp3208();


// // // // // //
// for debugging
// readRawValue = function(channel, callback) {
// 	callback(601);
// };
// // // // // //

var probes = [
	{
		name: 'Fantast Ch#0',
		channel: 0,
		maxvalue: 4096,
		resistor: 47,
		a: 0.00334519,
		b: 0.000243825,
		c: 0.00000261726,
		rn: 220
	},
	{
		name: 'Fantast Ch#1',
		channel: 1,
		maxvalue: 4096,
		resistor: 47,
		a: 0.00334519,
		b: 0.000243825,
		c: 0.00000261726,
		rn: 220
	}
];

var dataSeries = {};

/*
 Zeit
 Laufzeit
 Wetter, Vorhersage
 Temperaturen
 */

/**
 * @returns {{start: Function}}
 */
function initServer(config) {

	var temps = {
		channel0: '999.9',
		channel1: '999.9'
	};

	if (!Date.now) {
		Date.now = function () {
			return new Date().getTime();
		}
	}

	var initHttp = function () {
				httpServer.listen(config.port);
				app.use(express.static(__dirname + '/..' + '/public'));
				app.get('/', function (req, res) {
					res.sendfile(__dirname + '/..' + '/public/index.html');
				});
			},

			initSocket = function () {
				io.sockets.on('connection', function (socket) {
					console.log('client connected: ' + socket.id);
					io.sockets.emit('dataSeries', dataSeries);
				});
				return io;
			},

			initUpdates = function () {
				setInterval(updateTemp, 5000);
			},

			getTempFromAdcRawValue = function(rawvalue, probe) {
				if (rawvalue === 0) return 999.9;
				tempResistor = probe.resistor * ((probe.maxvalue / rawvalue) - 1);
				volts = Math.log(tempResistor / probe.rn);
				temp = (1 / (probe.a + (probe.b * volts) + (probe.c * volts * volts))) - 273;
				return temp;
			},

			updateTemp = function () {
				probes.forEach(function(probe) {
					adc.readRawValue(probe.channel, function(value) {
						var temp = getTempFromAdcRawValue(value, probe);
						var roundedTemp = parseFloat(temp).toFixed(2);
						var channelKey = 'channel' + probe.channel;
						temps[channelKey] = roundedTemp;
						if (!dataSeries[channelKey]) {
							dataSeries[channelKey] = [];
						}
						dataSeries[channelKey].push([Date.now(), roundedTemp]);
					});
				});

				io.sockets.emit('temp', temps);
			};

	/**
	 * @type {{init: Function}}
	 */
	var bbqpi = {
		init: function (config) {
			console.log('start ...');

			initHttp();
			initSocket();
			initUpdates();

			console.log('http://' + ip.address() + ':' + config.port + '/');

			return this;
		}

	};

	return bbqpi.init(config);
}
