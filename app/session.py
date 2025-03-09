import re

from flask import Blueprint, jsonify, make_response, redirect, render_template, request, session, url_for
from flask_mail import Message
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

from app import db, email_enabled, limiter, mail
from .app_utils import generate_reset_token, verify_reset_token, get_real_ip
from .config import serializer
from .models import User

session_bp = Blueprint('session', __name__)

@session_bp.route('/register', methods=['GET', 'POST'])
def register():
	if 'user' in session:
		return redirect(url_for('user.profile'))

	if request.method == 'POST':
		username = request.form.get('username').strip()
		email = request.form.get('email').strip()
		password = request.form.get('password')
		confirm_password = request.form.get('confirm_password')

		username_pattern = r'^[a-zA-Z0-9_]{3,20}$'
		if not re.match(username_pattern, username):
			return render_template('register.html', error="Invalid username.", username=username, email=email, currentUrl="/register")

		if password != confirm_password:
			return render_template('register.html', error="Passwords do not match.", username=username, email=email, currentUrl="/register")

		password_pattern = r'^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};\'\\|,.<>\/?]).{8,40}$'
		if not re.match(password_pattern, password):
			return render_template('register.html', error="Invalid password.", username=username, email=email, currentUrl="/register")

		email_pattern = r'([-!#-\'*+/-9=?A-Z^-~]+(\.[-!#-\'*+/-9=?A-Z^-~]+)*|"([]!#-[^-~ \t]|(\\[\t -~]))+")@[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)+'
		if not re.match(email_pattern, email):
			return render_template('register.html', error="Invalid email.", username=username, email=email, currentUrl="/register")

		existing_user = User.query.filter(func.lower(User.username) == username.lower()).first()
		if existing_user:
			return render_template('register.html', error="Username already exists.", email=email, currentUrl="/register")

		existing_email = User.query.filter_by(email=email).first()
		if existing_email:
			return render_template('register.html', error="Email already exists.", username=username, currentUrl="/register")

		hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=8)
		new_user = User(username=username, email=email, password=hashed_password)
		db.session.add(new_user)
		db.session.commit()

		return render_template('login.html', success="Account created successfully. Please login.", email=email, currentUrl="/login", email_enabled=email_enabled)

	return render_template('base.html', content=render_template('register.html'), currentUrl="/register", title="Register")

@session_bp.route('/login', methods=['GET', 'POST'])
def login():
	if 'user' in session:
		return redirect(url_for('user.profile'))
	if request.method == 'POST':
		email = request.form.get('email').strip()
		password = request.form.get('password')

		if not email or not password:
			return render_template('login.html', error="Please fill in all fields.", email=email, currentUrl="/login", email_enabled=email_enabled)

		user = User.query.filter_by(email=email).first()
		if user and check_password_hash(user.password, password):
			session['user_id'] = user.id
			session['user'] = user.username
			session['email'] = user.email
			session['created_at'] = user.created_at

			token = serializer.dumps({'user_id': user.id})
			response = make_response(redirect(url_for('user.profile')))
			response.set_cookie('session_token', token, max_age=30*24*3600, httponly=True)

			return response
		else:
			return render_template('login.html', error="Invalid email or password.", email=email, currentUrl="/login", email_enabled=email_enabled)
	print("Is email_enabled:", email_enabled)
	return render_template('base.html', content=render_template('login.html', currentUrl="/login", title="Login", email_enabled=email_enabled))

@session_bp.route('/logout')
def logout():
	session.clear()
	response = make_response(redirect(url_for('session.login')))
	response.delete_cookie('session_token')
	return response

@session_bp.route("/reset_password_request", methods=["POST"])
@limiter.limit("5 per hour")
def reset_password_request():
	if not email_enabled:
		return jsonify({"success": False, "error": "Email is not enabled, please contact support."}), 400

	data = request.get_json()
	email = data.get("email")

	if not email:
		return jsonify({"success": False, "error": "Email is required."}), 400

	user = User.query.filter_by(email=email).first()
	if not user:
		return jsonify({"success": False, "error": "This email is not registered."}), 404

	token = generate_reset_token(email)
	reset_url = url_for("session.reset_password", token=token, _external=True)

	if email_enabled:
		msg = Message("Password Reset Request", recipients=[email])
		msg.body = f"Hello, \n\nTo reset your password, click the link below: {reset_url}"
		mail.send(msg)

	return jsonify({"success": True}), 200

@session_bp.route("/reset_password/<token>", methods=["GET", "POST"])
@limiter.limit("3 per hour", methods=["POST"])
def reset_password(token):
	email = verify_reset_token(token)
	if not email or 'user' in session:
		return render_template('base.html', content=render_template('login.html', currentUrl="/login", error="Already logged in or invalid/expired token.", email_enabled=email_enabled))

	if request.method == "POST":
		form_token = request.form.get("token")
		if form_token != token:
			return render_template('base.html', content=render_template('reset_password.html', token=token, error="Invalid token."))

		password = request.form.get("password").strip()
		confirm_password = request.form.get("confirm_password").strip()

		if password != confirm_password:
			return render_template('base.html', content=render_template('reset_password.html', token=token, error="Passwords do not match."))

		password_pattern = r'^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};\'\\|,.<>\/?]).{8,40}$'
		if not re.match(password_pattern, password):
			return render_template('base.html', content=render_template('reset_password.html', token=token, error="Invalid password format."))

		user = User.query.filter_by(email=email).first()
		if user:
			hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=8)
			user.password = hashed_password
			db.session.commit()
			return render_template('login.html', success="Password reset successfully. Please login.", email=email, currentUrl="/login", email_enabled=email_enabled)

	return render_template('base.html', content=render_template('reset_password.html', token=token, currentUrl="/reset_password"))

@session_bp.route('/change_password', methods=['GET', 'POST'])
def change_password():
	if 'user' not in session:
		return redirect(url_for('session.login'))

	user_id = session['user_id']
	user = User.query.get(user_id)

	if request.method == 'POST':
		old_password = request.form.get('old_password')
		new_password = request.form.get('password')
		confirm_password = request.form.get('confirm_password')

		if not old_password or not new_password or not confirm_password:
			return render_template('settings.html', error="Please fill in all fields.")
		if new_password != confirm_password:
			return render_template('settings.html', error="Passwords do not match.")
		if not check_password_hash(user.password, old_password):
			return render_template('settings.html', error="Old password is incorrect.")

		password_pattern = r'^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};\'\\|,.<>\/?]).{8,40}$'
		if not re.match(password_pattern, new_password):
			return render_template('settings.html', error="Invalid password format.")

		hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256', salt_length=8)
		user.password = hashed_password
		db.session.commit()

		ip_address = get_real_ip()
		user_email = user.email

		if email_enabled:
			msg = Message("Password Change Notification", recipients=[user_email])
			msg.body = f"Hello,\n\nYour password has been successfully changed. \n\n If you did not make this change, please contact support immediately.\n\nIP Address: {ip_address}"
			mail.send(msg)
		return render_template('settings.html', success="Password changed successfully.")

	return render_template('settings.html', currentUrl="/settings")
