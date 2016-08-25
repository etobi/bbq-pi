var etobiShield = require('etobi-shield');
var uuid = require('node-uuid');

var sessionIdentifier;

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var path = require('path');
var config = require('./../config.json');

var elasticsearch = require('elasticsearch');
var elasticsearchClient = new elasticsearch.Client({
	host: 'localhost:9200',
	log: 'error'
});

exports.start = function () {
	initializeHttpApp();
	initializeElasticSearch();
	initializeSession();
	initializeIoSocket();

	setInterval(function () {
		updateAllProbes();
	}, 5000);
};


var initializeSession = function () {
	sessionIdentifier = uuid.v1();
	console.log('Session-ID: ', sessionIdentifier);
	elasticsearchClient.index({
		index: 'bbq-pi',
		type: 'session',
		id: sessionIdentifier,
		body: {
			start: Date.now()
		}
	}, function (error, response) {
	});
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

var initializeElasticSearch = function () {
	elasticsearchClient.ping({
		requestTimeout: 30000,
	}, function (error) {
		if (error) {
			console.error('cant connect to elasticsearch cluster!');
		}
	});
};

var storeInElasticSearch = function (probe, value) {
	if (elasticsearchClient) {
		elasticsearchClient.index({
			index: 'bbq-pi',
			type: 'probeValue',
			body: {
				channel: probe.channel,
				value: value,
				date: Date.now()
			}
		}, function (error, response) {
			// TODO
		});
	}
};

var updateProbe = function (probe) {
	etobiShield.readAdcTemp(probe, function (channel, temp) {
		var dateNow = Date.now();
		storeInElasticSearch(probe, {timestamp: dateNow, value: temp});
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
	});
};

var updateAllProbes = function () {
	config.probes.forEach(function (probe) {
		updateProbe(probe);
	});
};


