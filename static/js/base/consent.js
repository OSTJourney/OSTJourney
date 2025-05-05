document.addEventListener("DOMContentLoaded", function() {
	const consentBanner = document.getElementById('consent-banner');
	const acceptBtn = document.getElementById('accept-btn');
	const declineBtn = document.getElementById('decline-btn');

	const consentCookie = document.cookie.indexOf('data_consent=') !== -1;

	if (!consentCookie) {
		consentBanner.style.display = 'block';
	}

	acceptBtn.addEventListener('click', function() {
		document.cookie = "data_consent=true; path=/; max-age=" + 60*60*24*365;
		consentBanner.style.display = 'none';

		if (window.UMAMI_SCRIPT_URL && window.UMAMI_WEBSITE_ID) {
			const script = document.createElement('script');
			script.src = window.UMAMI_SCRIPT_URL;
			script.setAttribute('data-website-id', window.UMAMI_WEBSITE_ID);
			document.head.appendChild(script);
		}
	});

	declineBtn.addEventListener('click', function() {
		document.cookie = "data_consent=false; path=/; max-age=" + 60*60*24*365;
		consentBanner.style.display = 'none';
	});
});
