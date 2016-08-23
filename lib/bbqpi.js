var etobiShield = require('etobi-shield');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var config = require('./../config.json');

exports.start = function () {
	app.set('port', (process.env.PORT || 8081));

	app.use(express.static(path.join(__dirname, '../public/')));
	app.use('/vue', express.static(path.join(__dirname, '../node_modules/vue/dist/')));

	app.get('/', function (req, res) {
		res.sendfile(path.join(__dirname, '../views/index.html'));
	});

	http.listen(app.get('port'), function () {
		console.log('listening on *:' + app.get('port'));
	});

	io.on('connection', function (socket) {
		updateAllProbes();

		socket.on('update-probe', function (data) {
			config.probes.forEach(function (probe) {
				if (data.probe.channel == probe.channel) {
					updateProbe(probe);
				}
			});
		});
	});

	setInterval(function () {
		updateAllProbes();
	}, 5000);
};

var updateProbe = function (probe) {
		etobiShield.readAdcTemp(probe, function (channel, temp) {
			var updateValue = {
				timestamp: Date.now(),
				probe: {
					channel: probe.channel,
					title: probe['title'] || ('Probe #' + (probe.channel || '?')),
					current: temp,
					status: 'online',  // TODO
					icon: probe['icon'] || 'fa-question-circle-o',
					color: probe['color'] || 'bg-gray'
				}
			};
			io.emit('updated-probe', updateValue);
		});
};

var updateAllProbes = function () {
	config.probes.forEach(function (probe) {
		updateProbe(probe);
	});
};


