exports.start = initServer;

var express    = require('express'),
		app    = express(),
		http = require('http'),
		httpServer = http.createServer(app),
		io     = require('socket.io').listen(httpServer),
		ip     = require("ip"),
		exec   = require('child_process').exec;

var commands = {
	readChannel0: 'echo 123.45678',
	readChannel1: 'echo 234.56789'
//	readChannel0: './bin/readFromSpi.py 0 0.0033354016 0.000225 0.00000251094 925;',
//	readChannel1: './bin/readFromSpi.py 1 0.0033354016 0.000225 0.00000251094 925;'
};

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
	
	var 	initHttp = function() {
				httpServer.listen(config.port);
				app.use(express.static(__dirname + '/..' + '/public'));
				app.get('/', function (req, res) {
					res.sendfile(__dirname  + '/..' + '/public/index.html');
				});
			},
			initSocket = function() {
				io.sockets.on('connection', function (socket) {
					console.log('client connected: ' + socket.id);
				});
				return io;
			},
			initUpdates = function() {
				setInterval(updateTemp, 5000);
			},

			updateTemp = function() {
				exec(commands.readChannel0, function(error, stdout, stderr) {
					if (error == null) {
						temps.channel0 = parseFloat(stdout).toFixed(2);
					} else {
						temps.channel0 = 999.9;
						// TODO handle error
					}
				});
				exec(commands.readChannel1, function(error, stdout, stderr) {
					if (error == null) {
						temps.channel1 = parseFloat(stdout).toFixed(2);
					} else {
						temps.channel1 = 999.9;
						// TODO handle error
					}
				});

				io.sockets.emit('temp', temps);
			};

	/**
	 * @type {{init: Function}}
	 */
	var bbqpi = {
		init: function(config) {
			console.log('start ...');

			initHttp();
			initSocket();
			initUpdates();

			console.log( 'http://' + ip.address() + ':' + config.port + '/');

			return this;
		}

	};

	return bbqpi.init(config);
}