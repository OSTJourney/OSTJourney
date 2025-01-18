const form = document.getElementById('register-form');
const usernameField = document.getElementById('username');
const emailField = document.getElementById('email');
const passwordField = document.getElementById('password');
const confirmPasswordField = document.getElementById('confirm_password');
const errorMessageDiv = document.createElement('div');

form.appendChild(errorMessageDiv);

function resetErrors() {
	errorMessageDiv.innerHTML = '';
}

function showError(message) {
	errorMessageDiv.innerHTML += message + '<br>';
}

usernameField.addEventListener('input', function () {
	resetErrors();
	const username = usernameField.value;

	if (username.length < 3 || username.length > 20) {
		showError('Username must be between 3 and 20 characters long.');
	}

	const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
	if (!usernameRegex.test(username)) {
		showError('Username must contain only letters, numbers, and underscores.');
	}
});

emailField.addEventListener('input', function () {
	resetErrors();
	const email = emailField.value;

	const emailRegex = /([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|"(?:[\x21\x23-\x5b\x5d-\x7e]|\\[\x20-\x7e])*")@[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)+/;
	if (!emailRegex.test(email)) {
		showError('Please enter a valid email address.');
	}
});

passwordField.addEventListener('input', function () {
	resetErrors();

	const password = passwordField.value;
	const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':\\|,.<>\/?]).{8,20}/;
	if (!passwordRegex.test(password)) {
		showError('Password must be at least 8 characters long, contain at least one number, one uppercase letter, one lowercase letter, and at least one special character (e.g., !, @, #, $, etc.).');
	}
});

confirmPasswordField.addEventListener('input', function () {
	resetErrors();
	const password = passwordField.value;
	const confirmPassword = confirmPasswordField.value;

	if (password !== confirmPassword) {
		showError('Passwords do not match!');
	}
});
