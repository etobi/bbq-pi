exports.start = initServer;

var express = require('express'),
		app = express(),
		http = require('http'),
		httpServer = http.createServer(app),
		io = require('socket.io').listen(httpServer),
		ip = require("ip"),
		McpAdc = require('mcp-adc'),
		adc = new McpAdc.Mcp3208(),
		fs = require('fs'),
		jsonfile = require('jsonfile');


// // // // // //
// for debugging
adc = {
	readRawValue: function (channel, callback) {
		var max = 620,
				min = 590;
		callback(Math.floor(Math.random() * (max - min + 1) + min));
	}
};
// // // // // //


var dataSeries = {};
var dataSeriesFile = './log/20160708.json'; // TODO
fs.access(dataSeriesFile, fs.F_OK, function (err) {
	if (!err) {
		dataSeries = jsonfile.readFileSync(dataSeriesFile);
	}
});


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

	var temps = {};

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
				setInterval(peristDataSeries, 1000 * 60);
			},

			getTempFromAdcRawValue = function (rawvalue, probe) {
				console.log(probe.name, rawvalue);
				if (rawvalue === 0) return 999.9;
				tempResistor = probe.resistor * ((probe.maxvalue / rawvalue) - 1);
				volts = Math.log(tempResistor / probe.rn);
				// steinhart-hart
				temp = (1 / (probe.a + (probe.b * volts) + (probe.c * volts * volts))) - 273;
				if (probe.adjust) {
					temp = temp * probe.adjust;
				}
				return temp;
			},

			updateTemp = function () {
				config.probes.forEach(function (probe) {
					adc.readRawValue(probe.channel, function (value) {
						if (value > 30) {
							var temp = getTempFromAdcRawValue(value, probe);
							var roundedTemp = parseFloat(temp).toFixed(1);
							var channelKey = 'channel' + probe.channel;
							temps[channelKey] = roundedTemp;
							if (!dataSeries[channelKey]) {
								dataSeries[channelKey] = [];
							}
							dataSeries[channelKey].push([Date.now(), roundedTemp]);
						}
					});
				});

				io.sockets.emit('temp', temps);
			},

			peristDataSeries = function () {
				// jsonfile.writeFile(dataSeriesFile, dataSeries, function (err) {
				// });
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
