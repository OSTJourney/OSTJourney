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
		repeatButton: document.getElementById('repeatSvg'),
		progressBar: document.getElementById('player-progress-bar'),
		currentTime: document.getElementById('player-time-current'),
		totalTime: document.getElementById('player-time-total'),
	}
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
		const arrowElements = element.querySelectorAll('use');
		element.addEventListener("click", function () {
			arrowElements.forEach((arrowElement) => {
				arrowElement.setAttribute('transform', 'scale(1.6)');
			});
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
let random = 0;
let repeat = 0;
let duration = 0;
let total_songs = 0;




/*Volume management and animation*/
const volumeSlider = document.getElementById("player-volume-bar");
const svg	= document.getElementById("volume-svg");
const thresholds = [0, 33, 66, 100];
const volumeGamma = 2.2;
let volumeDebounceTimeout;
let oldVolume = 0;

const fullArches = [
	"M23 11C25 12 25 16 23 17 23 18 24 19 25 19 28 17 28 11 25 9 24 9 23 10 23 11",
	"M27 7C31 9 31 19 27 21 27 22 28 23 29 23 34 20 34 8 29 5 28 5 27 6 27 7",
	"M31 3C37 6 37 22 31 25 31 26 32 27 33 27 40 23 40 5 33 1 32 0 30 2 31 3"
];

const crossArches = [
	"M32 5C20 5 20 23 32 23 33 23 33 21 32 21 23 21 23 7 32 7 33 7 33 5 32 5",
	"M36 7C26 19 36 7 26 19 28 21 26 19 28 21 38 9 28 21 38 9 36 7 38 9 36 7",
	"M32 7C41 7 41 21 32 21 31 21 31 23 32 23 44 23 44 5 32 5 31 5 31 7 32 7"
];

volumeSlider.dataset.prev = volumeSlider.value;

volumeSlider.addEventListener("input", () => {
	const prev = parseInt(volumeSlider.dataset.prev, 10);
	const curr = parseInt(volumeSlider.value, 10);
	if (audio)
		audio.volume = Math.pow(volumeSlider.value / 100, volumeGamma);
	clearTimeout(volumeDebounceTimeout);
	volumeDebounceTimeout = setTimeout(() => {
		if (crossed(prev, curr)) {
      		oldVolume = 0;
			player_volume(prev, curr);
			volumeSlider.dataset.prev = curr;}
	}, 50);
});
svg.addEventListener("click", () => {
	const prev = parseInt(volumeSlider.dataset.prev, 10);
	const curr = parseInt(volumeSlider.value, 10);
	if (curr === 0) {
		volumeSlider.value = oldVolume;
		player_volume(0, oldVolume);
	} else {
   	 oldVolume = curr;
		volumeSlider.dataset.prev = curr;
		volumeSlider.value = 0;
		player_volume(curr, 0);
	}
	if (audio)
		audio.volume = Math.pow(volumeSlider.value / 100, volumeGamma);
	volumeSlider.dataset.prev = +volumeSlider.value;
});

function crossed(prev, curr) {
	return thresholds.some((t, i) =>
		(prev <= t && curr > t) || (prev > t && curr <= t)
	);
}
function player_volume(oldV, newV) {
	const starts = getState(oldV);
	const ends	 = getState(newV);
	["volumePath1", "volumePath2", "volumePath3"].forEach((id, i) => {
		animatePath(document.getElementById(id), starts[i], ends[i]);
	});
}
function getState(v) {
	if (v == 0) return crossArches;
	if (v <= 33) return fullArches.map(() => fullArches[0]);
	if (v <= 66) return [fullArches[0], fullArches[1], fullArches[1]];
	return fullArches;
}
function animatePath(pathEl, fromD, toD) {
	pathEl.setAttribute("d", toD);
	const anim = pathEl.querySelector("animate");
	if (anim) {
		anim.setAttribute("values", `${fromD};${toD}`);
		anim.beginElement();
	}
}


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
		randomMotionPath.style.stroke = "rgb(var(--mauve))";
		randomArrow.style.fill = "rgb(var(--mauve))";
	} else {
		random = 0;
		randomMotionPath.style.stroke = "currentColor";
		randomArrow.style.fill = "currentColor";
	}
}



function toggleRepeat() {
	const repeatMotionPath = document.querySelector('#repeatMotionPath');
	const repeatMotionPath2 = document.querySelector('#repeatMotionPath2');
	const repeatArrow = document.getElementById('repeatSvg');
	if (repeat == 0) {
		repeat = 1;
		repeatMotionPath.style.stroke = "rgb(var(--mauve))";
		repeatMotionPath2.style.stroke = "rgb(var(--mauve))";
		repeatArrow.setAttribute("fill", "rgb(var(--mauve))");
	} else {
		repeat = 0;
		repeatMotionPath.style.stroke = "currentColor";
		repeatMotionPath2.style.stroke = "currentColor";
		repeatArrow.setAttribute("fill", "currentColor");
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

// stocker les références des callbacks globalement
let onPlayingCallback = null;
let onEndedCallback = null;

function attachAudioEventListeners() {
	if (!audio) {
		return;
	}

	if (onPlayingCallback) {
		audio.removeEventListener("playing", onPlayingCallback);}
	if (onEndedCallback) {
		audio.removeEventListener("ended", onEndedCallback);}

	onPlayingCallback = function () {
		var interval = setInterval(function () {
			player.controls.progressBar.value = audio.currentTime * 100;
			const value = ((player.controls.progressBar.value / player.controls.progressBar.max) * 100 + (((player.controls.progressBar.value / player.controls.progressBar.max) * 100 < 50) ? 0.5 : -0.5)) + '%'
			player.controls.progressBar.style.setProperty('--value', value);
			player.controls.currentTime.innerHTML = formatDuration(audio.currentTime);
		}, 10);
	};

	onEndedCallback = function () {
		sendListeningData(song, 'end');
		if (random == 1) {
			changeSong(Math.floor(Math.random() * total_songs));
		} else if (repeat == 1) {
			changeSong(song);
		} else {
			changeSong(song + 1);
		}
	};
	audio.addEventListener("playing", onPlayingCallback);
	audio.addEventListener("ended", onEndedCallback);
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

player.controls.progressBar.oninput = function () {
	if (!audio) return;
	audio.currentTime = player.controls.progressBar.value / 100;
	player.controls.currentTime.innerHTML = formatDuration(audio.currentTime);
	console.log("Time: " + audio.currentTime + " in element: " + player.controls.currentTime);
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
			player.controls.totalTime.innerHTML = formatDuration(duration);
			updateMetaTagsAndFavicon(title, artist, cover);
			loadSongInfo(data);

			if (audio) {
				audio.pause();
			}
			audio = new Audio(file);
			audio.volume = Math.pow(volumeSlider.value / 100, volumeGamma);
			player.controls.progressBar.max = Math.floor(duration) * 100;
			player.controls.progressBar.value = 0;
			attachAudioEventListeners();
			sendListeningData(songNumber, 'start');
			audio.addEventListener('loadedmetadata', function () {
				audio.play();
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
