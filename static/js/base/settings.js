settings = {
	connected: false,
	enable_rpc: false,
	theme: 'cattpuccin-macchiato',
	theme_overrides: [],
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
			settings.connected = true;
			settings.enable_rpc = data.settings.enable_rpc;
			settings.theme = data.settings.theme;
			settings.theme_overrides = data.settings.theme_overrides;
			document.documentElement.setAttribute('data-theme', settings.theme);
			if (settings.theme_overrides) {
				settings.theme_overrides.forEach((override) => {
					document.documentElement.style.setProperty(override.name, override.value);
				});
			} else {
				settings.theme_overrides = [];
			}
		} else {
			console.error("Error in API response:", data.message);
		}
	})
	.catch((error) => {
		console.error("There was an error with the fetch operation:", error);
	});
