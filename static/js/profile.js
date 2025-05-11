addListener(document.getElementById('load-more'), 'click', function() {
	const button = this;
	const offset = parseInt(button.getAttribute('data-offset'), 10);
	fetch(`/profile/history?offset=${offset}`)
		.then(response => response.json())
		.then(data => {
			if (data.songs && data.songs.length > 0) {
				if (data.songs.length < 25) {
					button.style.display = 'none';
				}
				const tbody = document.getElementsByClassName('songs-tbody')[0];
				data.songs.forEach(song => {
					const row = document.createElement('tr');
					row.innerHTML = `
						<td><a href="/static/images/covers/${song.cover}.jpg" target="_blank"><img src="/static/images/covers/${song.cover}.jpg" alt="${song.title}" class="tab-cover"></a>
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
		new Chart(ctx, {
			type: 'bar',
			data: {
				labels: labels,
				datasets: [{
					label: 'Musics listened',
					data: counts,
					fill: false,
					backgroundColor: 'rgb(75, 192, 192)',
					borderColor: 'rgb(75, 192, 192)',
					tension: 0.1
				}]
			},
			options: {
				responsive: true,
				scales: {
					x: { title: { display: true, text: 'Hour of the Day' } },
					y: { title: { display: true, text: 'Number of Songs' } }
				}
			}
		});
	})
	.catch(error => {
		console.error('Error fetching hourly data:', error);
	});

let storedTotalHours = document.getElementById('profile-total-hours').textContent;
let storedTotalDuration = document.getElementById('profile-total-duration').textContent;
var duration_element = document.getElementById('duration-value');
document.getElementById('profile-total-hours').remove();
document.getElementById('profile-total-duration').remove();
duration_element.textContent = storedTotalDuration;
var duration_elem_state = 0;

addListener(document.getElementById('profile-duration'), 'mouseover', function() {
	if (duration_elem_state == 0) {
		duration_element.textContent = storedTotalHours;
	} else {
		duration_element.textContent = storedTotalDuration;
	}
	duration_elem_state = 1 - duration_elem_state;
});

const heatMap = {
	checkBox: document.getElementById('fixByPercentile'),
	yearSelect: document.getElementById('year'),
	heatmapContainer: document.getElementById('heatmap'),
	type: 0,
	yearData: {},
	year: null,
	fixByPercent: false,
	palettes: [
		['var(--crust)', '14, 68, 41', '0, 109, 50', '38, 166, 65', '57, 211, 83'],
		['var(--crust)', '24, 48, 84', '26, 69, 135', '29, 90, 185', '31, 111, 235'],
		['var(--crust)', '48, 52, 89', '73, 78, 143', '99, 103, 198', '124, 128, 252']
	],
	scaleColors: {
		0: ['rgb(14, 68, 41)', 'rgb(0, 109, 50)', 'rgb(38, 166, 65)', 'rgb(57, 211, 83)'],
		1: ['rgb(24, 48, 84)', 'rgb(26, 69, 135)', 'rgb(29, 90, 185)', 'rgb(31, 111, 235)'],
		2: ['rgb(48, 52, 89)', 'rgb(73, 78, 143)', 'rgb(99, 103, 198)', 'rgb(124, 128, 252)']
	},
	button: {
		song: {
			elem: document.getElementById('heatmap-song'),
			type: 0,
			styleClass: 'heatmap-song-active'
		},
		duration: {
			elem: document.getElementById('heatmap-duration'),
			type: 1,
			styleClass: 'heatmap-duration-active'
		},
		ratio: {
			elem: document.getElementById('heatmap-ratio'),
			type: 2,
			styleClass: 'heatmap-ratio-active'
		},
	}
};

function getColorForDuration(duration, minDuration, maxDuration, type) {
	const range = maxDuration - minDuration;
	duration -= minDuration;
	maxDuration -= minDuration;
	let selectedPalette = heatMap.palettes[type];

	let index;
	if (duration < 0) index = 0;
	else if (duration == 0 && minDuration == 0) index = 0;
	else if (duration <= range / 4) index = 1;
	else if (duration <= range / 2) index = 2;
	else if (duration <= (range * 3) / 4) index = 3;
	else index = 4;
	return `rgb(${selectedPalette[index]})`;

}

addListener(heatMap.checkBox, 'change', function () {
	heatMap.fixByPercent = this.checked;
	loadHeatmap(heatMap.yearData, heatMap.year, heatMap.type);
});

function changeHeatmapType(buttonData) {
	heatMap.type = buttonData.type;
	Object.values(heatMap.button).forEach(b => b.elem.classList.remove(b.styleClass));
	buttonData.elem.classList.add(buttonData.styleClass);
	heatMap.scaleColors[buttonData.type].forEach((color, index) => {
		document.getElementById(`heatmap-scale${index + 2}`).style.backgroundColor = color;
	});
	loadHeatmap(heatMap.yearData, heatMap.year, heatMap.type);
}

addListener(heatMap.button.song.elem, 'click', () => changeHeatmapType(heatMap.button.song));
addListener(heatMap.button.duration.elem, 'click', () => changeHeatmapType(heatMap.button.duration));
addListener(heatMap.button.ratio.elem, 'click', () => changeHeatmapType(heatMap.button.ratio));

function computeColorValuesForYear(yearData, year) {
	const dailyData = yearData[year].data;
	const ratioValues = [];
	const songValues = [];
	const durationValues = [];
	for (const date in dailyData) {
		const day = dailyData[date];
		if (day.ratio > 0) ratioValues.push(day.ratio);
		if (day.total_songs > 0) songValues.push(day.total_songs);
		if (day.total_duration > 0) durationValues.push(day.total_duration);
	}
	ratioValues.sort((a, b) => a - b);
	songValues.sort((a, b) => a - b);
	durationValues.sort((a, b) => a - b);
  
	function getColorBin(value, sortedValues) {
		if (value === 0) return 0;
		const n = sortedValues.length;
		if (n === 0) return 0;
		const q1 = sortedValues[Math.floor(n * 0.25)];
		const q2 = sortedValues[Math.floor(n * 0.5)];
		const q3 = sortedValues[Math.floor(n * 0.75)];
		if (value <= q1) return 1;
		else if (value <= q2) return 2;
		else if (value <= q3) return 3;
		else return 4;
	}
	for (const date in dailyData) {
		const day = dailyData[date];
		day.ratioColor = getColorBin(day.ratio, ratioValues);
		day.songColor = getColorBin(day.total_songs, songValues);
		day.durationColor = getColorBin(day.total_duration, durationValues);
	}
}

async function fetchActivityData() {
	try {
		const response = await fetch('/api/user_activity');
		const data = await response.json();
		if (data.status === 'success') {
			heatMap.yearData = data.year_data;
			const years = Object.keys(heatMap.yearData);
			for (const yr of years) {
				const yearInfo = heatMap.yearData[yr];
				const dailyData = yearInfo.data;
				let minRatio = Infinity;
				let maxRatio = -Infinity;
				let hasValidData = false;
				for (const date in dailyData) {
					const { total_duration, total_songs } = dailyData[date];
					const ratio = total_songs > 0 ? total_duration / total_songs : 0;
					dailyData[date].ratio = ratio;
					if (total_duration > 0 && total_songs > 0) {
						hasValidData = true;
						if (ratio < minRatio) minRatio = ratio;
						if (ratio > maxRatio) maxRatio = ratio;
					}
				}
				yearInfo.min_ratio = hasValidData ? minRatio : 0;
				yearInfo.max_ratio = hasValidData ? maxRatio : 0;
				computeColorValuesForYear(heatMap.yearData, yr);
			}
			const today = new Date();
			const lastYear = today.getFullYear() - 1;
			if (!heatMap.yearData[lastYear]) {
				heatMap.yearData[lastYear] = generateDefaultYearData(lastYear);
			}
			populateYearSelector(years, heatMap.yearData);
			heatMap.year = years[0];
			loadHeatmap(heatMap.yearData, heatMap.year, heatMap.type);
		} else {
			console.error('Error fetching user activity data:', data.message);
		}
	} catch (error) {
		console.error('Error fetching user activity data:', error);
	}
}

function generateDefaultYearData(year) {
	const defaultData = {};
	for (let month = 1; month <= 12; month++) {
		for (let day = 1; day <= 31; day++) {
			const currentDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
			defaultData[currentDate] = {
				total_duration: 0,
				total_songs: 0,
				formatted_duration: '0h 0m',
				ratio: 0
			};
		}
	}
	return {
		data: defaultData,
		min_duration: 0,
		max_duration: 0,
		min_songs: 0,
		max_songs: 0,
		min_ratio: 0,
		max_ratio: 0
	};
}

function populateYearSelector(years, yearData) {
	heatMap.yearSelect.innerHTML = '';
	years.forEach(yr => {
		const option = document.createElement('option');
		option.value = yr;
		option.textContent = yr;
		heatMap.yearSelect.appendChild(option);
	});
	addListener(heatMap.yearSelect, 'change', (event) => {
		heatMap.year = event.target.value;
		loadHeatmap(heatMap.yearData, heatMap.year, heatMap.type);
	});
}

function loadHeatmap(yearData, year, type) {
	heatMap.heatmapContainer.innerHTML = '';

	const data = yearData[year].data;
	const firstDayOfYear = new Date(year, 0, 1);
	const lastDayOfYear = new Date(year, 11, 31);
	const weeksInYear = Math.ceil(((lastDayOfYear - firstDayOfYear) / (7 * 24 * 60 * 60 * 1000)) + 1);
	const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	const thead = document.createElement('thead');
	const theadRow = document.createElement('tr');
	theadRow.innerHTML = '<th></th>';
	let previousMonth = -1;
	for (let week = 1; week <= weeksInYear; week++) {
		const startOfWeek = new Date(year, 0, (week - 1) * 7 + 1);
		const currentMonth = startOfWeek.getMonth();
		const th = document.createElement('th');
		if (currentMonth !== previousMonth) {
			const span = document.createElement('span');
			span.textContent = monthNames[currentMonth];
			th.appendChild(span);
			previousMonth = currentMonth;
		} else {
			th.textContent = '';
		}
		theadRow.appendChild(th);
	}
	thead.appendChild(theadRow);
	heatMap.heatmapContainer.appendChild(thead);

	const tbody = document.createElement('tbody');
	const weekdays = ["", "Mon", "", "Wed", "", "Fri", ""];
	for (let weekdayIndex = 0; weekdayIndex < 7; weekdayIndex++) {
		const row = document.createElement('tr');
		const weekdayCell = document.createElement('td');
		weekdayCell.textContent = weekdays[weekdayIndex];
		row.appendChild(weekdayCell);

		for (let weekNumber = 1; weekNumber <= weeksInYear; weekNumber++) {
			const startOfWeek = new Date(year, 0, (weekNumber - 1) * 7 + 1);
			const dayOfWeek = weekdayIndex;
			const targetDate = new Date(startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + dayOfWeek));
			const currentDate = `${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, '0')}-${targetDate.getDate().toString().padStart(2, '0')}`;
			const cell = document.createElement('td');
			if (targetDate.getFullYear() !== parseInt(year)) {
				cell.style.backgroundColor = 'rgb(var(--crust))';
			} else if (data[currentDate]) {
				const { formatted_duration, total_songs, ratio } = data[currentDate];
				let color;
				if (heatMap.fixByPercent) {
					color = (type === 0) ? heatMap.palettes[type][data[currentDate].songColor] :
							(type === 1) ? heatMap.palettes[type][data[currentDate].durationColor] :
							(type === 2) ? heatMap.palettes[type][data[currentDate].ratioColor] : null;
					cell.style.backgroundColor = `rgb(${color})`;
				} else {
					let value, minValue, maxValue;
					if (type === 0) {
						value = data[currentDate].total_songs;
						minValue = yearData[year].min_songs;
						maxValue = yearData[year].max_songs;
					} else if (type === 1) {
						value = data[currentDate].total_duration;
						minValue = yearData[year].min_duration;
						maxValue = yearData[year].max_duration;
					} else if (type === 2) {
						value = data[currentDate].ratio;
						minValue = yearData[year].min_ratio;
						maxValue = yearData[year].max_ratio;
					}
					color = getColorForDuration(value, minValue, maxValue, type);
					cell.style.backgroundColor = color;
				}
				cell.title = `Date: ${currentDate}\nDuration: ${formatted_duration}\nSongs: ${total_songs}\nRatio: ${ratio.toFixed(2)}`;
			}
			row.appendChild(cell);
		}
		tbody.appendChild(row);
	}
	heatMap.heatmapContainer.appendChild(tbody);
}

fetchActivityData();

function scaleTableTo80Percent() {
	const table = document.getElementById('heatmap');
	const wrapper = table.parentElement;

	const wrapperWidth = wrapper.offsetWidth;
	const tableWidth = table.offsetWidth;

	if (tableWidth > 0) {
		const scaleFactor = Math.min(1, (wrapperWidth * 0.9) / tableWidth);
		table.style.transform = `scale(${scaleFactor})`;
	}
}
scaleTableTo80Percent();
addListener(window, 'resize', scaleTableTo80Percent);