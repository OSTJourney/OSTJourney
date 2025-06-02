songPlayButton = document.getElementById('song-page-play');
addListener(songPlayButton, 'click', function (e) {
	const songParam = new URL(window.location.href).searchParams.get('song');
	const songId = parseInt(songParam, 10);
	if (!isNaN(songId))
		changeSong(songId);
	songPlayButton.style.display = 'none';
	songPlayButton.style.visibility = 'hidden';
});
