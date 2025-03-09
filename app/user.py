from flask import Blueprint, jsonify, redirect, render_template, request, session, url_for
from sqlalchemy import desc

from app import email_enabled
from .app_utils import format_duration
from .config import serializer
from .models import db, ListeningHistory, ListeningStatistics, Songs, User

user_bp = Blueprint('user', __name__)

@user_bp.route('/profile')
def profile():
	if 'user' not in session:
		if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
			return render_template('login.html', currentUrl="/login", title="Login", email_enabled=email_enabled)
		return render_template('base.html', content=render_template('login.html', currentUrl="/login", title="Login", email_enabled=email_enabled))

	token = request.cookies.get('session_token')
	if not token:
		return redirect(url_for('various.index'))

	try:
		user_data = serializer.loads(token)
		user_id = user_data.get('user_id')
	except:
		return redirect(url_for('session.logout'))

	user = User.query.get(user_id)
	if not user:
		return redirect(url_for('various.index'))

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
				'duration': format_duration(song.duration),
				'cover': song.cover
			})

	load_button = len(songs_list) == 25
	total_duration = format_duration(total_duration_seconds)
	total_hours = round(total_duration_seconds / 3600, 2)

	if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
		return render_template(
			'profile.html',
			username=user.username,
			email=user.email,
			created_at=user.created_at,
			user_id=user.id,
			total_duration=total_duration,
			total_listened=total_listened,
			songs_list=songs_list,
			load_button=load_button,
			total_hours=total_hours,
			currentUrl="/profile"
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
			songs_list=songs_list,
			load_button=load_button,
			total_hours=total_hours,
			currentUrl="/profile"
		)
	)

@user_bp.route('/profile/history')
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
					'duration': format_duration(song.duration),
					'cover': song.cover
				})

		if not songs_list:
			return jsonify({'songs': []})

		return jsonify({'songs': songs_list})

	return jsonify({'error': 'Unauthorized'}), 401

@user_bp.route('/profile/history/24h')
def hourly_history():
	if 'user' in session:
		user_id = session.get('user_id')

		data = db.session.query(
			ListeningStatistics.hour,
			ListeningStatistics.listen_count
		).filter_by(user_id=user_id).all()

		hourly_counts = {i: 0 for i in range(24)}

		for hour, count in data:
			hourly_counts[hour] = count

		return jsonify({'hourly_counts': hourly_counts})

	return jsonify({'error': 'Unauthorized'}), 401

@user_bp.route('/settings')
def settings():
	if 'user' not in session:
		if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
			return render_template('login.html', currentUrl="/login", title="Login", email_enabled=email_enabled)
		return render_template('base.html', content=render_template('login.html', currentUrl="/login", title="Login", email_enabled=email_enabled))

	token = request.cookies.get('session_token')
	if not token:
		return redirect(url_for('various.index'))

	try:
		user_data = serializer.loads(token)
		user_id = user_data.get('user_id')
	except:
		return redirect(url_for('session.logout'))
	
	if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
		return render_template('settings.html', currentUrl="/settings")
	return render_template('base.html', content=render_template('settings.html'), currentUrl="/settings", title="Settings")