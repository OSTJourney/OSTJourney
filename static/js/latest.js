document.querySelectorAll('.addition-button').forEach(button => {
	button.addEventListener('click', function() {
		let container = this.closest('.addition-container');
		let songsTbody = container.querySelector('.songs-tbody');
		let songList = container.querySelector('.song-list');
		let start = parseInt(container.querySelector('.addition-start-id').textContent.trim(), 10);
		let limit = 30;
		let max = parseInt(container.querySelector('.addition-end-id').textContent.trim(), 10);

		songList.style.display = "block";
		button.style.display = "none";
		container.classList.add('expanded');
		loadSongs(start, limit, songsTbody);
		songList.addEventListener('scroll', function() {
			if (songList.scrollTop + songList.clientHeight >= songList.scrollHeight) {
				start += limit;
				if (start < max) {
					loadSongs(start, limit, songsTbody);
				}
			}
		});
	});
});

function loadSongs(start, limit, tbody) {
	fetch(`/api/get_songs?start=${start}&end=${start + limit}`)
		.then(response => response.json())
		.then(data => {
			if (data.songs.length === 0) return;

			data.songs.forEach(song => {
				let row = document.createElement('tr');
				row.innerHTML = `
					<td class="song-tab-col1">
						<a href="/static/images/covers/${song.cover ? song.cover : 'null'}.jpg" target="_blank">
							<img src="/static/images/covers/${song.cover ? song.cover : 'null'}.jpg" 
								 alt="${song.title}" class="tab-cover">
						</a>
					</td>
					<td class="song-tab-col2"><a href="/?song=${song.id}" target="_blank">${song.title}</a></td>
					<td class="song-tab-col3">${song.artist}</td>
					<td class="song-tab-col3">${song.duration}</td>
				`;
				tbody.appendChild(row);
			});
		});
}
