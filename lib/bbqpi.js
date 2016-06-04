exports.start = initServer;

var express    = require('express'),
		app    = express(),
		http = require('http'),
		httpServer = http.createServer(app),
		io     = require('socket.io').listen(httpServer),
		ip     = require("ip"),
		exec   = require('child_process').exec;

var commands = {
	// readChannel0: 'echo 123.45678',
	// readChannel1: 'echo 234.56789'
	readChannel0: './bin/readFromSpi.py 0 0.0033354016 0.000225 0.00000251094 925;',
	readChannel1: './bin/readFromSpi.py 1 0.0033354016 0.000225 0.00000251094 925;'
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

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}
	
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
				var read = function(name, readChannel, tempsChannel) {
					console.log(readChannel);
					exec(readChannel, function(error, stdout, stderr) {
						var temp;
						if (error == null) {
							temp = parseFloat(stdout).toFixed(2);
							var fs = require('fs');
							var logStream = fs.createWriteStream('log_' + name + '.txt', {'flags': 'a'});
							logStream.end(Date.now() + ';' + tempsChannel + "\n");
						} else {
							temp = 999.9;
						}
						console.log(temp);
						temps[tempsChannel] = temp;
					});
				}
				read('ch0', commands.readChannel0, 'channel0');
				read('ch1', commands.readChannel1, 'channel1');

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
