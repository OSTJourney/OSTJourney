const usernameField = document.getElementById('username');
const emailField = document.getElementById('email');
const passwordField = document.getElementById('password');
const confirmPasswordField = document.getElementById('confirm_password');
const errorMessageDiv = document.createElement('div');
const form = document.getElementById('login-form');

document.getElementById('login-container').appendChild(errorMessageDiv);

function resetErrors() {
	errorMessageDiv.innerHTML = '';
}

function showError(message) {
	errorMessageDiv.innerHTML += message + '<br>';
}

function validateForm() {
	let valid = true;
	resetErrors();

	// Validate username if it exists
	if (usernameField) {
		const username = usernameField.value;
		if (username.length < 3 || username.length > 20) {
			showError('Username must be between 3 and 20 characters long.');
			valid = false;
		}
		const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
		if (!usernameRegex.test(username)) {
			showError('Username must contain only letters, numbers, and underscores.');
			valid = false;
		}
	}

	// Validate email if it exists
	if (emailField) {
		const email = emailField.value;
		const emailRegex = /([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|"(?:[\x21\x23-\x5b\x5d-\x7e]|\\[\x20-\x7e])*")@[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)+/;
		if (!emailRegex.test(email)) {
			showError('Please enter a valid email address.');
			valid = false;
		}
	}

	// Validate password
	const password = passwordField.value;
	const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':\\|,.<>\/?]).{8,40}/;
	if (!passwordRegex.test(password)) {
		showError('Password must be at least 8 characters long, contain at least one number, one uppercase letter, one lowercase letter, and at least one special character (e.g., !, @, #, $, etc.).');
		valid = false;
	}

	// Validate password confirmation
	const confirmPassword = confirmPasswordField.value;
	if (password !== confirmPassword) {
		showError('Passwords do not match!');
		valid = false;
	}

	return valid;
}

addListener(form, 'submit', function (event) {
	if (!validateForm()) {
		event.preventDefault();
	}
});

if (usernameField) {
	addListener(usernameField, 'input', validateForm);
}

if (emailField) {
	addListener(emailField, 'input', validateForm);
}

addListener(passwordField, 'input', validateForm);
addListener(confirmPasswordField, 'input', validateForm);