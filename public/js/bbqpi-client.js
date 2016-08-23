$(document).ready(function () {
	var socket = io();

	var vm = new Vue({
		el: '#app',
		data: {
			lastUpdate: null,
			status: '',
			probes: []
		},
		methods: {
			refreshProbe: function (probe) {
				console.log('refresh');
				socket.emit('update-probe', {probe: probe});
			}
		},
		created: function () {
			socket.on('updated-probe', function (data) {
				this.lastUpdate = data.timestamp;
				this.probes.$set(data.probe.channel, data.probe);
			}.bind(this));
		}
	});

});

