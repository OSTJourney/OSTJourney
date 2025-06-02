//WebSocket for rcp
let socket = null;

function startRpcClient() {
	try {
		socket = new WebSocket('ws://localhost:4224');
	}
	catch (error) {
		console.error('WebSocket connection failed');
	}
	socket.onopen = function () {
		console.log('WebSocket connection established');
		fetch('/api/songs/' + song)
			.then(response => response.json())
			.then(data => {
				if (data && settings.enable_rpc && socket) {
					const message = {
						title: data.title,
						artist: data.artist,
						album: data.album,
						cover: `/static/images/covers/${data.cover || 'null'}.jpg`,
						duration: data.duration,
						song_id: song,
						paused: audio ? audio.paused : true,
						currentTime: audio ? audio.currentTime : 0
					};
					try {
						socket.send(JSON.stringify(message));
					} catch (error) {
						console.error('Websocket: Error sending message', error);
					}
				}
			})
			.catch(error => console.error('Error fetching song metadata for websocket:', error));
	};

	socket.onerror = function (error) {
		console.log('WebSocket error');
	};

	socket.onclose = function () {
		socket = null;
		console.log('WebSocket connection closed. Retrying in 10 seconds...');
		setTimeout(startRpcClient, 10000);
	};
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
		playlist: document.getElementById('playlist-btn')
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
let song = 1;
let playlist = [];
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
	nextPlaylistSong(song);
	loadSong(song);
	player.metadata.title.classList.remove('scroll-left');
	player.metadata.artist.classList.remove('scroll-left');
	player.metadata.album.classList.remove('scroll-left');
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
	if (!audio) {
		changeSong(song);
		animatePlayButton("play");
		if (settings.enable_rpc && socket) {
			const message = { paused: false };
			try {
				socket.send(JSON.stringify(message));}
			catch (error) {console.log('Websocket: Error sending message');}
		}
		return;
	}

	if (audio.paused) {
		audio.play();
		animatePlayButton("play");
		if (settings.enable_rpc && socket) {
			const message = { paused: false, currentTime: audio.currentTime };
			try {
				socket.send(JSON.stringify(message));}
			catch (error) {console.log('Websocket: Error sending message');}
		}
	} else {
		audio.pause();
		animatePlayButton("pause");
		if (settings.enable_rpc && socket) {
			const message = { paused: true };
			try {
				socket.send(JSON.stringify(message));}
			catch (error) {console.log('Websocket: Error sending message');}
		}
	}
}


function getPlaybackList() {
	return playlist.length > 0
		? playlist
		: Array.from({ length: total_songs }, (_, i) => i + 1);
}

function getRelativeSongId(direction) {
	const list = getPlaybackList();
	const currentIndex = list.indexOf(song);
	const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  
	if (random) {
		return list[Math.floor(Math.random() * list.length)];
	}
	if (repeat) {
		return list[safeIndex];
	}

	const nextIndex = (safeIndex + direction + list.length) % list.length;
	return list[nextIndex];
}

function nextPlaylistSong(song_id) {
	if (playlist.length === 0)
		return;
	updatePlaylistMetadata(song_id);
	const currentSongRow = document.getElementById(`playlist-row-${song_id}`);
	if (!currentSongRow)
		return;
	playlistContainer.querySelectorAll('.playlist-row.active').forEach(activeRow => {
		activeRow.classList.remove('active');
		const paths = activeRow.querySelectorAll('path');
		paths[0].setAttribute('d', 'M0 42C0 42 0 46 4 46 6 46 8.01 45.16 10 44S10 44 19 38.857v-30.429c-9-6.428 0 0-9-6.428C7.748.58 6 0 4 0s-4 1-4 4v38');
		paths[1].setAttribute('d', 'M17 40 17 7C17 7 17 7 17 7L17 7C17 7 17 7 17 7L38 22C40 24 40 26 38 28L17 40C17 40 17 40 17 40L17 40C17 40 17 40 17 40');
	});
	currentSongRow.classList.add('active');
	const paths = currentSongRow.querySelectorAll('path');
	paths[0].setAttribute('d', 'M0 42S0 46 4 46C6 46 8 46 10 46S14 45 14 42v-38c0-4-4-4-4-4C8 0 6 0 4 0s-4 1-4 4v38');
	paths[1].setAttribute('d', 'M26 42 26 4C26 1 28 0 30 0L36 0C38 0 40 1 40 4L40 22C40 24 40 26 40 28L40 42C40 44 38 46 36 46L30 46C28 46 26 44 26 42');
	
	const container_rect = playlistContainer.getBoundingClientRect();
	const song_rect = currentSongRow.getBoundingClientRect();

	const scroll_top = playlistContainer.scrollTop;
	const offset_top = song_rect.top - container_rect.top + scroll_top;

	const center_position = offset_top - (container_rect.height / 2) + (song_rect.height / 2);
	document.getElementById('player-playlist-current').textContent = `${playlist.indexOf(song_id) + 1}`;
	playlistContainer.scrollTo({
		top: center_position,
		behavior: 'smooth'
	});
}


