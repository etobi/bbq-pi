$(document).ready(function () {
	var socket = io();

	$('#linkrpimonitor').attr('href', 'http://' + window.location.hostname + ':8888/');
	$('#linkinfluxdb').attr('href', 'http://' + window.location.hostname + ':8083/');

	Vue.filter('formatDateDDMMYYHHMM', function (value) {
		if (value) {
			return moment(value).format('DD.MM.YYYY hh:mm')
		}
	});
	Vue.filter('fromNow', function (value) {
		if (value) {
			return moment(value).fromNow();
		}
	});

	var vm = new Vue({
		el: '#app',
		data: {
			lastUpdate: null,
			status: '',
			probes: {},
			session: {},
			tempchartTimerange: '1h',
			tempchartAggregation: '1m',
			tempchart: null
		},
		methods: {
			executeChartQuery: function(queryInput) {
				console.log($(queryInput));
				var query = $(queryInput).val();	
				this.updateTempchart(query);
			},
			setTempchartTimerange: function (timerange, aggregation) {
				this.tempchartTimerange = timerange;
				this.tempchartAggregation = aggregation;
				this.updateTempchart();
			},
			initTempchart: function () {
				$("<div id='tooltip' class='lead label label-default'></div>").css({
					position: "absolute",
					display: "none"
				}).appendTo("body");

				this.tempchart = $.plot(
						"#tempchart",
						[], {
							grid: {
								borderColor: "#f3f3f3",
								borderWidth: 0,
								tickColor: "#f3f3f3",
								hoverable: true
							},
							series: {
								shadowSize: 0,
								color: "#d2d6de",
								lines: {show: true},
								points: {show: false}
							},
							lines: {
								fill: true,
								color: "#d2d6de"
							},
legend: {
    show: false },
							yaxis: {
								show: true
							},
							xaxis: {
								show: true,
								mode: 'time',
								// timezone: 'browser'
							}
						});

				$('#tempchart').bind("plothover", function (event, pos, item) {
					if (item) {
						var x = item.datapoint[0], y = item.datapoint[1].toFixed(2);
						var time = moment(x).format('hh:mm')
						$("#tooltip").html(
								item.series.label + ", " + time + ", " + y + "°C"
						)
								.css({top: item.pageY + 5, left: item.pageX + 5})
								.fadeIn(200);
					} else {
						$("#tooltip").hide();
					}
				});
			},
			updateTempchart: function (query) {
				if (this.session.identifier && $('#tempchart').is(':visible')) {
					var that = this;

					var influxdb = 'http://' + window.location.hostname + ':8086/query';

					if (!query) {
						query = "SELECT MEAN(value) FROM temp " +
								"WHERE \"sessionIdentifier\" = '" + this.session.identifier + "' " +
								"AND time > now() - " + this.tempchartTimerange +
								" GROUP BY probe, time(" + this.tempchartAggregation + "),* fill(0)";
					}
					$.get(influxdb, {
								db: 'bbq-pi',
								q: query
							},
							function (influxData) {
								if (influxData.results[0].series) {
									var chartData = influxData.results[0].series.map(function (s) {
										return {
											label: that.probes[s.tags.probe].title,
											color: that.probes[s.tags.probe].color,
											data: s.values.map(function (v) {
												return [new Date(v[0]).getTime(), v[1]];
											})
										};
									});
									that.tempchart.setData(chartData);
									that.tempchart.setupGrid();
									that.tempchart.draw();
								}
							}
					);
				}
			},
			updateCamera: function () {
				var ts = new Date().getTime();
				$('#camera').attr('src', '/camera.jpg?' + ts);
			}
		},

		created: function () {
			socket.on('probes-config-update', function (data) {
				var that = this;
				$(data).each(function (index) {
					Vue.set(that.probes, data[index].channel, data[index]);
				});
			}.bind(this));

			socket.on('session-update', function (data) {
				this.session = data;
				this.initTempchart();
				this.updateTempchart();
				window.setInterval(function () {
					// this.updateTempchart();
				}.bind(this), 10000);
			}.bind(this));

			socket.on('probe-update', function (data) {
				this.lastUpdate = new Date(data.timestamp);
				Vue.set(this.probes[data.channel], 'active', data.active);
				Vue.set(this.probes[data.channel], 'value', data.value);
			}.bind(this));

			socket.on('camera-update', function (data) {
				this.updateCamera();
			}.bind(this));
		}
	});
});

