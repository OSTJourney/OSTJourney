settings = {
	connected: false,
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
			settings.connected = true;
			settings.enable_rpc = data.settings.enable_rpc;
		} else {
			console.error("Error in API response:", data.message);
		}
	})
	.catch((error) => {
		console.error("There was an error with the fetch operation:", error);
	});

function rgbToHex(rgb) {
	if (rgb.startsWith('#')) return rgb;
	const rgbArr = rgb.replace(/[^\d,]/g, '').split(',');
	const r = parseInt(rgbArr[0]).toString(16).padStart(2, '0');
	const g = parseInt(rgbArr[1]).toString(16).padStart(2, '0');
	const b = parseInt(rgbArr[2]).toString(16).padStart(2, '0');
	return `#${r}${g}${b}`;
}

function getCurrentTheme() {
	return document.documentElement.getAttribute('data-theme');
}

function createColorInputs() {
	const container = document.getElementById('settings-theme-overrides');
	if (!container) return;
	container.innerHTML = '';

	const variables = [];
	const currentTheme = getCurrentTheme();

	for (const stylesheet of document.styleSheets) {
		let rules;
		try {
			rules = stylesheet.cssRules;
		} catch (e) {
			continue;
		}
		if (!rules) continue;

		for (const rule of rules) {
			if (rule.selectorText === `[data-theme="${currentTheme}"]`) {
				const style = rule.style;
				for (const name of style) {
					if (name.startsWith('--')) {
						const value = style.getPropertyValue(name).trim();
						if (value) {
							variables.push({ name, value });
						}
					}
				}
			}
		}
	}

	variables.forEach(variable => {
		if (variable.name === '--bg-transition') return;

		const inputWrapper = document.createElement('div');
		inputWrapper.classList.add('color-override-wrapper');

		const label = document.createElement('label');
		label.setAttribute('for', variable.name);
		label.textContent = variable.name;

		const colorInput = document.createElement('input');
		colorInput.type = 'color';
		const computed = getComputedStyle(document.documentElement).getPropertyValue(variable.name).trim();
		colorInput.value = rgbToHex(computed);

		const resetButton = document.createElement('button');
		resetButton.type = 'button';
		resetButton.textContent = 'Reset';

		inputWrapper.appendChild(label);
		inputWrapper.appendChild(colorInput);
		inputWrapper.appendChild(resetButton);
		container.appendChild(inputWrapper);

		addListener(colorInput, 'input', function () {
			const hex = colorInput.value;
			const r = parseInt(hex.slice(1, 3), 16);
			const g = parseInt(hex.slice(3, 5), 16);
			const b = parseInt(hex.slice(5, 7), 16);
			const rgbRaw = `${r}, ${g}, ${b}`;
			document.documentElement.style.setProperty(variable.name, rgbRaw);
		});

		addListener(resetButton, 'click', function () {
			document.documentElement.style.removeProperty(variable.name);
			const current = getComputedStyle(document.documentElement).getPropertyValue(variable.name).trim();
			colorInput.value = rgbToHex(current);
		});
	});
}

function highlightCurrentTheme() {
	const currentTheme = getCurrentTheme();
	const buttons = document.querySelectorAll('.settings-theme-btn');

	buttons.forEach((button) => {
		if (button.dataset.theme === currentTheme) {
			button.classList.add('active');
		} else {
			button.classList.remove('active');
		}
	});
}

function initColorInputs() {
	if (document.getElementById('currentUrl').innerText === "/settings") {
		createColorInputs();
		highlightCurrentTheme();
	}
}

initColorInputs();

if (window.__themeObserver) {
	window.__themeObserver.disconnect();
	delete window.__themeObserver;
}

window.__themeObserver = new MutationObserver(() => {
	console.log('Theme changed');
	initColorInputs();
});

window.__themeObserver.observe(document.documentElement, {
	attributes: true,
	attributeFilter: ['data-theme']
});

const buttons = document.querySelectorAll('.settings-theme-btn');

buttons.forEach((button) => {
	addListener(button, 'click', function () {
		const selectedTheme = button.dataset.theme;
		document.documentElement.setAttribute('data-theme', selectedTheme);
		const buttons = document.querySelectorAll('.theme-btn');
		buttons.forEach(function (btn) {
			if (btn.getAttribute('data-theme') === selectedTheme) {
				btn.classList.add('active');
			}
			else {
				btn.classList.remove('active');
			}
		});
	});
});