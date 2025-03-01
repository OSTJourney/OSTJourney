const songInfo = {
	frame: document.getElementById('Song-info'),
	title: document.getElementById('Song-info-title'),
	artist: document.getElementById('Song-info-artist'),
	album: document.getElementById('Song-info-album'),
	num: document.getElementById('Song-info-num'),
	year: document.getElementById('Song-info-year'),
	publisher: document.getElementById('Song-info-publisher'),
	genre: document.getElementById('Song-info-genre'),
	cover: document.getElementById('Song-info-cover'),
	link: document.getElementById('song-link'),
	copy: {
		info: document.getElementById('copy-info'),
		link: document.getElementById('song-link-copy'),
	}
};

const playerBox = document.querySelector('.footer');

songInfo.copy.link.addEventListener('click', () => {
	copyTextToClipboard(songInfo.link.href);
});

songInfo.copy.info.addEventListener('click', () => {
	const [disk, track] = songInfo.num.textContent.split(" | ").map(s => s.split(": ")[1] || "N/A");
	copyTextToClipboard(`
Title: ${songInfo.title.textContent.trim()}
Artist: ${songInfo.artist.textContent.trim()}
Album: ${songInfo.album.textContent.trim()}
Disk: ${disk} | No: ${track}
Release date: ${songInfo.year.textContent.replace('Release date: ', '')}
Publisher: ${songInfo.publisher.textContent.replace('Publisher: ', '')}
Genre: ${songInfo.genre.textContent.trim()}
	`);
});

['title', 'artist', 'album', 'year', 'publisher', 'genre'].forEach(key => {
	songInfo[key].addEventListener('click', () => {
		copyTextToClipboard(songInfo[key].textContent.trim().replace(/^.*?:\s*/, ''));
	});
});

player.metadata.infoText.addEventListener('click', (event) => {
	event.stopPropagation();
	songInfo.frame.style.display = songInfo.frame.style.display === 'flex' ? 'none' : 'flex';
});

document.addEventListener('click', (event) => {
	if (songInfo.frame.style.display === 'flex' &&
		!songInfo.frame.contains(event.target) &&
		!playerBox.contains(event.target)
	) {
		songInfo.frame.style.display = 'none';
	}
});

function shouldScroll(element) {
	return element.offsetWidth > (window.innerWidth * 30.5 / 100);
}

function openCoverHandler(event) {
	window.open(event.currentTarget.src, "_blank");
}

function loadSongInfo(data) {
	const title = data.title || "Unknown Title";
	const artist = data.artist || "Unknown Artist";
	const album = data.album || "Unknown Album";
	const cover = `/static/images/covers/${data.cover || "null"}.jpg`;

	let tpos = "N/A", trck = "N/A", tdrc = "Unknown", tpub = "Unknown", tcon = "Unknown";

	if (data.tags) {
		try {
			const tags = JSON.parse(data.tags);
			if (Array.isArray(tags.Other)) {
				const findTag = (code) => tags.Other.find(tag => tag[0] === code)?.[1] || "N/A";
				tpos = findTag("TPOS");
				trck = findTag("TRCK");
				tdrc = findTag("TDRC") || "Unknown";
				tpub = findTag("TPUB") || "Unknown";
				tcon = findTag("TCON") || "Unknown";
			}
		} catch (error) {
			console.warn('Error parsing tags:', error);
		}
	}

	const createInfoHTML = (label, id, value) => `
		<span>${label}:&nbsp</span>
		<div class='scroll-wrapper'>
			<span id='${id}'>${value}</span>
		</div>`;

	songInfo.title.innerHTML = createInfoHTML("Title", "Song-info-title-scroll", title);
	songInfo.artist.innerHTML = createInfoHTML("Artist", "Song-info-artist-scroll", artist);
	songInfo.album.innerHTML = createInfoHTML("Album", "Song-info-album-scroll", album);
	songInfo.genre.innerHTML = createInfoHTML("Genre", "Song-info-genre-scroll", tcon);
	songInfo.year.textContent = `Release date: ${tdrc}`;
	songInfo.publisher.textContent = `Publisher: ${tpub}`;
	songInfo.num.textContent = `Disk: ${tpos} | No: ${trck}`;
	songInfo.link.href = `${window.location.origin}/?song=${data.id}`;

	Object.assign(songInfo.cover, {
		src: cover,
		alt: `${title} - ${artist}`,
		draggable: false,
		style: { cursor: "pointer", userSelect: "none" }
	});

	songInfo.cover.removeEventListener("click", openCoverHandler);
	songInfo.cover.addEventListener("click", openCoverHandler);

	[
		{ element: 'Song-info-title', scrollElement: 'Song-info-title-scroll' },
		{ element: 'Song-info-artist', scrollElement: 'Song-info-artist-scroll' },
		{ element: 'Song-info-album', scrollElement: 'Song-info-album-scroll' },
		{ element: 'Song-info-genre', scrollElement: 'Song-info-genre-scroll' }
	].forEach(({ element, scrollElement }) => {
		const mainEl = document.getElementById(element);
		const scrollEl = document.getElementById(scrollElement);
		mainEl.removeEventListener('mouseenter', onMouseEnter);
		mainEl.removeEventListener('mouseleave', onMouseLeave);

		mainEl.addEventListener('mouseenter', onMouseEnter);
		mainEl.addEventListener('mouseleave', onMouseLeave);
		function onMouseEnter() {
			if (shouldScroll(scrollEl)) scrollEl.classList.add('scroll-left-info');
		}
		function onMouseLeave() {
			scrollEl.classList.remove('scroll-left-info');
		}
	});
}
