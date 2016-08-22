$(document).ready(function () {
	var socket = io();

	var vm = new Vue({
		el: '#app',
		data: {
			lastUpdate: null,
			status: '',
			probes: []
		},
		created: function () {
			socket.on('updated-probe-value', function (data) {
				this.lastUpdate = data.timestamp;
				this.probes.$set(data.probe.channel, data.probe);
			}.bind(this));
		}
	});
});

