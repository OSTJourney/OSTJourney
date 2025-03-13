document.addEventListener("DOMContentLoaded", function() {
	const consentBanner = document.getElementById('consent-banner');
	const acceptBtn = document.getElementById('accept-btn');
	const declineBtn = document.getElementById('decline-btn');

	const consentCookie = document.cookie.indexOf('data_consent=true') !== -1;

	if (!consentCookie) {
		consentBanner.style.display = 'block';
	}
	acceptBtn.addEventListener('click', function() {
		document.cookie = "data_consent=true; path=/; max-age=" + 60*60*24*365;
		consentBanner.style.display = 'none';

		const script = document.createElement('script');
		script.src = "{{ umami_script_url }}";
		script.setAttribute('data-website-id', "{{ umami_website_id }}");
		document.head.appendChild(script);
	});

	declineBtn.addEventListener('click', function() {
		document.cookie = "data_consent=false; path=/; max-age=" + 60*60*24*365;
		consentBanner.style.display = 'none';
	});
});