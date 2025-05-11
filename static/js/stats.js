function updateStats() {
	fetch('/stats?json=true')
		.then(response => response.json())
		.then(data => {
			document.getElementById('user-count').textContent = data.user_count;
			document.getElementById('currently-listening').textContent = data.active_users;
			document.getElementById('listening-duration').textContent = data.listening_duration;
			document.getElementById('total-listened').textContent = data.listening_count;

			const currentDate = new Date();
			const hours = currentDate.getHours();
			const minutes = currentDate.getMinutes();
			const seconds = currentDate.getSeconds();

			document.getElementById('last-update-time').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		})
		.catch(error => console.error('Error fetching stats:', error));
}

addListener(document.getElementById('update-stats'), 'click', function() {
	updateStats();
});
