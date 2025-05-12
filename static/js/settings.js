function rgbToHex(rgb) {
	if (rgb.startsWith('#')) return rgb;
	const rgbArr = rgb.replace(/[^\d,]/g, '').split(',');
	const r = parseInt(rgbArr[0]).toString(16).padStart(2, '0');
	const g = parseInt(rgbArr[1]).toString(16).padStart(2, '0');
	const b = parseInt(rgbArr[2]).toString(16).padStart(2, '0');
	return `#${r}${g}${b}`;
}

function hexToRgb(hex) {
	const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
	return `${r}, ${g}, ${b}`;
}

function getCurrentTheme() {
	return document.documentElement.getAttribute('data-theme');
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
		const overrideValue = settings.theme_overrides.find((override) => override.name === variable.name);
		if (overrideValue) {
			colorInput.value = rgbToHex(overrideValue.value);
		} else {
			const computed = getComputedStyle(document.documentElement).getPropertyValue(variable.name).trim();
			colorInput.value = rgbToHex(computed);
		}

		const resetButton = document.createElement('button');
		resetButton.type = 'button';
		resetButton.textContent = 'Reset';

		inputWrapper.appendChild(label);
		inputWrapper.appendChild(colorInput);
		inputWrapper.appendChild(resetButton);
		container.appendChild(inputWrapper);

		addListener(colorInput, 'input', function () {
			const colorHex = colorInput.value;
			const rgbRaw = hexToRgb(colorHex);
			document.documentElement.style.setProperty(variable.name, rgbRaw);
			const existingOverride = settings.theme_overrides.find(item => item.name === variable.name);
			if (existingOverride) {
				existingOverride.value = rgbRaw;
			} else {
				settings.theme_overrides.push({ name: variable.name, value: rgbRaw });}
			overridesInput.value = JSON.stringify(settings.theme_overrides);
		});

		addListener(resetButton, 'click', function () {
			document.documentElement.style.removeProperty(variable.name);
			const current = getComputedStyle(document.documentElement).getPropertyValue(variable.name).trim();
			colorInput.value = rgbToHex(current);
			settings.theme_overrides = settings.theme_overrides.filter(item => item.name !== variable.name);
			overridesInput.value = JSON.stringify(settings.theme_overrides);
		});
	});
}

const settingButtons = document.querySelectorAll('.settings-theme-btn');
const themeInput = document.getElementById('form-theme');
const overridesInput = document.getElementById('form-theme-overrides');

settingButtons.forEach((button) => {
	addListener(button, 'click', function () {
		const selectedTheme = button.dataset.theme;
		document.documentElement.setAttribute('data-theme', selectedTheme);
		const allButtons = document.querySelectorAll('.theme-btn');
		allButtons.forEach(function (btn) {
			if (btn.getAttribute('data-theme') === selectedTheme) {
				btn.classList.add('active');
			}
			else {
				btn.classList.remove('active');
			}
		});
	});
});

function waitForSettingsAndInit() {
	const interval = setInterval(() => {
		if (typeof settings !== 'undefined') {
			clearInterval(interval);
			createColorInputs();
			highlightCurrentTheme();
			themeInput.value = settings.theme;
			overridesInput.value = JSON.stringify(settings.theme_overrides);
		}
	}, 50);
}

waitForSettingsAndInit();

if (window.__themeObserver) {
	window.__themeObserver.disconnect();
	delete window.__themeObserver;
}

window.__themeObserver = new MutationObserver(() => {
	createColorInputs();
	highlightCurrentTheme();
	themeInput.value = getCurrentTheme();
});

window.__themeObserver.observe(document.documentElement, {
	attributes: true,
	attributeFilter: ['data-theme']
});
