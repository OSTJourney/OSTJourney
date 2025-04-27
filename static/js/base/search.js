let debounceTimeout;

document.addEventListener("input", function (event) {
	if (event.target.id === "search-bar") {
		if (event.target.value.length < 3) {
			const resultsContainer = document.getElementById("search-results");
			resultsContainer.classList.remove("has-results");
			resultsContainer.innerHTML = "<p>No results found</p>";
			return;
		}
		clearTimeout(debounceTimeout);
		const searchValue = event.target.value.toLowerCase();
		const searchLink = document.getElementById("search-link");
		searchLink.href = `/search/?query=${encodeURIComponent(searchValue)}`;
		debounceTimeout = setTimeout(() => {
			getResult(searchValue);
		}, 300);
	};
});

function getResult(searchValue) {
	fetch(`/api/search?query=${encodeURIComponent(searchValue)}&type=search-bar`)
		.then(response => response.json())
		.then(data => {
			const resultsContainer = document.getElementById("search-results");
			resultsContainer.innerHTML = "";

			if (!data.songs || data.songs.length < 1) {
				resultsContainer.classList.remove("has-results");
				resultsContainer.innerHTML = "<p>No results found</p>";
				return;
			}
			resultsContainer.classList.add("has-results");
			data.songs.forEach(song => {
				const songElement = document.createElement("div");
				songElement.classList.add("song-result");
				songElement.innerHTML = `
					<div class="result-row">
						<a href="/static/images/covers/${song.cover ? song.cover : 'null'}.jpg" class="result-cover-link" target="_blank">
							<img src="/static/images/covers/${song.cover ? song.cover : 'null'}.jpg" alt="${song.title}" class="result-cover">
						</a>
						<a href="/?song=${song.id}">${song.title}</a>
						<p>${song.artist}</p>
						<p>${song.duration}</p>
					</div>
				`;
				resultsContainer.appendChild(songElement);
			});
		})
		.catch(error => console.error("Error fetching search results:", error));
}

function isInsideSearchElements(target) {
	return (
		target.id === "dropdown-content-search" ||
		target.id === "search-bar" ||
		target.closest("#dropdown-content-search") ||
		target.closest("#search-bar")
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
