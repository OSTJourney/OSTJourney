from datetime import datetime, timedelta
import re
from flask import Flask, render_template, url_for, request, redirect, flash, session, send_from_directory, make_response ,jsonify
from itsdangerous import URLSafeTimedSerializer
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import desc, func
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
from app_utils import *
import uuid

app = Flask(__name__)
app.secret_key = Config.SECRET_KEY

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

	total_duration = db.Column(db.Float, default=0)
	total_songs = db.Column(db.Integer, default=0)

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
	
class UserActivity(db.Model):
	__bind_key__ = 'users'
	id = db.Column(db.Integer, primary_key=True)
	user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
	date = db.Column(db.Date, nullable=False)
	total_duration = db.Column(db.Float, default=0)
	total_songs = db.Column(db.Integer, default=0)

	user = db.relationship('User', backref=db.backref('user_activity', lazy=True))

	def __repr__(self):
		return f'<UserActivity {self.user_id} on {self.date}>'

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

		total_listened = user.total_songs
		total_duration_seconds = user.total_duration
		listening_history = ListeningHistory.query.filter_by(user_id=user_id).order_by(desc(ListeningHistory.listen_time)).limit(25).all()

		songs_list = []
		for history in listening_history:
			song = Songs.query.get(history.song_id)
			if song:
				songs_list.append({
					'song_id': song.id,
					'title': song.title,
					'artist': song.artist,
					'duration': format_duration(song.duration)
				})

		total_duration = format_duration(total_duration_seconds)

		if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
			return render_template(
				'profile.html',
				username=user.username,
				email=user.email,
				created_at=user.created_at,
				user_id=user.id,
				total_duration=total_duration,
				total_listened=total_listened,
				songs_list=songs_list
			)

		return render_template(
			'base.html',
			content=render_template(
				'profile.html',
				username=user.username,
				email=user.email,
				created_at=user.created_at,
				user_id=user.id,
				total_duration=total_duration,
				total_listened=total_listened,
				songs_list=songs_list
			)
		)
	else:
		if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
			return render_template('login.html')
		else:
			return render_template('base.html', content=render_template('login.html'))

@app.route('/api/user_activity', methods=['GET'])
def get_user_activity():
	if 'user' in session:
		token = request.cookies.get('session_token')
		if not token:
			return {'status': 'error', 'message': 'User not logged in'}

		try:
			user_data = serializer.loads(token)
			user_id = user_data['user_id']
		except:
			return {'status': 'error', 'message': 'Invalid session token'}

		activities = UserActivity.query.filter_by(user_id=user_id).all()

		activity_by_date = {}
		for activity in activities:
			date = activity.date
			year = date.year
			day = date.day
			date_str = date.strftime('%Y-%m-%d')
			if year not in activity_by_date:
				activity_by_date[year] = {}
			activity_by_date[year][date_str] = {
				'total_duration': activity.total_duration,
				'total_songs': activity.total_songs
			}

		year_data = {}
		for year, year_activities in activity_by_date.items():
			year_data[year] = {
				'data': {},
				'min_duration': float('inf'),
				'max_duration': float('-inf'),
				'min_songs': float('inf'),
				'max_songs': float('-inf')
			}
			for month in range(1, 13):
				for day in range(1, 32):
					try:
						current_date = datetime(year, month, day).date()
						current_date_str = current_date.strftime('%Y-%m-%d')
					except ValueError:
						continue

					if current_date_str in year_activities:
						day_data = year_activities[current_date_str]
					else:
						day_data = {'total_duration': 0, 'total_songs': 0}

					year_data[year]['data'][current_date_str] = day_data
					year_data[year]['min_duration'] = min(year_data[year]['min_duration'], day_data['total_duration'])
					year_data[year]['max_duration'] = max(year_data[year]['max_duration'], day_data['total_duration'])
					year_data[year]['min_songs'] = min(year_data[year]['min_songs'], day_data['total_songs'])
					year_data[year]['max_songs'] = max(year_data[year]['max_songs'], day_data['total_songs'])

		return {'status': 'success', 'year_data': year_data}

	return {'status': 'error', 'message': 'User not logged in'}

@app.route('/profile/history')
def load_more_history():
	if 'user' in session:
		offset = int(request.args.get('offset', 0))
		token = request.cookies.get('session_token')
		if not token:
			return jsonify({'error': 'Unauthorized'}), 401

		try:
			user_data = serializer.loads(token)
			user_id = user_data['user_id']
		except:
			return jsonify({'error': 'Unauthorized'}), 401

		listening_history = ListeningHistory.query.filter_by(user_id=user_id)\
			.order_by(desc(ListeningHistory.listen_time))\
			.offset(offset)\
			.limit(25)\
			.all()

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

		if not songs_list:
			return jsonify({'songs': []})

		return jsonify({'songs': songs_list})

	return jsonify({'error': 'Unauthorized'}), 401

@app.route('/profile/history/24h')
def hourly_history():
	if 'user' in session:
		user_id = session.get('user_id')
		
		data = db.session.query(
			func.strftime('%H', ListeningHistory.listen_time).label('hour'),
			func.count().label('count')
		).filter_by(user_id=user_id) \
			.group_by(func.strftime('%H', ListeningHistory.listen_time)) \
			.order_by(func.strftime('%H', ListeningHistory.listen_time)) \
			.all()

		hourly_counts = {i: 0 for i in range(24)}
		for hour, count in data:
			hourly_counts[int(hour)] = count

		return jsonify({'hourly_counts': hourly_counts})

	return jsonify({'error': 'Unauthorized'}), 401

@app.route('/latest', methods=['GET'])
def get_latest_session():
	if 'user_id' in session:
		user_id = session['user_id']

		latest_session = ListeningSession.query.filter_by(user_id=user_id).order_by(ListeningSession.start_time.desc()).first()
		
		if latest_session:
			return jsonify({'latest_session_id': latest_session.song_id})
		else:
			return jsonify({'error': 'No listening session found for the user'}), 404
	else:
		return jsonify({'error': 'Unauthorized'}), 401


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
		active_sessions.sort(key=lambda s: s.start_time)
		for session in active_sessions[:-2]:
			db.session.delete(session)
		db.session.commit()

	max_duration = min(song.duration * 5, 86400)

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

	listening_session = ListeningSession.query.filter_by(user_id=user_id, song_id=song_id).first()
	if not listening_session:
		return {'status': 'error', 'message': 'Listening session not found'}

	song = Songs.query.get(song_id)
	if not song:
		return {'status': 'error', 'message': 'Song not found'}

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

	user = User.query.get(user_id)
	user.total_songs += 1
	user.total_duration += duration_seconds
	db.session.commit()

	current_date = datetime.utcnow().date()
	activity = UserActivity.query.filter_by(user_id=user_id, date=current_date).first()

	if not activity:
		activity = UserActivity(user_id=user_id, date=current_date)
		db.session.add(activity)

	if activity.total_duration is None:
		activity.total_duration = 0
	if activity.total_songs is None:
		activity.total_songs = 0

	activity.total_duration += duration_seconds
	activity.total_songs += 1

	db.session.commit()

	db.session.delete(listening_session)
	db.session.commit()

	return {'status': 'success', 'message': 'Listening session ended and data updated'}

if __name__ == '__main__':
	with app.app_context():
		db.create_all()
	app.run(debug=True)
