let debounceTimeout;

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
		if (vals[field] !== "" && !/^\d+$/.test(vals[field])) {
			errors.push(`${field} must be an integer`);
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

	inputs.searchLink.href = "/search/?" + new URLSearchParams(params).toString();
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
						<a href="/static/images/covers/${song.cover||'null'}.jpg"
						   class="result-cover-link" target="_blank">
						   <img src="/static/images/covers/${song.cover||'null'}.jpg"
								alt="${song.title}" class="result-cover">
						</a>
						<a href="/?song=${song.id}">${song.title}</a>
						<p>${song.artist}</p>
						<p>${song.duration}</p>
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


function isInsideSearchElements(target) {
	return (
		target.id === "dropdown-content-search" ||
		target.id === "search-bar" ||
		target.id === "search-link" ||
		target.closest("#dropdown-content-search") ||
		target.closest("#search-bar") ||
		target.closest("#search-link")
	);
}

document.addEventListener("click", function (event) {
	if (isInsideSearchElements(event.target)) {
		return;
	}

	const resultsContainer = document.getElementById("search-results");
	const dropDown = document.getElementById("dropdown-content-search");
	const searchTime = document.getElementById("search-time");

	setTimeout(function () {
		resultsContainer.classList.remove("show");
		dropDown.classList.remove("show");
		searchTime.classList.remove("show");
	}, 100);
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
		const dropdownSearch = document.getElementById("dropdown-search");
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