function next_song() {
	const nextId = getRelativeSongId(+1);
	changeSong(nextId);
}

function previous_song() {
	const prevId = getRelativeSongId(-1);
	changeSong(prevId);
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
		const nextId = getRelativeSongId(+1);
		changeSong(nextId);
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
	if (settings.enable_rpc && socket && !audio.paused) {
		const message = { currentTime: audio.currentTime };
		try {
			socket.send(JSON.stringify(message));}
		catch (error) {console.log('Websocket: Error sending message');}
	}
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

/*Playlist management*/
playlistContainer = document.getElementById('current-playlist-container');
player.controls.playlist.addEventListener('click', function (event) {
	playlistContainer.classList.toggle('show');
});

function loadPlaylist(table) {
	playlistContainer.innerHTML = '';
	document.getElementById('player-playlist-total').textContent = table.length;
	if (table.length === 0) {
		playlistContainer.innerHTML = '<p>No songs in the playlist.</p>';
		return;
	}
	playlist = table;

	const playlistTable = document.createElement('table');
	playlistTable.id = 'playlist-table';

	const colgroup = document.createElement('colgroup');
	colgroup.innerHTML = `
		<col style="width: 1.5vw; min-width: 1.5rem;">
		<col style="width: 2.5vw; min-width: 3rem;">
		<col style="width: 13vw; min-width: 13rem;">
		<col style="width: 5vw; min-width: 5rem;">
		<col style="width: 0.1rem; min-width: 0.1rem;">
	`;
	playlistTable.appendChild(colgroup);
	const tbody = document.createElement('tbody');
	playlistTable.appendChild(tbody);
	playlistContainer.appendChild(playlistTable);

	const idsToLoad = table.slice(0, 10);
	const params = new URLSearchParams();
	idsToLoad.forEach(id => params.append('ids', id));

	table.forEach((id, index) => {
		const row = document.createElement('tr');
		row.classList.add('playlist-row');
		row.dataset.songId = id;
		row.id = `playlist-row-${id}`;

		row.innerHTML = `
			<td class="playlist-play-button">
				<svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="play-button-icon">
					<path d="M0 42C0 42 0 46 4 46 6 46 8.01 45.16 10 44S10 44 19 38.857v-30.429c-9-6.428 0 0-9-6.428C7.748.58 6 0 4 0s-4 1-4 4v38"/>
					<path d="M17 40 17 7C17 7 17 7 17 7L17 7C17 7 17 7 17 7L38 22C40 24 40 26 38 28L17 40C17 40 17 40 17 40L17 40C17 40 17 40 17 40"/>
				</svg>
			</td>
			<td class="playlist-cover"><div class="loader"></div></td>
			<td class="playlist-info">
				<div class="playlist-title">Loading...</div>
				<div class="playlist-artist"></div>
			</td>
			<td class="playlist-duration">--:--</td>
			<td class="playlist-remove">
				<button class="remove-button" data-index="${index}">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M7 7L17 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
						<path d="M17 7L7 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
					</svg>
				</button>
			</td>
		`;

		row.addEventListener('mouseenter', () => {
			row.querySelector('.playlist-remove').style.visibility = 'visible';
		});
		row.addEventListener('mouseleave', () => {
			row.querySelector('.playlist-remove').style.visibility = 'hidden';
		});
		row.querySelector('.remove-button').addEventListener('click', () => {
			playlist.splice(index, 1);
			row.classList.add('hide');
			addEventListener('transitionend', function () {
				row.remove();
			});
			document.getElementById('player-playlist-total').textContent = playlist.length;
			if (playlist.length === 0) {
				playlistContainer.innerHTML = '<p>No songs in the playlist.</p>';
			}
		});
		row.querySelector('.playlist-play-button').addEventListener('click', () => {
			playlistTable.querySelectorAll('.playlist-row.active').forEach(activeRow => {
				paths = activeRow.querySelectorAll('path');
				paths[0].setAttribute('d', 'M0 42C0 42 0 46 4 46 6 46 8.01 45.16 10 44S10 44 19 38.857v-30.429c-9-6.428 0 0-9-6.428C7.748.58 6 0 4 0s-4 1-4 4v38');
				paths[1].setAttribute('d', 'M17 40 17 7C17 7 17 7 17 7L17 7C17 7 17 7 17 7L38 22C40 24 40 26 38 28L17 40C17 40 17 40 17 40L17 40C17 40 17 40 17 40');
				activeRow.classList.remove('active');
			});
			row.classList.add('active');
			paths = row.querySelectorAll('path');
			paths[0].setAttribute('d', 'M0 42S0 46 4 46C6 46 8 46 10 46S14 45 14 42v-38c0-4-4-4-4-4C8 0 6 0 4 0s-4 1-4 4v38');
			paths[1].setAttribute('d', 'M26 42 26 4C26 1 28 0 30 0L36 0C38 0 40 1 40 4L40 22C40 24 40 26 40 28L40 42C40 44 38 46 36 46L30 46C28 46 26 44 26 42');
			changeSong(id);
		});

		tbody.appendChild(row);
	});

	fetch(`/api/songs?${params.toString()}`)
		.then(response => response.json())
		.then(data => {
			data.forEach(song => {
				const row = document.getElementById(`playlist-row-${song.id}`);
				if (!row) return;
				const cover = row.querySelector('.playlist-cover');
				const coverImg = document.createElement('img');
				coverImg.src = `/static/images/covers/${song.cover || 'null'}.jpg`;
				coverImg.alt = song.title;
				coverImg.classList.add('playlist-cover-image');
				cover.appendChild(coverImg);
				const title = row.querySelector('.playlist-title');
				const artist = row.querySelector('.playlist-artist');
				const duration = row.querySelector('.playlist-duration');
				title.textContent = song.title;
				artist.textContent = song.artist;
				duration.textContent = formatDuration(song.duration);
				const loader = cover.querySelector('.loader');
				if (loader) {
					loader.remove();
				}
			});
		})
		.catch(error => {
			console.error('Error loading playlist songs:', error);
			playlistContainer.innerHTML = '<p>Error loading playlist songs.</p>';
		});


	if (playlist.length > 0) {
		changeSong(playlist[0]);
		document.getElementById(`playlist-row-${playlist[0]}`).classList.add('active');
		const paths = document.getElementById(`playlist-row-${playlist[0]}`).querySelectorAll('path');
		paths[0].setAttribute('d', 'M0 42S0 46 4 46C6 46 8 46 10 46S14 45 14 42v-38c0-4-4-4-4-4C8 0 6 0 4 0s-4 1-4 4v38');
		paths[1].setAttribute('d', 'M26 42 26 4C26 1 28 0 30 0L36 0C38 0 40 1 40 4L40 22C40 24 40 26 40 28L40 42C40 44 38 46 36 46L30 46C28 46 26 44 26 42');
	}
}

document.getElementById('player-clear-playlist').addEventListener('click', function () {
	playlist = [];
	playlistContainer.innerHTML = '<p>No songs in the playlist.</p>';
	document.getElementById('player-playlist-total').textContent = '--';
	document.getElementById('player-playlist-current').textContent = '--';
});

let isUserDragging = false;
let isUserScrolling = false;
let scrollPlaylistTimeout;

playlistContainer.addEventListener('mousedown', () => {
	isUserDragging = true;
	isUserScrolling = false;
});

document.addEventListener('mouseup', () => {
	if (isUserDragging) {
		isUserDragging = false;
		isUserScrolling = true;
		handleScrollEnd();
	}
});

playlistContainer.addEventListener('mouseleave', () => {
	if (isUserDragging) {
		isUserDragging = false;
		isUserScrolling = true;
		handleScrollEnd();
	}
});

playlistContainer.addEventListener('wheel', () => {
	isUserScrolling = true;
});

playlistContainer.addEventListener('touchstart', () => {
	isUserScrolling = true;
});

playlistContainer.addEventListener('scroll', () => {
	if (!isUserScrolling) return;

	clearTimeout(scrollPlaylistTimeout);
	scrollPlaylistTimeout = setTimeout(() => {
		isUserScrolling = false;
		handleScrollEnd();
	}, 100);
});

function handleScrollEnd() {
	const rows = playlistContainer.querySelectorAll('.playlist-row');
	if (!rows.length) return;

	const scrollTop = playlistContainer.scrollTop;
	const containerHeight = playlistContainer.clientHeight;
	const containerCenter = scrollTop + containerHeight / 2;

	let closestRow = null;
	let minDiff = Infinity;
	rows.forEach(row => {
		const rowTop = row.offsetTop;
		const rowCenter = rowTop + row.offsetHeight / 2;
		const diff = Math.abs(rowCenter - containerCenter);
		if (diff < minDiff) {
			minDiff = diff;
			closestRow = row;
		}
	});

	if (closestRow) {
		const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
		const newScrollTop = closestRow.offsetTop + closestRow.offsetHeight / 2 - containerHeight / 2 + rem * 2;

		isUserScrolling = false;
		playlistContainer.scrollTo({ top: newScrollTop, behavior: 'smooth' });

		const songId = closestRow.dataset.songId;
		if (songId) {
			console.log('Centered on song ID:', songId);
			updatePlaylistMetadata(songId);
		}
	}
}

function updatePlaylistMetadata(song_id) {
	const row = document.getElementById(`playlist-row-${song_id}`);
	if (!row) return;

	const allRows = Array.from(document.querySelectorAll('.playlist-row'));
	const row_index = allRows.indexOf(row);
	if (row_index === -1) return;

	const indexesToLoad = [];
	let i = 0;
	while (i < allRows.length) {
		i++;
	}
	const start = Math.max(0, row_index - 3);
	const end = Math.min(allRows.length - 1, row_index + 3);

	for (let i = start; i <= end; i++) {
		indexesToLoad.push(i);
	}

	const idsToLoad = indexesToLoad.map(i => allRows[i].dataset.songId);

	const idsNotLoaded = idsToLoad.filter(id => {
		const r = document.getElementById(`playlist-row-${id}`);
		if (!r) return false;
		return r.querySelector('.loader') !== null;
	});

	if (idsNotLoaded.length === 0) return;
	const params = new URLSearchParams();
	idsNotLoaded.forEach(id => params.append('ids', id));

	fetch(`/api/songs?${params.toString()}`)
		.then(response => response.json())
		.then(data => {
			data.forEach(song => {
				const r = document.getElementById(`playlist-row-${song.id}`);
				if (!r) return;
				const cover = r.querySelector('.playlist-cover');
				cover.innerHTML = '';

				const cover_img = document.createElement('img');
				cover_img.src = `/static/images/covers/${song.cover || 'null'}.jpg`;
				cover_img.alt = song.title;
				cover_img.classList.add('playlist-cover-image');
				cover.appendChild(cover_img);

				const title = r.querySelector('.playlist-title');
				const artist = r.querySelector('.playlist-artist');
				const duration = r.querySelector('.playlist-duration');

				title.textContent = song.title;
				artist.textContent = song.artist;
				duration.textContent = formatDuration(song.duration);
			});
		})
		.catch(error => {
			console.error('Error updating playlist metadata:', error);
		});
}

function encodePath(path) {
	const segments = path.split('/');
	for (let i = 0; i < segments.length; i++) {
		segments[i] = encodeURIComponent(segments[i]);
	}
	return segments.join('/');
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
			const file = '/songs/' + encodePath(data.path);
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
				console.log("Playing song num " + songNumber + ": " + title);
				update_mediaSessionAPI(title, artist, album, cover);
				animatePlayButton(audio.paused ? "pause" : "play");
				if (settings.enable_rpc && socket) {
					try {
						socket.send(JSON.stringify({ title, artist, cover: cover, duration, album, link: `${window.location.origin}/?song=${songNumber}`, paused: false }));
					}
					catch (error) {console.log('Websocket: Error sending message');}
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
		player.controls.playButton.addEventListener('click', function () {
			if (audio) {return;}
			loadSong(song);
		}, { once: true });
	}
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
	fetch('/api/ping', {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json'
	  },
	  body: JSON.stringify({ token: userId, status: 'active' })
	})
}

setInterval(sendPing, 15000);
