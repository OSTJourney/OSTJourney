settings = {
	enable_rpc: false,
};

fetch("/api/settings")
	.then((response) => {
		if (response.ok) {
			return response.json();
		} else {
			throw new Error("Network response was not ok");
		}
	})
	.then((data) => {
		if (data.status === 'success') {
			settings.enable_rpc = data.settings.enable_rpc;
		} else {
			console.error("Error in API response:", data.message);
		}
	})
	.catch((error) => {
		console.error("There was an error with the fetch operation:", error);
	});
