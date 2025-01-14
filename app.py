from datetime import datetime
import re
from flask import Flask, render_template, url_for, request, redirect, flash, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from secret import key

app = Flask(__name__)
app.secret_key = key

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///songs.db'
app.config['SQLALCHEMY_BINDS'] = {
	'users': 'sqlite:///users.db'
}
db = SQLAlchemy(app)

class Songs(db.Model):
	id = db.Column(db.Integer, primary_key=True)
	title = db.Column(db.String(200), nullable=False)
	artist = db.Column(db.String(200), nullable=False)
	duration = db.Column(db.Float)
	tags = db.Column(db.Text)
	path = db.Column(db.String(500))
	album = db.Column(db.String(200))
	cover = db.Column(db.String(200))

	def __repr__(self):
		return f'<Song {self.id}: {self.title} by {self.artist}>'

class User(db.Model):
	__bind_key__ = 'users'
	id = db.Column(db.Integer, primary_key=True)
	username = db.Column(db.String(150), unique=True, nullable=False)
	email = db.Column(db.String(150), unique=True, nullable=False)
	password = db.Column(db.String(200), nullable=False)
	created_at = db.Column(db.DateTime, default=datetime.utcnow)

	def __repr__(self):
		return f'<User {self.username}>'

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
	try:
		with open('static/js/check_password.js', 'r') as js_file:
			check_password_script = js_file.read()
	except FileNotFoundError:
		check_password_script = 'console.error("JavaScript file not found!");'
	if request.method == 'POST':
		username = request.form.get('username')
		email = request.form.get('email')
		password = request.form.get('password')
		confirm_password = request.form.get('confirm_password')

		username_pattern = r'^[a-zA-Z0-9_]{3,20}$'
		if not re.match(username_pattern, username):
			return render_template('register.html', error="Username must be between 3 and 20 characters and can only contain letters, numbers, and underscores.", username=username, email=email, check_password=check_password_script)

		if password != confirm_password:
			return render_template('register.html', error="Passwords do not match.", username=username, email=email, check_password=check_password_script)

		password_pattern = r'^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};\'\\|,.<>\/?]).{8,20}$'
		if not re.match(password_pattern, password):
			return render_template('register.html', error="Password must be at least 8 characters long, contain at least one number, one uppercase letter, one lowercase letter, and at least one special character (e.g., !, @, #, $, etc.).", username=username, email=email, check_password=check_password_script)
		
		email_pattern = r'([-!#-\'*+/-9=?A-Z^-~]+(\.[-!#-\'*+/-9=?A-Z^-~]+)*|"([]!#-[^-~ \t]|(\\[\t -~]))+")@[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)+'
		if not re.match(email_pattern, email):
			return render_template('register.html', error="Invalid email address pattern.", username=username, email=email, check_password=check_password_script)

		existing_user = User.query.filter_by(username=username).first()
		if existing_user:
			return render_template('register.html', error="Username already exists.", email=email, check_password=check_password_script)
		
		if (password != confirm_password):
			return render_template('register.html', error="Passwords do not match.", username=username, email=email, check_password=check_password_script)

		hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=8)
		
		new_user = User(username=username, email=email, password=hashed_password)
		db.session.add(new_user)
		db.session.commit()

		flash("Account created successfully! You can now log in.", "success")
		return redirect(url_for('login'))

	if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
		return render_template('register.html', check_password=check_password_script)
	else:
		return render_template('base.html', content=render_template('register.html', check_password=check_password_script))

@app.route('/login', methods=['GET', 'POST'])
def login():
	if request.method == 'POST':
		username = request.form.get('username')
		password = request.form.get('password')

		user = User.query.filter_by(username=username).first()
		if user and check_password_hash(user.password, password):
			session['user'] = user.username
			flash("Logged in successfully!", "success")
			return redirect(url_for('index'))

		flash("Invalid credentials. Please try again.", "error")
	return render_template('login.html')


@app.route('/logout')
def logout():
	session.pop('user', None)
	flash("Logged out successfully!", "info")
	return redirect(url_for('index'))


@app.route('/api/songs/<int:id>', methods=['GET'])
def get_song(id):
	song = Songs.query.get_or_404(id)
	return {
		'id': song.id,
		'title': song.title,
		'artist': song.artist,
		'album': song.album,
		'cover': song.cover,
		'duration': song.duration,
		'path': song.path,
		'tags': song.tags
	}


@app.route('/songs/<path:filename>')
def media(filename):
	return send_from_directory("/home/server/songs", filename)

if __name__ == "__main__":
	with app.app_context():
		db.create_all()  # Assurez-vous de faire la migration pour prendre en compte les changements
	app.run(debug=True)
