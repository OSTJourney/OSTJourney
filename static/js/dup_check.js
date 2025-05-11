addListener(document, 'DOMContentLoaded', function() {
	if (!window.isFullPageLoaded) {
		location.reload();
	}
});