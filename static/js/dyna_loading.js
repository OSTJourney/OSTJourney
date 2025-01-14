document.addEventListener('DOMContentLoaded', function () {
	const links = document.querySelectorAll('nav a');
	const contentDiv = document.getElementById('content');

	links.forEach(link => {
		link.addEventListener('click', function (e) {
			e.preventDefault();
			const url = this.href;

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
					contentDiv.innerHTML = html;
					executeScripts(contentDiv);
					history.pushState(null, '', url);
				})
				.catch(error => console.error('Fetch error:', error));
			}
		});
	});

	window.addEventListener('popstate', function () {
		const currentUrl = window.location.href;
		if (new URL(currentUrl).pathname === '/') {
			contentDiv.innerHTML = '';
		} else {
			fetch(currentUrl, {
				headers: {
					'X-Requested-With': 'XMLHttpRequest'
				}
			})
			.then(response => response.text())
			.then(html => {
				contentDiv.innerHTML = html;
				executeScripts(contentDiv);
			});
		}
	});

	var forms = document.querySelectorAll('form');
	getForms();

	function getForms() {
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
					contentDiv.innerHTML = html;
					executeScripts(contentDiv);
				})
				.catch(error => {
					console.error('Fetch error:', error);
				});
			});
		});
	}

	function executeScripts(container) {
		forms = document.querySelectorAll('form');
		getForms();
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
});

