process.title = 'bbq-pi';

var config = require('./config.json'),
		bbqpi = require('./lib/bbqpi.js');

bbqpi.start(config);