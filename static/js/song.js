songPlayButton = document.getElementById('song-page-play');
addListener(songPlayButton, 'click', function (e) {
	changeSong(new URL(window.location.href).searchParams.get('song'));
	songPlayButton.style.display = 'none';
	songPlayButton.style.visibility = 'hidden';
});
