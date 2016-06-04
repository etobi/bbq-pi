exports.start = initServer;

var express    = require('express'),
		app    = express(),
		http = require('http'),
		httpServer = http.createServer(app),
		io     = require('socket.io').listen(httpServer),
		ip     = require("ip");

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