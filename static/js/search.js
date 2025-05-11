let loadedIndex = 0;
const limit = 25;

const tbody = document.querySelector('.songs-tbody');
const searchShareLink = document.getElementById('searchShareLink');
searchShareLink.innerHTML = window.location.origin + searchShareLink.innerHTML;
addListener(searchShareLink, 'click', function() {
	copyTextToClipboard(searchShareLink.innerHTML);
});

function loadSongs() {
	if (loadedIndex >= resultIds.length) {
		return;
	}

	const idsToLoad = resultIds.slice(loadedIndex, loadedIndex + limit);
	const params = new URLSearchParams();
	idsToLoad.forEach(id => params.append('ids', id));

	fetch(`/api/songs?${params.toString()}`)
		.then(response => response.json())
		.then(data => {
			data.forEach(song => {
				let row = document.createElement('tr');
				row.innerHTML = `
					<td><a href="/static/images/covers/${song.cover || 'null'}.jpg" target="_blank">
						<img src="/static/images/covers/${song.cover || 'null'}.jpg" alt="${song.title}" class="tab-cover">
					</a></td>
					<td><a href="/?song=${song.id}" target="_blank">${song.title}</a></td>
					<td>${song.artist}</td>
					<td>${formatDuration(song.duration)}</td>
				`;
				tbody.appendChild(row);
			});
		})
		.catch(error => console.error('Error loading songs:', error));

	loadedIndex += limit;
}

addListener(document, 'scroll', function() {
	const scrollPosition = window.scrollY + window.innerHeight;
	const totalHeight = document.documentElement.scrollHeight;

	if (scrollPosition >= totalHeight - 100) {
		loadSongs();
	}
});

const resultIdsElement = document.getElementById('search-results-ids');
if (resultIdsElement) {
	resultIds = JSON.parse(resultIdsElement.textContent);
} else {
	resultIds = [];
}

lenSongs = resultIds.length;

if (lenSongs > 0) {
	const numSongsFoundElement = document.getElementById('numSongsFound');
	if (numSongsFoundElement) {
		numSongsFoundElement.textContent = lenSongs;
	}
	loadSongs();
}
if (lenSongs >= 900) {
	let searchMessageError = document.getElementById('searchError');
	
	if (!searchMessageError) {
		searchMessageError = document.createElement('p');
		searchMessageError.id = 'searchError';
		searchMessageError.className = 'error-msg';
		const container = document.querySelector('center');
		if (container) {
			container.insertBefore(searchMessageError, container.querySelector('.song-tab'));
		}
	}
	searchMessageError.innerHTML = `<strong>Notice:</strong> You have loaded a large number of songs. Please improve your search with filters and advanced search to improve results.`;
	searchMessageError.style.visibility = 'visible';
}