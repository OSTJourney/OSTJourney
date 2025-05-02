//WebSocket for rcp
let socket = null;
function startRpcClient() {
	socket = new WebSocket('ws://localhost:4224');
	
	socket.onopen = function () {
		console.log('WebSocket connection established');
	};

	socket.onerror = function (error) {
		console.log("WebSocket error:", error);
	};

	return socket;
}

startRpcClient();

// Definition of player
const player = {
	metadata: {
		title: document.getElementById('player-song-title'),
		artist: document.getElementById('player-song-artist'),
		album: document.getElementById('player-song-album'),
		cover: document.getElementById('player-cover'),
		infoText: document.getElementById('player-song-info-text'),
	},
	controls: {
		playButton: document.getElementById('playButtonSvg'),
		nextButton: document.getElementById('player-button-next'),
		prevButton: document.getElementById('player-button-back'),
		randomButton: document.getElementById('player-button-random'),
		repeatButton: document.getElementById('player-button-repeat'),
		volumeBar: document.getElementById('player-volume-bar'),
		volumeIcon: document.getElementById('volume-ico'),
		progressBar: document.getElementById('player-progress-bar'),
		currentTime: document.getElementById('player-current-time'),
	},
	img: {
		play: "/static/images/player/play.webp",
		pause: "/static/images/player/pause.webp",
		volume0: "/static/images/player/volume_mute.webp",
		volume33: "/static/images/player/volume_33.webp",
		volume66: "/static/images/player/volume_66.webp",
		volume100: "/static/images/player/volume_100.webp",
	},
};



/*Animation for play button*/
let currentMode = 'pause';
function animatePlayButton(mode) {
	var shape1 = document.getElementById('playAnimPath');
	var shape2 = document.getElementById('playAnimPath2');
	if (!shape1 || !shape2) return;

	if (mode === "play" && currentMode !== "play") {
		shape1.setAttribute('from', 'M0 42C0 42 0 46 4 46 6 46 8.01 45.16 10 44S10 44 19 38.857v-30.429c-9-6.428 0 0-9-6.428C7.748.58 6 0 4 0s-4 1-4 4v38');
		shape1.setAttribute('to', 'M0 42C0 42 0 46 4 46 6 46 8 46 10 46S14 45 14 42v-38c0-4-4-4-4-4C8 0 6 0 4 0s-4 1-4 4v38');

		shape2.setAttribute('from', 'M17 40 17 7C17 7 17 7 17 7L17 7C17 7 17 7 17 7L38 22C40 24 40 26 38 28L17 40C17 40 17 40 17 40L17 40C17 40 17 40 17 40');
		shape2.setAttribute('to', 'M26 42 26 4C26 1 28 0 30 0L36 0C38 0 40 1 40 4L40 22C40 24 40 26 40 28L40 42C40 44 38 46 36 46L30 46C28 46 26 44 26 42');
		currentMode = "play";
	} else if (mode === "pause" && currentMode !== "pause") {
		shape1.setAttribute('from', 'M0 42C0 42 0 46 4 46 6 46 8 46 10 46S14 45 14 42v-38c0-4-4-4-4-4C8 0 6 0 4 0s-4 1-4 4v38');
		shape1.setAttribute('to', 'M0 42C0 42 0 46 4 46 6 46 8.01 45.16 10 44S10 44 19 38.857v-30.429c-9-6.428 0 0-9-6.428C7.748.58 6 0 4 0s-4 1-4 4v38');

		shape2.setAttribute('from', 'M26 42 26 4C26 1 28 0 30 0L36 0C38 0 40 1 40 4L40 22C40 24 40 26 40 28L40 42C40 44 38 46 36 46L30 46C28 46 26 44 26 42');
		shape2.setAttribute('to', 'M17 40 17 7C17 7 17 7 17 7L17 7C17 7 17 7 17 7L38 22C40 24 40 26 38 28L17 40C17 40 17 40 17 40L17 40C17 40 17 40 17 40');
		currentMode = "pause";
	} else {
		return;
	}

	shape1.beginElement();
	shape2.beginElement();
}

