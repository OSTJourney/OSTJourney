/*Animation for title or artist too big*/
var player_title = document.querySelector('#player-song-title');
var player_artist = document.querySelector('#player-song-artist');
var player_album = document.querySelector('#player-song-album');
var player_info_text = document.querySelector('#player-song-info-text');
var player_cover = document.getElementById('player-cover');
const parentWidth = document.getElementById('player-song-info-text').offsetWidth;
const animationKeyframes = `
	@keyframes scroll-left {
	0% {
		transform: translateX(0%);
	}
	42% {
		transform: translateX(calc(-100% + ${parentWidth}px));
	}
	50% {
		transform: translateX(calc(-100% + ${parentWidth}px));
	}
	92% {
		transform: translateX(0%);
	}
	}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = animationKeyframes;
document.head.appendChild(styleSheet);

player_info_text.addEventListener('mouseenter', function () {
	if (player_title.offsetWidth > parentWidth)
		player_title.classList.add('scroll-left');
	if (player_artist.offsetWidth > parentWidth)
		player_artist.classList.add('scroll-left');
	if (player_album.offsetWidth > parentWidth)
		player_album.classList.add('scroll-left');
});

player_info_text.addEventListener('mouseleave', function () {
	player_title.classList.remove('scroll-left');
	player_artist.classList.remove('scroll-left');
	player_album.classList.remove('scroll-left');
});




var player_button_play = document.querySelector('#player-button-play');
var audio = null;
var song = 0;

const playIcon = "/static/images/player/play.png";
const pauseIcon = "/static/images/player/pause.png";

let volume = document.getElementById("player-volume-bar");
let old_volume = 0;
let volume_ico = document.getElementById("volume-ico");

let player_progress_bar = document.getElementById("player-progress-bar");
let player_current_time = document.getElementById("player-current-time");
let duration = 0;

function updateVolumeIcon() {
	if (volume.value == 0) {
		volume_ico.src = "/static/images/player/volume 0.png";
	} else if (volume.value <= 33) {
		volume_ico.src = "/static/images/player/volume 33.png";
	} else if (volume.value <= 66) {
		volume_ico.src = "/static/images/player/volume 66.png";
	} else {
		volume_ico.src = "/static/images/player/volume 100.png";
	}
}

function formatDuration(duration) {
	let formatted = "";
	let hours = Math.floor(duration / 3600);
	if (hours > 0) {
		duration -= hours * 3600;
		formatted = hours + ":";
	}
	let minutes = Math.floor(duration / 60);
	duration -= minutes * 60;
	formatted += (minutes < 10 ? "0" : "") + minutes + ":";
	formatted += (duration < 10 ? "0" : "") + Math.floor(duration);
	return formatted;
}

function updateMetaTagsAndFavicon(title, artist, coverUrl) {
	let metaTitle = document.querySelector('meta[property="og:title"]');
	if (metaTitle) {
		metaTitle.setAttribute('content', `${title} - ${artist}`);
	} else {
		metaTitle = document.createElement('meta');
		metaTitle.setAttribute('property', 'og:title');
		metaTitle.setAttribute('content', `${title} - ${artist}`);
		document.head.appendChild(metaTitle);
	}

	let metaDescription = document.querySelector('meta[property="og:description"]');
	if (metaDescription) {
		metaDescription.setAttribute('content', `Listen to ${title} by ${artist}.`);
	} else {
		metaDescription = document.createElement('meta');
		metaDescription.setAttribute('property', 'og:description');
		metaDescription.setAttribute('content', `Listen to ${title} by ${artist} on OSTJourney.`);
		document.head.appendChild(metaDescription);
	}

	let metaImage = document.querySelector('meta[property="og:image"]');
	if (metaImage) {
		metaImage.setAttribute('content', coverUrl);
	} else {
		metaImage = document.createElement('meta');
		metaImage.setAttribute('property', 'og:image');
		metaImage.setAttribute('content', coverUrl);
		document.head.appendChild(metaImage);
	}

	let link = document.querySelector("link[rel='icon']");
	if (!link) {
		link = document.createElement('link');
		link.rel = 'icon';
		document.head.appendChild(link);
	}
	link.href = coverUrl;
	document.title = `OSTJourney | ${title} - ${artist}`;
}

let total_songs = 0;

window.onload = async function () {
	const urlParams = new URLSearchParams(window.location.search);

	try {
		const response = await fetch('/api/songs');
		const data = await response.json();
		total_songs = data.song_count;
	} catch (error) {
		console.error("Error fetching song count:", error);
	}

	if (urlParams.has('song')) {
		const songParam = parseInt(urlParams.get('song'), 10);
		if (!isNaN(songParam)) {
			song = songParam;
		}
	} else {
		try {
			const response = await fetch('/latest');
			const data = await response.json();
			if (data.latest_session_id) {
				song = data.latest_session_id;
			} else {
				song = Math.floor(Math.random() * total_songs);
			}
		} catch (error) {
			console.error('Error fetching the latest session:', error);
			song = Math.floor(Math.random() * total_songs);
		}
	}

	load_song(song);
};

function sendListeningData(songId, eventType) {
	if (eventType !== 'start' && eventType !== 'end') {
		console.error('Invalid event type:', eventType);
		return;
	}
	else if (eventType === 'end') {
		var url = '/api/music/end';
	}
	else if (eventType === 'start') {
		var url = '/api/music/start';
	}
	fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			song_id: songId,
		})
	})
	.then(response => {
		if (!response.ok) {
			console.error('Failed to send listening data');
		}
	})
	.catch(error => {
		console.error('Error while sending listening data:', error);
	});
}

function load_song(songNumber) {
	const url = '/api/songs/' + songNumber;

	fetch(url)
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return response.json();
		})
		.then(data => {
			const title = data.title;
			const artist = data.artist;
			const file = '/songs/' + data.path;
			const cover = '/static/images/covers/' + data.cover + '.jpg';
			const album = data.album;
			duration = data.duration;

			player_cover.src = cover;
			player_title.textContent = title;
			player_artist.textContent = artist;
			player_album.textContent = album;
			updateMetaTagsAndFavicon(title, artist, cover);

			if (audio) {
				audio.pause();
			}

			audio = new Audio(file);
			player_progress_bar.max = Math.floor(duration) * 100;

			audio.play();
			if (!audio.paused) {
				player_button_play.src = playIcon;
			}
			attachAudioEventListeners();
			audio.volume = volume.value / 100;
			sendListeningData(songNumber, 'start');
			load_song_info(data);
		})
		.catch(error => {
			console.error('Error while getting audio metadata', error);
		});
}

function change_song(songNumber) {
	if (audio) audio.pause();
	var old_song = song
	song = songNumber;
	if (song_info_status == old_song && song_info_frame.style.display == 'flex') {
		song_info_status = song;
		load_song_info(song);
	}
	load_song(song)
	player_title.classList.remove('scroll-left');
	player_artist.classList.remove('scroll-left');
	player_album.classList.remove('scroll-left');
	audio.play();
	
}

function attachAudioEventListeners() {
	if (audio) {
		audio.addEventListener("playing", function () {
			var interval = setInterval(function () {
				player_progress_bar.value = Math.round(audio.currentTime * 100);
				player_current_time.innerHTML = formatDuration(audio.currentTime) + "/" + formatDuration(duration);
			}, 10);
		});

		audio.addEventListener("ended", function () {
			sendListeningData(song, 'end');
			if (random == 1) {
				change_song(Math.floor(Math.random() * total_songs));
			} else if (repeat == 1) {
				change_song(song);
			} else {
				change_song(song + 1);
			}
		});
	}
}

function handle_pause() {
	if (!audio) return;

	if (audio.paused) {
		audio.play();
		player_button_play.src = playIcon;
	} else {
		audio.pause();
		player_button_play.src = pauseIcon;
	}
}

player_button_play.addEventListener('click', function () {
	handle_pause();
});

document.body.onkeyup = function (e) {
	if (e.key == " " || e.code == "Space" || e.keyCode == 32) {
		handle_pause();
	}
}


player_progress_bar.oninput = function () {
	audio.currentTime = player_progress_bar.value / 100;
	player_current_time.innerHTML = formatDuration(audio.currentTime) + "/" + formatDuration(duration);
};

volume_ico.addEventListener('click', function () {
	if (volume.value > 0) {
		old_volume = volume.value;
		audio.volume = 0;
		volume.value = 0;
	} else {
		volume.value = old_volume;
		audio.volume = old_volume / 100;
	}
	updateVolumeIcon();
});

volume.oninput = function () {
	audio.volume = volume.value / 100;
	updateVolumeIcon();
};

var random_button = document.getElementById('player-button-random');
var repeat_button = document.getElementById('player-button-repeat');
var random = 0;
var repeat = 0;

random_button.addEventListener('click', function () {
	if (random == 0) {
		random = 1;
	} else {
		random = 0;
	}
});

repeat_button.addEventListener('click', function () {
	if (repeat == 0) {
		repeat = 1;
	} else {
		repeat = 0;
	}
});

document.getElementById('player-button-next').addEventListener('click', function () {
	if (random == 1) {
		change_song(Math.floor(Math.random() * total_songs));
	} else if (repeat == 1) {
		change_song(song);
	} else {
		change_song(song + 1);
	}
	
});

document.getElementById('player-button-back').addEventListener('click', function () {
	if (random == 1) {
		change_song(Math.floor(Math.random() * total_songs));
	} else if (repeat == 1) {
		change_song(song);
	} else {
		change_song(song - 1);
	}
});



/*Display song info*/
var song_info_frame = document.getElementById('Song-info');
var player = document.getElementsByClassName('footer')[0];
var song_info_num = document.getElementById('Song-info-num');

var song_info_title = document.getElementById('Song-info-title');
var song_info_artist = document.getElementById('Song-info-artist');
var song_info_album = document.getElementById('Song-info-album');
var song_info_year = document.getElementById('Song-info-year');
var song_info_publisher = document.getElementById('Song-info-publisher');
var song_info_genre = document.getElementById('Song-info-genre');
var song_link = document.getElementById('song-link');
const song_link_copy = document.getElementById('song-link-copy');
var song_link_value = null;

var song_info_status = 0;

function copyTextToClipboard(text) {
	if (!navigator.clipboard) {
		fallbackCopyTextToClipboard(text);
		return;
	}

	navigator.clipboard.writeText(text)
		.then(() => {
			alert('Text copied to clipboard');
		})
		.catch(err => {
			console.error('Error copying text: ', err);
			alert('Failed to copy text. Trying alternative method.');
			fallbackCopyTextToClipboard(text);
		});
}

function fallbackCopyTextToClipboard(text) {
	const textArea = document.createElement("textarea");
	textArea.value = text;
	textArea.style.position = "fixed";
	textArea.style.opacity = 0;
	document.body.appendChild(textArea);
	textArea.select();
	try {
		document.execCommand('copy');
		alert('Text copied to clipboard (fallback method)');
	} catch (err) {
		console.error('Fallback: Unable to copy', err);
		alert('Clipboard copy failed.');
	}
	document.body.removeChild(textArea);
}

song_link_copy.addEventListener('click', function () {
	song_link_value = window.location.origin + "/?song=" + song;
	if (song_link_value) {
		copyTextToClipboard(song_link_value);
	}
});

document.getElementById('copy-info').addEventListener('click', function () {
	const songInfoText = `
