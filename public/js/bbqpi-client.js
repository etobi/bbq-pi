$(document).ready(function () {
	if (!Date.now) {
		Date.now = function () {
			return new Date().getTime();
		}
	}
	var charts = {};
	var socket = io.connect(),
			updateData = function (target, data) {
				jQuery.each(data, function (index, value) {
					var key = target + '-' + index;
					$('#bbqpi-' + key).text(value);
					if (charts[key]) {
						var plot = charts[key];
						var allData = plot.getData();
						allData[0].data.push([Date.now(), value]);
						plot.setData(allData);
						plot.setupGrid();
						plot.draw();
					}
				});
			};

	socket.on('temp', function (data) {
		updateData('temp', data);
	});

	socket.on('dataSeries', function (data) {
		jQuery.each(data, function (index, value) {
			var key = 'temp-' + index;
			console.debug(key, value);
			if (charts[key]) {
				var plot = charts[key];
				var allData = plot.getData();
				allData[0].data = value;
				plot.setData(allData);
				plot.setupGrid();
				plot.draw();
			}
		});
	});

	charts['temp-channel0'] = $.plot($("#bbqpi-chart-temp-channel0"),
			[
				{
					color: '#dd4b39',
					data: []
				}
			],
			{
				grid: {
					hoverable: true,
					borderColor: "#f3f3f3",
					borderWidth: 1,
					tickColor: "#f3f3f3"
				},
				lines: {
					fill: false,
					color: ["#3c8dbc", "#f56954"]
				},
				series: {
					lines: {show: true},
					points: {show: true}
				},
				yaxis: {},
				xaxis: {
					mode: "time",
					timeformat: "%H:%M:%S"
				}
			});

	charts['temp-channel1'] = $.plot($("#bbqpi-chart-temp-channel1"),
			[
				{
					color: '#dd4b39',
					data: []
				}
			],
			{
				grid: {
					hoverable: true,
					borderColor: "#f3f3f3",
					borderWidth: 1,
					tickColor: "#f3f3f3"
				},
				lines: {
					fill: false,
					color: ["#3c8dbc", "#f56954"]
				},
				series: {
					lines: {show: true},
					points: {show: true}
				},
				yaxis: {},
				xaxis: {
					mode: "time",
					timeformat: "%H:%M:%S"
				}
			});
});