/*Animation for svg buttons*/
document.addEventListener("DOMContentLoaded", function () {
	const elementsWithAnimations = document.querySelectorAll(".svg-anim");

	elementsWithAnimations.forEach((element) => {
		const all_animations = element.querySelectorAll("animate, animateMotion");
		const arrowElement = element.querySelector('use');

		element.addEventListener("click", function () {
			if (element.id === "randomSvg" && arrowElement) {
				const transform = arrowElement.getAttribute('transform');
				if (transform && transform.includes('translate(15')) {
					arrowElement.setAttribute('transform', 'translate(0,0) scale(1.6)');
				}
			}
			all_animations.forEach((animation) => {
				if (typeof animation.beginElement === "function") {
					animation.beginElement();
				}
			});
		});
	});
});


let audio = null;
let song = 0;
let volume = document.getElementById("player-volume-bar");
let old_volume = 0;
let random = 0;
let repeat = 0;
let duration = 0;
let total_songs = 0;
const volume_gamma = 2.2;

/*Player scroll style*/
function removeOldStyle() {
	const oldStyle = document.querySelector('#dynamic-animation-style');
	if (oldStyle) {
		oldStyle.remove();
	}
}

function updateAnimation() {
	const infoTextWidth = player.metadata.infoText.offsetWidth;
	removeOldStyle();

	const animationKeyframes = `
		@keyframes scroll-left {
			0% {
				transform: translateX(0%);
			}
			42% {
				transform: translateX(calc(-100% + ${infoTextWidth}px));
			}
			50% {
				transform: translateX(calc(-100% + ${infoTextWidth}px));
			}
			92% {
				transform: translateX(0%);
			}
		}
	`;
	const styleSheet = document.createElement('style');
	styleSheet.id = 'dynamic-animation-style';
	styleSheet.textContent = animationKeyframes;
	document.head.appendChild(styleSheet);
}

player.metadata.infoText.addEventListener('mouseenter', function() {
	updateAnimation();
	if (player.metadata.title.offsetWidth > player.metadata.infoText.offsetWidth)
		player.metadata.title.classList.add('scroll-left');
	if (player.metadata.artist.offsetWidth > player.metadata.infoText.offsetWidth)
		player.metadata.artist.classList.add('scroll-left');
	if (player.metadata.album.offsetWidth > player.metadata.infoText.offsetWidth)
		player.metadata.album.classList.add('scroll-left');
});

player.metadata.infoText.addEventListener('mouseleave', function() {
	player.metadata.title.classList.remove('scroll-left');
	player.metadata.artist.classList.remove('scroll-left');
	player.metadata.album.classList.remove('scroll-left');
});

/*Player action functions*/
function changeSong(songNumber) {
	if (audio) audio.pause();
	song = songNumber;
	loadSong(song);
	player.metadata.title.classList.remove('scroll-left');
	player.metadata.artist.classList.remove('scroll-left');
	player.metadata.album.classList.remove('scroll-left');
	audio.play();
}

function toggleRandom() {
	const randomMotionPath = document.querySelector('#randomMotionPath');
	const randomArrow = document.querySelector('#randomArrow');
	if (random === 0) {
		random = 1;
		randomMotionPath.style.stroke = "rgb(var(--lavender))";
		randomArrow.style.fill = "rgb(var(--lavender))";
	} else {
		random = 0;
		randomMotionPath.style.stroke = "currentColor";
		randomArrow.style.fill = "currentColor";
	}
}



function toggleRepeat() {
	if (repeat == 0) {
		repeat = 1;
		player.controls.repeatButton.classList.add("active");
	} else {
		repeat = 0;
		player.controls.repeatButton.classList.remove("active");
	}
}

function handlePause() {
	if (!audio) return;

	if (audio.paused) {
		audio.play();
		animatePlayButton("play");
		if (settings.enable_rpc) {
			const message = { paused: false };
			socket.send(JSON.stringify(message));
		}
	} else {
		audio.pause();
		animatePlayButton("pause");
		if (settings.enable_rpc) {
			const message = { paused: true };
			socket.send(JSON.stringify(message));
		}
	}
}

function next_song() {
	if (random == 1) {
		changeSong(Math.floor(Math.random() * total_songs));
	} else if (repeat == 1) {
		changeSong(song);
	} else {
		changeSong(song + 1);
		if (song > total_songs) {
			song = 1
		}
	}
}

