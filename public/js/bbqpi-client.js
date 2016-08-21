$(document).ready(function () {
	var socket = io();

	var vm = new Vue({
		el: '#app',
		data: {
			lastUpdate: null,
			status: '',
			probes: {}
		},
		created: function () {
			socket.on('updated-dashboard-values', function (data) {
				this.lastUpdate = data.lastUpdate;
				this.status = data.status;
				this.probes = data.probes;
			}.bind(this));
		}
	});
});

