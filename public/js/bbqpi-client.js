$(document).ready(function () {
	var socket = io();
	var vm = new Vue({
		el: '#app',
		data: {
			lastUpdate: null,
			status: '',
			probes: {},
			sessionIdentifier: ''
		},
		methods: {},
		created: function () {
			socket.on('probes-config-update', function (data) {
				var that = this;
				$(data).each(function (index) {
					Vue.set(that.probes, data[index].channel, data[index]);
				});
			}.bind(this));

			socket.on('session-update', function (data) {
				this.sessionIdentifier = data.sessionIdentifier;
			}.bind(this));

			socket.on('probe-update', function (data) {
				this.lastUpdate = data.timestamp;
				Vue.set(this.probes[data.channel], 'active', data.active);
				Vue.set(this.probes[data.channel], 'value', data.value);
			}.bind(this));
		}
	});
});

