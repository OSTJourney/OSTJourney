from datetime import datetime, timedelta
import re
from flask import Flask, render_template, url_for, request, redirect, flash, session, send_from_directory, make_response
from itsdangerous import URLSafeTimedSerializer
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from secret import key
import uuid

app = Flask(__name__)
app.secret_key = key

serializer = URLSafeTimedSerializer(app.secret_key)

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

	listening_history = db.relationship('ListeningHistory', back_populates='user', lazy='dynamic')
	listening_sessions = db.relationship('ListeningSession', back_populates='user', lazy='dynamic')

	def __repr__(self):
		return f'<User {self.username}>'

class ListeningHistory(db.Model):
	__bind_key__ = 'users'
	id = db.Column(db.Integer, primary_key=True)
	user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
	song_id = db.Column(db.Integer, nullable=False)
	listen_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
	duration_seconds = db.Column(db.Integer, nullable=True)

	user = db.relationship('User', back_populates='listening_history')

	def __repr__(self):
		return f'<ListeningHistory {self.id}: User {self.user_id} listened to Song {self.song_id} at {self.listen_time}>'

class ListeningSession(db.Model):
	__bind_key__ = 'users'
	id = db.Column(db.Integer, primary_key=True)
	user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
	song_id = db.Column(db.Integer, nullable=False)
	start_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
	expiration_time = db.Column(db.DateTime, nullable=False)

	user = db.relationship('User', back_populates='listening_sessions')

	def __repr__(self):
		return f'<ListeningSession {self.id}: User {self.user_id} Song {self.song_id}>'

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
	if 'user' in session:
		return render_template('index.html', error="You are already logged in.")
	
	if request.method == 'POST':
		username = request.form.get('username').strip()
		email = request.form.get('email').strip()
		password = request.form.get('password')
		confirm_password = request.form.get('confirm_password')

		username_pattern = r'^[a-zA-Z0-9_]{3,20}$'
		if not re.match(username_pattern, username):
			return render_template('register.html', error="Invalid username.", username=username, email=email)

		if password != confirm_password:
			return render_template('register.html', error="Passwords do not match.", username=username, email=email)

		password_pattern = r'^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};\'\\|,.<>\/?]).{8,20}$'
		if not re.match(password_pattern, password):
			return render_template('register.html', error="Invalid password.", username=username, email=email)

		email_pattern = r'([-!#-\'*+/-9=?A-Z^-~]+(\.[-!#-\'*+/-9=?A-Z^-~]+)*|"([]!#-[^-~ \t]|(\\[\t -~]))+")@[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?(\.[0-9A-Za-z]([0-9A-Za-z-]{0,61}[0-9A-Za-z])?)+'
		if not re.match(email_pattern, email):
			return render_template('register.html', error="Invalid email.", username=username, email=email)

		existing_user = User.query.filter_by(username=username).first()
		if existing_user:
			return render_template('register.html', error="Username already exists.", email=email)

		existing_email = User.query.filter_by(email=email).first()
		if existing_email:
			return render_template('register.html', error="Email already exists.", username=username)

		hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=8)
		new_user = User(username=username, email=email, password=hashed_password)
		db.session.add(new_user)
		db.session.commit()

		flash("Account created successfully!", "success")
		return redirect(url_for('login'))

	if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
		return render_template('register.html')
	else:
		return render_template('base.html', content=render_template('register.html'))

@app.route('/login', methods=['GET', 'POST'])
def login():
	if 'user' in session:
		if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
			return render_template('profile.html', user=session['user'], email=session['email'], created_at=session['created_at'])
		else:
			return redirect(url_for('profile'))
	
	if request.method == 'POST':
		email = request.form.get('email').strip()
		password = request.form.get('password')

		if not email or not password:
			return render_template('login.html', error="Please fill in all fields.", email=email)

		user = User.query.filter_by(email=email).first()
		if user and check_password_hash(user.password, password):
			session['user_id'] = user.id
			session['user'] = user.username
			session['email'] = user.email
			session['created_at'] = user.created_at

			token = serializer.dumps({'user_id': user.id})
			user_token = str(uuid.uuid4())
			response = make_response(redirect(url_for('profile')))
			response.set_cookie('session_token', token, max_age=3600*24, httponly=True)
			response.set_cookie('user_token', user_token, max_age=86400, httponly=True)

			return response
		elif user:
			return render_template('login.html', error="Invalid password.", email=email)
		else:
			return render_template('login.html', error="Invalid email.", email=email)
	
	if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
		return render_template('login.html')
	else:
		return render_template('base.html', content=render_template('login.html'))

