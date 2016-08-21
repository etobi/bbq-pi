
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

	io.on('connection', function (socket) {
		io.emit('updated-dashboard-values', computeDashboardValues());
	});

	http.listen(app.get('port'), function () {
		console.log('listening on *:' + app.get('port'));
	});

	setInterval(function () {
		io.emit('updated-dashboard-values', computeDashboardValues());
	}, 5000);
};

var computeDashboardValues = function() {
	var computeProbeValues = function () {
		var probes = [];
		config.probes.forEach(function (probe, index) {
			var probeToAdd = {
				title: probe['title'] || ('Probe #' + (probe.channel || '?')),
				current: 42.3, // TODO
				status: 'online',  // TODO
				icon: probe['icon'] || 'fa-question-circle-o',
				color: probe['color'] || 'bg-gray'
			};
			probes.push(probeToAdd);
		});
		return probes;
	};

	return {
		lastUpdate: Date.now(),
		status: 'ok',
		probes: computeProbeValues()
	};
}