function previous_song() {
	if (random == 1) {
		changeSong(Math.floor(Math.random() * total_songs));
	} else if (repeat == 1) {
		changeSong(song);
	} else {
		changeSong(song - 1);
		if (song == 0) {
			song = total_songs;
		}
	}
}

function updateVolumeIcon() {
	if (player.controls.volumeBar.value == 0) {
		player.controls.volumeIcon.src = player.img.volume0;
	} else if (player.controls.volumeBar.value < 33) {
		player.controls.volumeIcon.src = player.img.volume33;
	} else if (player.controls.volumeBar.value < 66) {
		player.controls.volumeIcon.src = player.img.volume66;
	} else {
		player.controls.volumeIcon.src = player.img.volume100;
	}
}

/*Update metadata*/
const page = {
	title: document.title,
	favicon: document.querySelector("link[rel='icon']"),
	canonical: document.querySelector("link[rel='canonical']"),
	meta: {
		title: document.querySelector('meta[property="og:title"]'),
		description: document.querySelector('meta[property="og:description"]'),
		image: document.querySelector('meta[property="og:image"]'),
		url: document.querySelector('meta[property="og:url"]'),
		type: document.querySelector('meta[property="og:type"]')
	}
};

function updateMetaTagsAndFavicon(title, artist, coverUrl) {
	page.title = `OSTJourney | ${title} - ${artist}`;
	document.title = page.title;
	const updateMeta = (property, value) => {
		if (page.meta[property]) {
			page.meta[property].setAttribute('content', value);
		} else {
			page.meta[property] = document.createElement('meta');
			page.meta[property].setAttribute('property', `og:${property}`);
			page.meta[property].setAttribute('content', value);
			document.head.appendChild(page.meta[property]);
		}
	};

	updateMeta('title', `${title} - ${artist}`);
	updateMeta('description', `Listen to ${title} by ${artist} on OSTJourney.`);
	updateMeta('image', coverUrl);
	if (page.meta.url) {
		page.meta.url.setAttribute('content', window.location.href);
	} else {
		page.meta.url = document.createElement('meta');
		page.meta.url.setAttribute('property', 'og:url');
		page.meta.url.setAttribute('content', window.location.href);
		document.head.appendChild(page.meta.url);
	}
	if (!page.favicon) {
		page.favicon = document.createElement('link');
		page.favicon.rel = 'icon';
		document.head.appendChild(page.favicon);
	}
	page.favicon.href = coverUrl;
	if (page.canonical) {
		page.canonical.setAttribute('href', window.location.href);
	} else {
		page.canonical = document.createElement('link');
		page.canonical.rel = 'canonical';
		page.canonical.href = window.location.href;
		document.head.appendChild(page.canonical);
	}
}

function update_mediaSessionAPI(title, artist, album, cover) {
	if (!('mediaSession' in navigator)) {
		console.warn("MediaSession API is not supported in this browser.");
		return;
	}

	navigator.mediaSession.metadata = new MediaMetadata({
		title: title,
		artist: artist,
		album: album,
		artwork: [
			{ src: cover, sizes: '512x512', type: 'image/jpeg' },
		]
	});

	const actions = {
		play: handlePause,
		pause: handlePause,
		nexttrack: next_song,
		previoustrack: previous_song,
		seekbackward: toggleRandom,
		seekforward: toggleRepeat
	};

	Object.keys(actions).forEach(action => {
		navigator.mediaSession.setActionHandler(action, actions[action]);
	});

	if ('setPositionState' in navigator.mediaSession && audio?.duration) {
		navigator.mediaSession.setPositionState({
			duration: audio.duration,
			playbackRate: audio.playbackRate,
			position: audio.currentTime,
		});
	}
}

function attachAudioEventListeners() {
	if (audio) {
		audio.addEventListener("playing", function () {
			var interval = setInterval(function () {
				player.controls.progressBar.value = audio.currentTime * 100;
				player.controls.currentTime.innerHTML = formatDuration(audio.currentTime) + "/" + formatDuration(duration);
			}, 10);
		});

		audio.addEventListener("ended", function () {
			sendListeningData(song, 'end');
			if (random == 1) {
				changeSong(Math.floor(Math.random() * total_songs));
			} else if (repeat == 1) {
				changeSong(song);
			} else {
				changeSong(song + 1);
			}
		});
	}
}

