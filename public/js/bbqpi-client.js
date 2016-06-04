$(document).ready(function(){
	var socket = io.connect(),
			updateData = function(target, data) {
				jQuery.each(data, function(index, value) {
					$('#bbqpi-' + target + '-' + index).text(value);
				});
			};

	socket.on('temp', function (data) {
		updateData('temp', data);
	});
});