@app.route('/logout')
def logout():
	if 'user' in session:
		session.pop('user_id', None)
		session.pop('user', None)
		session.pop('email', None)
		session.pop('created_at', None)
		response = make_response(redirect(url_for('login')))
		response.delete_cookie('session_token')
		response.delete_cookie('user_token')
		return response
	else:
		return redirect(url_for('login'))

@app.route('/profile')
def profile():
	if 'user' in session:
		token = request.cookies.get('session_token')
		if not token:
			return redirect(url_for('login'))

		try:
			user_data = serializer.loads(token)
			user_id = user_data['user_id']
		except:
			return redirect(url_for('login'))

		user = User.query.get(user_id)
		if not user:
			return redirect(url_for('login'))

		listening_history = ListeningHistory.query.filter_by(user_id=user_id).all()
		total_duration = sum([history.duration_seconds for history in listening_history if history.duration_seconds])

		songs_list = []
		for history in listening_history:
			song = Songs.query.get(history.song_id)
			if song:
				songs_list.append({
					'song_id': song.id,
					'title': song.title,
					'artist': song.artist,
					'duration': song.duration
				})

		if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
			return render_template('profile.html', username=user.username, email=user.email, created_at=user.created_at, user_id=user.id, total_duration=total_duration, songs_list=songs_list)

		return render_template('base.html', content=render_template('profile.html', username=user.username, email=user.email, created_at=user.created_at, user_id=user.id, total_duration=total_duration, songs_list=songs_list))
	else:
		if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
			return render_template('login.html')
		else:
			return render_template('base.html', content=render_template('login.html'))

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

@app.route('/api/music/start', methods=['POST'])
def start_music():
	data = request.get_json()
	song_id = data.get('song_id')

	if not song_id:
		return {'status': 'error', 'message': 'Song ID is required'}

	token = request.cookies.get('session_token')
	if not token:
		return {'status': 'error', 'message': 'User not logged in'}

	try:
		user_data = serializer.loads(token)
		user_id = user_data['user_id']
	except Exception:
		return {'status': 'error', 'message': 'Invalid or expired session token'}

	song = Songs.query.get(song_id)
	if not song:
		return {'status': 'error', 'message': 'Song not found'}

	existing_session = ListeningSession.query.filter_by(user_id=user_id, song_id=song_id).first()
	if existing_session:
		db.session.delete(existing_session)
		db.session.commit()

	active_sessions = ListeningSession.query.filter_by(user_id=user_id).all()
	if len(active_sessions) >= 3:
		oldest_session = min(active_sessions, key=lambda s: s.start_time)
		db.session.delete(oldest_session)
		db.session.commit()

	max_duration = song.duration * 5
	new_session = ListeningSession(
		user_id=user_id,
		song_id=song_id,
		start_time=datetime.utcnow(),
		expiration_time=datetime.utcnow() + timedelta(seconds=max_duration)
	)

	db.session.add(new_session)
	db.session.commit()

	return {'status': 'success', 'message': 'Music started and listening session recorded'}

@app.route('/api/music/end', methods=['POST'])
def end_music():
	data = request.get_json()
	song_id = data.get('song_id')

	if not song_id:
		return {'status': 'error', 'message': 'Song ID is required'}

	token = request.cookies.get('session_token')
	if not token:
		return {'status': 'error', 'message': 'User not logged in'}

	try:
		user_data = serializer.loads(token)
		user_id = user_data['user_id']
	except Exception:
		return {'status': 'error', 'message': 'Invalid or expired session token'}

	song = Songs.query.get(song_id)
	if not song:
		return {'status': 'error', 'message': 'Song not found'}

	listening_session = ListeningSession.query.filter_by(user_id=user_id, song_id=song_id).first()
	if not listening_session:
		return {'status': 'error', 'message': 'Listening session not found'}

	if datetime.utcnow() > listening_session.expiration_time:
		db.session.delete(listening_session)
		db.session.commit()
		return {'status': 'error', 'message': 'Listening session has expired'}

	duration_seconds = song.duration

	listening_history = ListeningHistory(
		user_id=user_id,
		song_id=song_id,
		listen_time=listening_session.start_time,
		duration_seconds=duration_seconds
	)

	db.session.add(listening_history)
	db.session.delete(listening_session)
	db.session.commit()

	return {'status': 'success', 'message': 'Listening session ended'}

if __name__ == '__main__':
	with app.app_context():
		db.create_all()
	app.run(debug=True)
