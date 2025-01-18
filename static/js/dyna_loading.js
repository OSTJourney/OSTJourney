const navDiv = document.getElementById('nav-container');
let currentUrl = window.location.href;
const contentDiv = document.getElementById('content');

function fetchNav() {
	fetch("/nav", {
		headers: {
			'X-Requested-With': 'XMLHttpRequest'
		}
	})
	.then(response => {
		if (!response.ok) {
			throw new Error('Network response was not ok');
		}
		return response.text();
	})
	.then(html => {
		navDiv.innerHTML = html;
	})
	.catch(error => {
		console.error('Error loading navbar:', error);
	});
}

function executeScripts(container) {
	const forms = container.querySelectorAll('form');
	getForms(forms);
	const scripts = container.querySelectorAll('script[src]');
	scripts.forEach(script => {
		const scriptSrc = script.getAttribute('src');
		fetch(scriptSrc)
			.then(response => response.text())
			.then(scriptContent => {
				try {
					eval(scriptContent);
				} catch (e) {
					console.error('Error executing script:', e);
				}
			})
			.catch(error => {
				console.error('Error loading script:', error);
			});
	});
}

function updatePage(url, html, mode) {
	contentDiv.innerHTML = html;
	fetchNav();
	currentUrl = document.getElementById('currentUrl').textContent || url;
	if (mode === 'replace') {
		history.replaceState(null, '', currentUrl);
	} else {
		history.pushState(null, '', currentUrl);
	}
	executeScripts(contentDiv);
}

document.addEventListener('DOMContentLoaded', function () {
	try {
		currentUrl = document.getElementById('currentUrl').textContent || currentUrl;
		history.replaceState(null, '', currentUrl);
	} catch (e) {
		console.error('Error getting current URL (ignore if index):', e);
	}

	fetchNav();

	document.addEventListener('click', function (e) {
		const link = e.target.closest('a');
		if (link) {
			e.preventDefault();
			const url = link.href;
			if (new URL(url).pathname === '/') {
				contentDiv.innerHTML = '';
				history.pushState(null, '', url);
			} else {
				fetch(url, {
					headers: {
						'X-Requested-With': 'XMLHttpRequest'
					}
				})
				.then(response => {
					if (!response.ok) {
						throw new Error('Network response was not ok');
					}
					return response.text();
				})
				.then(html => {
					updatePage(url, html, 'push');
				})
				.catch(error => console.error('Fetch error:', error));
			}
		}
	});

	window.addEventListener('popstate', function () {
		const url = window.location.href;
		if (new URL(url).pathname === '/') {
			contentDiv.innerHTML = '';
		} else {
			fetch(url, {
				headers: {
					'X-Requested-With': 'XMLHttpRequest'
				}
			})
			.then(response => response.text())
			.then(html => {
				updatePage(url, html, 'replace');
			})
			.catch(error => {
				console.error('Fetch error on popstate:', error);
			});
		}
	});
	const forms = document.querySelectorAll('form');
	getForms(forms);
});

function getForms(forms) {
	forms.forEach(function (form) {
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			const formData = new FormData(form);
			fetch(form.action, {
				method: form.method,
				body: formData,
				headers: {
					'X-Requested-With': 'XMLHttpRequest'
				}
			})
			.then(response => {
				if (!response.ok) {
					throw new Error('Network response was not ok' + response.statusText);
				}
				return response.text();
			})
			.then(html => {
				updatePage(form.action, html, 'push');
			})
			.catch(error => {
				console.error('Fetch error:', error);
			});
		});
	});
}
