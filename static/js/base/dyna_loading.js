const navDiv = document.getElementById('nav-container');
const footerDiv = document.getElementById('footer-container');
let currentUrl = window.location.href;
const contentDiv = document.getElementById('content');

const whitelist = [
	/\.jpg$/
];

function clearAllListeners() {
	for (const { element, type, callback, options } of listeners) {
		element.removeEventListener(type, callback, options);
	}
	listeners.length = 0;
}

function fetchNavFooter() {
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
	fetch("/footer", {
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
		footerDiv.innerHTML = html;
	})
	.catch(error => {
		console.error('Error loading footer:', error);
	});
}

function executeScripts(container) {
	const forms = container.querySelectorAll('form');
	getForms(forms);
	const scripts = container.querySelectorAll('script[src]');
	scripts.forEach(script => {
		const scriptSrc = script.getAttribute('src');
		if (scriptSrc) {
			fetch(scriptSrc)
				.then(response => response.text())
				.then(scriptContent => {
					try {
						eval(scriptContent);
					} catch (e) {
						console.error('Error executing script');
					}
				})
				.catch(error => {
					console.error('Error loading script:', error);
				});
		}
	});
}

function updatePage(url, html, mode) {
	clearAllListeners();
	oldScripts = contentDiv.querySelectorAll('script[src]');
	oldScripts.forEach(script => {
		const scriptSrc = script.getAttribute('src');
		if (scriptSrc) {
			script.remove();
		}
	});
	contentDiv.innerHTML = html;
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
		console.log('Error getting current URL (ignore if index):', e);
	}

	fetchNavFooter();

	document.addEventListener('click', function (e) {
		const link = e.target.closest('a');
		if (link) {
			if (whitelist.some(regex => regex.test(link.href)) || link.classList.contains('no-dynamic-load')) {
				return;
			}			
			e.preventDefault();

			const url = new URL(link.href);
			if (url.pathname === '/' && !url.searchParams.has('song')) {
				contentDiv.innerHTML = '';
				history.pushState(null, '', url.href);
			} else {
				fetch(url.href, {
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
					if (url.pathname === '/logout') {
						fetchNavFooter();
					}
					updatePage(url.href, html, 'push');
				})
				.catch(error => console.error('Fetch error:', error));
			}
		}
	});

	window.addEventListener('popstate', function () {
		const url = new URL(window.location.href);
		if (url.pathname === '/' && !url.searchParams.has('song')) {
			contentDiv.innerHTML = '';
		} else {
			fetch(url.href, {
				headers: {
					'X-Requested-With': 'XMLHttpRequest'
				}
			})
			.then(response => response.text())
			.then(html => {
				updatePage(url.href, html, 'replace');
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
				const actionUrl = new URL(form.action, window.location.origin);
				if (actionUrl.pathname === '/login' && form.method.toUpperCase() === 'POST') {
					fetchNavFooter();
				}
				updatePage(form.action, html, 'push');
			})
			.catch(error => {
				console.error('Fetch error:', error);
			});
		});
	});
}
