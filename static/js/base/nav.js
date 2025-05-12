let debounceTimeout;

// Handle theme switcher
document.addEventListener('DOMContentLoaded', function () {
	const switcher = document.querySelector('#nav-container');

	switcher.addEventListener('click', function (e) {
		const btn = e.target.closest('.theme-btn');
		if (!btn) return;
		const buttons = switcher.querySelectorAll('.theme-btn');
		buttons.forEach(function (b) {
			b.classList.remove('active');
		});
		btn.classList.add('active');
		const selected_theme = btn.getAttribute('data-theme');
		document.documentElement.setAttribute('data-theme', selected_theme);
	});

	const observer = new MutationObserver(() => {
		const current_theme = document.documentElement.getAttribute('data-theme');
		const buttons = switcher.querySelectorAll('.theme-btn');
		buttons.forEach(function (btn) {
			if (btn.getAttribute('data-theme') === current_theme) {
				btn.classList.add('active');
			}
		});
	});

	observer.observe(switcher, { childList: true });
});

// Handle search bar
function getSecondsFromTimeString(timeString) {
	let totalSeconds = 0;

	const hoursMatch = timeString.match(/(\d+)h/);
	const minutesMatch = timeString.match(/(\d+)m/);

	if (hoursMatch) {
		totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
	}
	if (minutesMatch) {
		totalSeconds += parseInt(minutesMatch[1], 10) * 60;
	}

	const remainingString = timeString.replace(/(\d+)h/, "").replace(/(\d+)m/, "").trim();
	const remainingSeconds = parseInt(remainingString, 10);

	if (!isNaN(remainingSeconds)) {
		totalSeconds += remainingSeconds;
	} else if (remainingString !== "") {
		return "Invalid time format";
	}

	return totalSeconds;
}

document.addEventListener("keydown", function (event) {
	if (event.key === "Enter" && (event.target.id === "search-bar" ||
		event.target.id === "search-title" ||
		event.target.id === "search-artist" ||
		event.target.id === "search-album" ||
		event.target.id === "min-time-search-value" ||
		event.target.id === "max-time-search-value")) {
		event.preventDefault();
		document.getElementById("search-link").click();
	}
});

document.addEventListener("input", function (event) {
	const inputs = {
		searchBar:   document.getElementById("search-bar"),
		searchTitle: document.getElementById("search-title"),
		searchArtist:document.getElementById("search-artist"),
		searchAlbum: document.getElementById("search-album"),
		minTime:	 document.getElementById("min-time-search-value"),
		maxTime:	 document.getElementById("max-time-search-value"),
		results:	 document.getElementById("search-results"),
		searchLink:  document.getElementById("search-link")
	};
	if (![ 
		inputs.searchBar, inputs.searchTitle, inputs.searchArtist,
		inputs.searchAlbum, inputs.minTime, inputs.maxTime
	].includes(event.target)) return;

	const vals = {
		query:  inputs.searchBar.value.trim(),
		title:  inputs.searchTitle.value.trim(),
		artist: inputs.searchArtist.value.trim(),
		album:  inputs.searchAlbum.value.trim(),
		min:	inputs.minTime.value.trim(),
		max:	inputs.maxTime.value.trim(),
	};

	const errors = [];
	["query","title","artist","album"].forEach(field => {
		if (vals[field] !== "") {
			if (vals[field].length < 2)
				errors.push(`${field} must be at least 2 characters`);
			if (vals[field].length > 500)
				errors.push(`${field} must be at most 500 characters`);
		}
	});
	["min","max"].forEach(field => {
		if (vals[field] !== "") {
			const seconds = getSecondsFromTimeString(vals[field]);
			if (typeof seconds === "number") {
				vals[field] = seconds;
			} else {
				errors.push(`${field} must be a valid time format (?h?m? accepted)`);
				vals[field] = "";
			}
		}
	});

	const hasValidText = ["query","title","artist","album"]
		.some(f => vals[f].length >= 2 && vals[f].length <= 500);
	const hasValidDur  = vals.min !== "" || vals.max !== "";

	if (!hasValidText && !hasValidDur) {
		errors.push(
			"At least one search field (text ≥2 chars or valid min/max) is required"
		);
	}

	if (errors.length) {
		clearTimeout(debounceTimeout);
		const oldHeight = inputs.results.getBoundingClientRect().height;
		inputs.results.innerHTML = `<p>${errors[0]}</p>`;
		updateContainerHeight(inputs.results, oldHeight);
		return;
	}

	const params = {};
	Object.entries(vals).forEach(([k,v]) => {
		if (v !== "") params[k] = v;
	});

	inputs.searchLink.href = "/search?" + new URLSearchParams(params).toString();
	clearTimeout(debounceTimeout);
	debounceTimeout = setTimeout(() => {
		fetchSearch(params);
		updateContainerHeight(inputs.results);
	}, 300);
});