/*Page controls*/
document.addEventListener("keydown", function (e) {
	if (e.key === " " || e.code === "Space" || e.keyCode === 32) {
		const activeElement = document.activeElement;
		if (activeElement.tagName !== "INPUT" && activeElement.tagName !== "TEXTAREA" && !activeElement.isContentEditable) {
			e.preventDefault();
			handlePause();
		}
	}
});


player.controls.volumeIcon.addEventListener('click', function () {
	if (volume.value > 0) {
		old_volume = volume.value;
		audio.volume = 0;
		volume.value = 0;
	} else {
		volume.value = old_volume;
		audio.volume = Math.pow(old_volume / 100, volume_gamma);
	}
	updateVolumeIcon();
});

player.controls.progressBar.oninput = function () {
	audio.currentTime = player.controls.progressBar.value / 100;
	player.controls.currentTime.innerHTML = formatDuration(audio.currentTime) + "/" + formatDuration(duration);
};

volume.oninput = function () {
	let linearVolume = volume.value / 100;
	audio.volume = Math.pow(linearVolume, volume_gamma);
	updateVolumeIcon();
};

player.controls.randomButton.addEventListener('click', function () {
	toggleRandom();
});

player.controls.repeatButton.addEventListener('click', function () {
	toggleRepeat();
});

player.controls.nextButton.addEventListener('click', function () {
	next_song();
});

player.controls.prevButton.addEventListener('click', function () {
	previous_song();
});

player.controls.playButton.addEventListener('click', function () {
	handlePause();
});

/*Inform server for listening stats*/
function sendListeningData(songId, eventType) {
	if (!settings.connected) {
		return;
	}
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

/*Load new song (prioritize the changeSong function)*/
function loadSong(songNumber) {
	fetch('/api/songs/' + songNumber)
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return response.json();
		})
		.then(data => {
			const title = data.title;
			const artist = data.artist;
			const file = '/songs/' + encodeURI(data.path);
			const cover = '/static/images/covers/' + data.cover + '.jpg';
			const album = data.album;
			duration = data.duration;

			player.metadata.title.textContent = title;
			player.metadata.artist.textContent = artist;
			player.metadata.album.textContent = album;
			player.metadata.cover.src = cover;
			player.metadata.cover.alt = `${title} - ${artist}`;
			player.controls.currentTime.innerHTML = "0:00/" + formatDuration(duration);
			updateMetaTagsAndFavicon(title, artist, cover);
			loadSongInfo(data);

			if (audio) {
				audio.pause();
			}
			audio = new Audio(file);
			audio.volume = Math.pow(volume.value / 100, volume_gamma);
			player.controls.progressBar.max = Math.floor(duration) * 100;
			player.controls.progressBar.value = 0;
			audio.play();
			attachAudioEventListeners();
			sendListeningData(songNumber, 'start');
			audio.addEventListener('loadedmetadata', function () {
				update_mediaSessionAPI(title, artist, album, cover);
				animatePlayButton(audio.paused ? "pause" : "play");
				if (settings.enable_rpc) {
					socket.send(JSON.stringify({ title, artist, image: cover, duration, link: `${window.location.origin}/?song=${songNumber}`, paused: false }));
				}
			});
		})
		.catch(error => {
			console.error('Error while getting audio metadata', error);
		});
}

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
			const response = await fetch('/api/latest');
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
	player.controls.playButton.addEventListener('click', function () {
		loadSong(song);
	}, { once: true });
};

function generateUniqueId() {
	return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getUserId() {
	let userId = localStorage.getItem('userId');

	if (!userId) {
	  userId = generateUniqueId();
	  localStorage.setItem('userId', userId);
	}
  
	return userId;
}

const userId = getUserId();

function sendPing() {
	if (!audio) return;
	if (audio.paused) return;
	if (audio.ended) return;
	if (!audio.playing) return;
	fetch('/api/ping', {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json'
	  },
	  body: JSON.stringify({ token: userId, status: 'active' })
	})
}

setInterval(sendPing, 15000);
