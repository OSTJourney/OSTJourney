document.getElementById('load-more').addEventListener('click', function() {
	const button = this;
	const offset = parseInt(button.getAttribute('data-offset'), 10);
	fetch(`/profile/history?offset=${offset}`)
		.then(response => response.json())
		.then(data => {
			if (data.songs && data.songs.length > 0) {
				if (data.songs.length < 25) {
					button.style.display = 'none';
				}
				const tbody = document.getElementById('songs-tbody');
				data.songs.forEach(song => {
					const row = document.createElement('tr');
					row.innerHTML = `
						<td><a href="/?song=${song.song_id}" target="_blank">${song.song_id}</a></td>
						<td><a href="/?song=${song.song_id}" target="_blank">${song.title}</a></td>
						<td>${song.artist}</td>
						<td>${song.duration}</td>
					`;
					tbody.appendChild(row);
				});
				button.setAttribute('data-offset', offset + 25);
			} else {
				button.style.display = 'none';
			}
		})
		.catch(error => {
			console.error('Error loading more songs:', error);
		});
});

fetch('/profile/history/24h')
.then(response => response.json())
.then(data => {
	const hourlyCounts = data.hourly_counts;
	const labels = [];
	const counts = [];

	for (let hour = 0; hour < 24; hour++) {
		labels.push(hour + ':00');
		counts.push(hourlyCounts[hour]);
	}

	const ctx = document.getElementById('hourlyChart').getContext('2d');
	const hourlyChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: labels,
			datasets: [{
				label: 'Musics listened',
				data: counts,
				fill: false,
				borderColor: 'rgb(75, 192, 192)',
				tension: 0.1
			}]
		},
		options: {
			responsive: true, 
			scales: {
				x: {
					title: {
						display: true,
						text: 'Hour of the Day'
					}
				},
				y: {
					title: {
						display: true,
						text: 'Number of Songs'
					}
				}
			}
		}
	});
})
.catch(error => {
	console.error('Error fetching hourly data:', error);
});
