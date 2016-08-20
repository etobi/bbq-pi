$(document).ready(function () {
	var socket = io();

	var vm = new Vue({
		el: '#app',
		data: {
			foo: '...'
		},
		created: function () {
			socket.on('updated-dashboard-values', function (data) {
				this.foo = data.foo;
			}.bind(this));
		}
	});
});