Title: ${song_info_title.textContent.trim()}
Artist: ${song_info_artist.textContent.trim()}
Album: ${song_info_album.textContent.trim()}
Disk: ${song_info_num.textContent.split(" | ")[0].replace('Disk: ', '')} | No: ${song_info_num.textContent.split(" | ")[1].replace('No: ', '')}
Release date: ${document.getElementById('Song-info-year').textContent.replace('Release date: ', '')}
Publisher: ${document.getElementById('Song-info-publisher').textContent.replace('Publisher: ', '')}
Genre: ${song_info_genre.textContent.trim()}
`;

	copyTextToClipboard(songInfoText);
});

const songInfoElements = [
	song_info_title,
	song_info_artist,
	song_info_album,
	song_info_year,
	song_info_publisher,
	song_info_genre
];
	
songInfoElements.forEach(element => {
	element.addEventListener('click', function () {
		const textToCopy = element.textContent.trim().replace(/^.*?:\s*/, '');
		copyTextToClipboard(textToCopy);
	});
});	

document.getElementById('player-song-info').addEventListener('click', function (event) {
	event.stopPropagation();
	if (getComputedStyle(song_info_frame).display === 'none') {
		song_info_frame.style.display = 'flex';
		song_info_status = song;
	} else {
		song_info_frame.style.display = 'none';
	}
});

document.addEventListener('click', (event) => {
	if (
		getComputedStyle(song_info_frame).display === 'flex' &&
		!song_info_frame.contains(event.target) &&
		!player.contains(event.target)
	) {
		song_info_frame.style.display = 'none';
	}
});

function shouldScroll(element) {
	const width = element.offsetWidth;
	return width > (window.innerWidth * 30.5 / 100);
}

function load_song_info(data) {
	const title = data.title || "Unknown Title";
	const artist = data.artist || "Unknown Artist";
	const album = data.album || "Unknown Album";
	const cover = '/static/images/covers/' + (data.cover || "null") + '.jpg';

	let tposValue = "N/A", trckValue = "N/A", tdrcValue = "Unknown", tpubValue = "Unknown", tconValue = "Unknown";

	if (data.tags) {
		try {
			const tags = JSON.parse(data.tags);

			if (Array.isArray(tags.Other)) {
				const tpos = tags.Other.find(tag => tag[0] === "TPOS");
				tposValue = tpos ? tpos[1] : "N/A";

				const trck = tags.Other.find(tag => tag[0] === "TRCK");
				trckValue = trck ? trck[1] : "N/A";

				const tdrc = tags.Other.find(tag => tag[0] === "TDRC");
				tdrcValue = tdrc ? tdrc[1] : "Unknown";

				const tpub = tags.Other.find(tag => tag[0] === "TPUB");
				tpubValue = tpub ? tpub[1] : "Unknown";

				const tcon = tags.Other.find(tag => tag[0] === "TCON");
				tconValue = tcon ? tcon[1] : "Unknown";
			}
		} catch (error) {
			console.warn('Error parsing tags:', error);
		}
	}

	song_info_title.innerHTML = "<span>Title:&nbsp</span><div class='scroll-wrapper'><span id='Song-info-title-scroll'>" + title + "</span> </div>";
	song_info_artist.innerHTML = "<span>Artist:&nbsp</span><div class='scroll-wrapper'><span id='Song-info-artist-scroll'>" + artist + "</span> </div>";
	song_info_album.innerHTML = "<span>Album:&nbsp</span><div class='scroll-wrapper'><span id='Song-info-album-scroll'>" + album + "</span> </div>";
	song_info_genre.innerHTML = "<span>Genre:&nbsp</span><div class='scroll-wrapper'><span id='Song-info-genre-scroll'>" + tconValue + "</span> </div>";
	song_link.href = window.location.origin + "/?song=" + data.id;

	document.getElementById('Song-info-year').textContent = "Release date: " + tdrcValue;
	document.getElementById('Song-info-publisher').textContent = "Publisher: " + tpubValue;
	const tposInfo = `Disk: ${tposValue} | No: ${trckValue}`;
	song_info_num.textContent = tposInfo;

	const coverElement = document.getElementById('Song-info-cover');
	coverElement.src = cover;

	const ScrollElements = [
		{ element: 'Song-info-title', scrollElement: 'Song-info-title-scroll' },
		{ element: 'Song-info-artist', scrollElement: 'Song-info-artist-scroll' },
		{ element: 'Song-info-album', scrollElement: 'Song-info-album-scroll' },
		{ element: 'Song-info-genre', scrollElement: 'Song-info-genre-scroll' }
	];
	
	ScrollElements.forEach(info => {
		const mainElement = document.getElementById(info.element);
		const scrollElement = document.getElementById(info.scrollElement);
	
		mainElement.addEventListener('mouseenter', function () {
			if (shouldScroll(scrollElement)) {
				scrollElement.classList.add('scroll-left-info');
			}
		});
	
		mainElement.addEventListener('mouseleave', function () {
			scrollElement.classList.remove('scroll-left-info');
		});
	});
}
