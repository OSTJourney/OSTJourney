from datetime import datetime
from . import db

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

class LogAdditions(db.Model):
	id = db.Column(db.Integer, primary_key=True)
	year = db.Column(db.Integer)
	month = db.Column(db.Integer)
	day = db.Column(db.Integer)
	first_id = db.Column(db.Integer)
	last_id = db.Column(db.Integer)
	comment = db.Column(db.Text)

	def __repr__(self):
		return f'<LogAddition {self.id}: {self.comment}>'

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

class UserToken(db.Model):
	__bind_key__ = 'users'
	id = db.Column(db.String(255), primary_key=True)
	last_ping = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

	def __repr__(self):
		return f'<UserToken {self.id} last pinged at {self.last_ping}>'

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

class ListeningStatistics(db.Model):
	__bind_key__ = 'users'
	id = db.Column(db.Integer, primary_key=True)
	user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
	hour = db.Column(db.Integer, nullable=False)
	listen_count = db.Column(db.Integer, default=0, nullable=False)

	user = db.relationship('User', backref=db.backref('listening_statistics', lazy=True))

	def __repr__(self):
		return f'<ListeningStatistics User {self.user_id} Hour {self.hour}: {self.listen_count} listens>'

class BlacklistedIP(db.Model):
	__bind_key__ = 'users'
	id = db.Column(db.Integer, primary_key=True)
	ip_address = db.Column(db.String(45), unique=True, nullable=False)
	banned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

	def __repr__(self):
		return f'<BlacklistedIP {self.ip_address}>'