$(document).ready(function () {
	var socket = io();

	var vm = new Vue({
		el: '#app',
		data: {
			lastUpdate: null,
			status: '',
			probes: [],
			sessionIdentifier: ''
		},
		methods: {
			refreshProbe: function (probe) {
				console.log('refresh');
				socket.emit('update-probe', {probe: probe});
			}
		},
		created: function () {

			socket.on('updated-session', function (data) {
				this.sessionIdentifier = data.sessionIdentifier;
			}.bind(this));

			socket.on('updated-probe', function (data) {
				this.lastUpdate = data.timestamp;
				// TODO use object instead
				this.probes.$set(data.probe.channel, data.probe);
			}.bind(this));
		}
	});

});