function updateContainerHeight(container, oldHeight) {
	container.style.height = "fit-content";
	const newHeight = container.scrollHeight;
	container.style.height = oldHeight + 'px';
	const targetHeight = Math.min(newHeight, document.documentElement.clientHeight * 0.3);
	container.style.overflowY = targetHeight < newHeight ? 'auto' : 'hidden';
	container.style.transition = 'height 0.3s ease-in-out';
	void container.offsetHeight;
	setTimeout(() => {
		container.style.height = targetHeight + 'px';
	}, 0);
}

function fetchSearch(params) {
	const container = document.getElementById("search-results");
	const qs = new URLSearchParams(params).toString();

	const oldHeight = container.getBoundingClientRect().height;
	fetch(`/api/search?${qs}`)
		.then(async response => {
			const data = await response.json();
			container.innerHTML = "";

			if (!response.ok || data.status === "error") {
				const msg = data.message || "Internal server error.";
				container.innerHTML = `<p>${msg}</p>`;
				updateContainerHeight(container, oldHeight);
				return;
			}
			if (!data.songs || data.songs.length === 0) {
				container.innerHTML = `<p>No results found</p>`;
				updateContainerHeight(container, oldHeight);
				return;
			}

			data.songs.forEach(song => {
				const el = document.createElement("div");
				el.classList.add("song-result");
				el.innerHTML = `
					<div class="result-row">
						<a href="/static/images/covers/${song.cover || 'null'}.jpg" class="result-cover-link" target="_blank">
							<img src="/static/images/covers/${song.cover || 'null'}.jpg" alt="${song.title}" class="result-cover">
						</a>
						<a href="/?song=${song.id}" class="result-title">${song.title}</a>
						<p class="result-artist">${song.artist}</p>
						<p class="result-duration">${song.duration}</p>
					</div>`;
				container.appendChild(el);
			});
			updateContainerHeight(container, oldHeight);			
		})
		.catch(err => {
			console.error("Fetch error:", err);
			container.innerHTML = `<p>Internal error fetching search results.</p>`;
			updateContainerHeight(container, oldHeight);
		});
}


document.addEventListener("click", function (event) {
	if (event.target.closest("#search-container") === null) {
		const dropDown = document.getElementById("dropdown-content-search");
		dropDown.classList.remove("show");
	}
});

document.addEventListener("focusin", function (event) {
	if (event.target.id !== "search-bar") {
		return;
	}

	const resultsContainer = document.getElementById("search-results");
	const dropDown = document.getElementById("dropdown-content-search");
	const searchTime = document.getElementById("search-time");

	resultsContainer.classList.add("show");
	dropDown.classList.add("show");
	searchTime.classList.add("show");
});

document.addEventListener("change", function (event) {
	const checkbox = event.target;
	if (checkbox.id === "advanced-search-toggle") {
		const dropdownSearch = document.getElementById("dropdown-advanced-search");
		const searchResults = document.getElementById("search-results");

		if (checkbox.checked) {
			dropdownSearch.classList.add("show");
			searchResults.classList.add("advanced-search");
		} else {
			dropdownSearch.classList.remove("show");
			searchResults.classList.remove("advanced-search");
		}
	}
});

