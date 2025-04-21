let debounceTimeout;

document.addEventListener("input", function (event) {
	if (event.target.id === "search-bar") {
		if (event.target.value.length < 3) {
			document.getElementById("search-results").innerHTML = "<p>No results found</p>";
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
			const currentHeight = resultsContainer.scrollHeight;
			resultsContainer.innerHTML = "";

			if (data.songs.length === 0) {
				resultsContainer.innerHTML = "<p>No results found</p>";
				return;
			}

			data.songs.forEach(song => {
				const songElement = document.createElement("div");
				songElement.classList.add("song-result");
				songElement.innerHTML = `
					<div class="result-row">
						<a href="/static/images/covers/${song.cover ? song.cover : 'null'}.jpg" class="result-cover-link">
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

document.addEventListener("focusout", function (event) {
	const resultsContainer = document.getElementById("search-results");
	const dropDown = document.getElementById("dropdown-search");
	const searchTime = document.getElementById("search-time");

	setTimeout(() => {
		resultsContainer.classList.remove("show");
		dropDown.classList.remove("show");
		searchTime.classList.remove("show");
	}, 100);

});

document.addEventListener("focusin", function (event) {
	const resultsContainer = document.getElementById("search-results");
	const dropDown = document.getElementById("dropdown-search");
	const searchTime = document.getElementById("search-time");

	if (event.target.id === "search-bar") {
		resultsContainer.classList.add("show");
		dropDown.classList.add("show");
		searchTime.classList.add("show");
	}
}
);
