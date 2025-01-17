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
				button.setAttribute('data-offset', offset + data.songs.length);
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

//Activity Chart
function getColorForDuration(duration, minDuration, maxDuration, isDuration) {
	const proportion = (duration - minDuration) / (maxDuration - minDuration);

	let r, g, b;

	if (isDuration) {
		r = Math.round(25 + (57 - 25) * proportion);
		g = Math.round(27 + (211 - 27) * proportion);
		b = Math.round(34 + (83 - 34) * proportion);
	} else {
		r = Math.round(255 * proportion);
		g = Math.round(255 * (1 - proportion));
		b = 0;
	}

	return `rgb(${r}, ${g}, ${b})`;
}

async function fetchActivityData() {
	try {
		const response = await fetch('/api/user_activity');
		const data = await response.json();

		if (data.status === 'success') {
			const yearData = data.year_data;
			const years = Object.keys(yearData);

			const today = new Date();
			const lastYear = today.getFullYear() - 1;

			if (!yearData[lastYear]) {
				yearData[lastYear] = generateDefaultYearData();
			}

			populateYearSelector(years, yearData);
			const year = years[0];
			loadHeatmap(yearData, year);
		} else {
			console.error('Error fetching user activity data:', data.message);
		}
	} catch (error) {
		console.error('Error fetching user activity data:', error);
	}
}

function generateDefaultYearData() {
	const defaultData = {};
	for (let month = 1; month <= 12; month++) {
		for (let day = 1; day <= 31; day++) {
			const currentDate = `${new Date().getFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
			defaultData[currentDate] = {
				total_duration: 0,
				total_songs: 0
			};
		}
	}
	return {
		data: defaultData,
		min_duration: 0,
		max_duration: 0,
		min_songs: 0,
		max_songs: 0
	};
}

function populateYearSelector(years, yearData) {
	const yearSelect = document.getElementById('year');
	yearSelect.innerHTML = '';

	years.forEach(year => {
		const option = document.createElement('option');
		option.value = year;
		option.textContent = year;
		yearSelect.appendChild(option);
	});

	yearSelect.addEventListener('change', (event) => {
		const selectedYear = event.target.value;
		loadHeatmap(yearData, selectedYear);
	});
}

function loadHeatmap(yearData, year) {
	const heatmapContainer = document.getElementById('heatmap');
	heatmapContainer.innerHTML = '';

	const data = yearData[year].data;
	const minDuration = yearData[year].min_duration;
	const maxDuration = yearData[year].max_duration;
	const minSongs = yearData[year].min_songs;
	const maxSongs = yearData[year].max_songs;

	const firstDayOfYear = new Date(year, 0, 1);
	const lastDayOfYear = new Date(year, 11, 31);
	const weeksInYear = Math.ceil((lastDayOfYear - firstDayOfYear) / (7 * 24 * 60 * 60 * 1000));

	const thead = document.createElement('thead');
	const theadRow = document.createElement('tr');
	theadRow.innerHTML = '<th>Weekday</th>';
	for (let week = 1; week <= weeksInYear; week++) {
		const th = document.createElement('th');
		th.textContent = `Week ${week}`;
		theadRow.appendChild(th);
	}
	thead.appendChild(theadRow);
	heatmapContainer.appendChild(thead);

	const tbody = document.createElement('tbody');
	const weekdays = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

	for (let weekdayIndex = 0; weekdayIndex < 7; weekdayIndex++) {
		const row = document.createElement('tr');

		const weekdayCell = document.createElement('td');
		weekdayCell.textContent = weekdays[weekdayIndex];
		row.appendChild(weekdayCell);

		for (let weekNumber = 1; weekNumber <= weeksInYear; weekNumber++) {
			const startOfWeek = new Date(year, 0, (weekNumber - 1) * 7 + 1);
			const dayOfWeek = (weekdayIndex === 0) ? 7 : weekdayIndex;
			const targetDate = new Date(startOfWeek.setDate(startOfWeek.getDate() + dayOfWeek - 1));
			const currentDate = `${year}-${(targetDate.getMonth() + 1).toString().padStart(2, '0')}-${targetDate.getDate().toString().padStart(2, '0')}`;

			const cell = document.createElement('td');

			if (data[currentDate]) {
				const { total_duration, total_songs } = data[currentDate];
				const isDuration = document.getElementById('activity-label').textContent.includes('Duration');
				const color = getColorForDuration(isDuration ? total_duration : total_songs, isDuration ? minDuration : minSongs, isDuration ? maxDuration : maxSongs, isDuration);
				cell.style.backgroundColor = color;
				cell.title = `Date: ${currentDate}\nDuration: ${total_duration}s\nSongs: ${total_songs}`;
			} else {
				cell.style.backgroundColor = 'rgb(240, 240, 240)';
			}
			row.appendChild(cell);
		}

		tbody.appendChild(row);
	}
	heatmapContainer.appendChild(tbody);
}

fetchActivityData();