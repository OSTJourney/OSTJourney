from datetime import date, datetime, timedelta

import re

from flask import Blueprint, jsonify, request, session

from .models import db, ListeningHistory, ListeningSession, ListeningStatistics, Songs, User, UserActivity, UserToken, UserSettings
from .app_utils import format_duration, get_real_ip,get_user_from_token
from .search import SearchGetRawArgs, SearchBuildFilters, SafeInt

api_bp = Blueprint('api', __name__)



@api_bp.route('/api/user_activity', methods=['GET'])
def get_user_activity():
	if 'user' not in session:
		return jsonify({'status': 'error', 'message': 'User not logged in'})

	user_id, error = get_user_from_token()
	if error:
		return jsonify(error)

	activities = UserActivity.query.filter_by(user_id=user_id).all()

	if not activities:
		current_year = date.today().year
		year_data = {
			current_year: {
				'data': {},
				'min_duration': 0,
				'max_duration': 0,
				'min_songs': 0,
				'max_songs': 0
			}
		}

		start_date = datetime(current_year, 1, 1).date()
		end_date = datetime(current_year, 12, 31).date()
		current_date = start_date

		while current_date <= end_date:
			date_str = current_date.strftime('%Y-%m-%d')
			year_data[current_year]['data'][date_str] = {
				'total_duration': 0,
				'total_songs': 0,
				'formatted_duration': '00:00:00'
			}
			current_date += timedelta(days=1)

		return jsonify({
			'status': 'success',
			'year_data': year_data
		})

	activity_by_date = {}
	for activity in activities:
		activity_date = activity.date
		year = activity_date.year
		date_str = activity_date.strftime('%Y-%m-%d')
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
					formatted_duration = format_duration(day_data['total_duration'], 0)
					day_data['formatted_duration'] = formatted_duration

					if day_data['total_duration'] > 0:
						year_data[year]['min_duration'] = min(
							year_data[year]['min_duration'],
							day_data['total_duration']
						)
						year_data[year]['max_duration'] = max(
							year_data[year]['max_duration'],
							day_data['total_duration']
						)
					if day_data['total_songs'] > 0:
						year_data[year]['min_songs'] = min(
							year_data[year]['min_songs'],
							day_data['total_songs']
						)
						year_data[year]['max_songs'] = max(
							year_data[year]['max_songs'],
							day_data['total_songs']
						)
				else:
					day_data = {
						'total_duration': 0,
						'total_songs': 0,
						'formatted_duration': '00:00:00'
					}

				year_data[year]['data'][current_date_str] = day_data

		for key in ['min_duration', 'min_songs', 'max_duration', 'max_songs']:
			if year_data[year][key] == float('inf'):
				year_data[year][key] = 0

	return jsonify({'status': 'success', 'year_data': year_data})


@api_bp.route('/api/songs/<int:id>', methods=['GET'])
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

@api_bp.route('/api/songs', methods=['GET'])
def get_songs():
	ids = request.args.getlist('ids')
	if not ids:
		song_count = Songs.query.count()
		return jsonify({'song_count': song_count})
	if len(ids) > 25:
		return jsonify({'error': 'Too many IDs provided'}), 400
	song_ids = [int(id) for id in ids]
	songs = Songs.query.filter(Songs.id.in_(song_ids)).all()
	return jsonify([{
	'id': song.id,
		'title': song.title,
		'artist': song.artist,
		'album': song.album,
		'cover': song.cover,
		'duration': song.duration,
	} for song in songs])

@api_bp.route('/api/music/start', methods=['POST'])
def start_music():
	data = request.get_json()
	song_id = data.get('song_id')

	if not song_id:
		return {'status': 'error', 'message': 'Song ID is required'}

	user_id, error = get_user_from_token()
	if error:
		return error

	song = db.session.get(Songs, song_id)
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
		start_time=datetime.now(),
		expiration_time=datetime.now() + timedelta(seconds=max_duration)
	)

	db.session.add(new_session)
	db.session.commit()

	return {'status': 'success', 'message': 'Music started and listening session recorded'}

@api_bp.route('/api/music/end', methods=['POST'])
def end_music():
	data = request.get_json()
	song_id = data.get('song_id')

	if not song_id:
		return {'status': 'error', 'message': 'Song ID is required'}

	user_id, error = get_user_from_token()
	if error:
		return error

	listening_session = ListeningSession.query.filter_by(user_id=user_id, song_id=song_id).first()
	if not listening_session:
		return {'status': 'error', 'message': 'Listening session not found'}

	song = db.session.query(Songs).get(song_id)
	if not song:
		return {'status': 'error', 'message': 'Song not found'}

	if listening_session.expiration_time and datetime.now() > listening_session.expiration_time:
		db.session.delete(listening_session)
		db.session.commit()
		return {'status': 'error', 'message': 'Listening session has expired'}

	if datetime.now() < listening_session.start_time + timedelta(seconds=song.duration - 3):
		db.session.delete(listening_session)
		db.session.commit()
		return {'status': 'error', 'message': 'Listening session is too short'}

	duration_seconds = song.duration

	listening_history = ListeningHistory(
		user_id=user_id,
		song_id=song_id,
		listen_time=listening_session.start_time,
		duration_seconds=duration_seconds
	)

	db.session.add(listening_history)

	user = db.session.query(User).get(user_id)
	user.total_songs += 1
	user.total_duration += duration_seconds

	current_date = datetime.now().date()
	activity = UserActivity.query.filter_by(user_id=user_id, date=current_date).first()

	if not activity:
		activity = UserActivity(user_id=user_id, date=current_date)
		db.session.add(activity)

	activity.total_duration = (activity.total_duration or 0) + duration_seconds
	activity.total_songs = (activity.total_songs or 0) + 1

	start_hour = listening_session.start_time.hour
	listening_stat = ListeningStatistics.query.filter_by(user_id=user_id, hour=start_hour).first()

	if not listening_stat:
		listening_stat = ListeningStatistics(user_id=user_id, hour=start_hour, listen_count=0)
		db.session.add(listening_stat)

	listening_stat.listen_count += 1

	db.session.delete(listening_session)
	db.session.commit()

	return {'status': 'success', 'message': 'Listening session ended and data updated'}


@api_bp.route('/api/latest', methods=['GET'])
def get_latest():
	user_id, error = get_user_from_token()
	if error:
		return error
	latest_session = ListeningSession.query.filter_by(user_id=user_id).order_by(ListeningSession.start_time.desc()).first()
		
	if latest_session:
		return jsonify({'latest_session_id': latest_session.song_id})
	else:
		return jsonify({'error': 'No listening session found for the user'}), 404
	
@api_bp.route('/api/get_songs', methods=['GET'])
def get_songs_api():
	start = request.args.get('start', 0, type=int)
	end = request.args.get('end', 25, type=int)
	if start < 0 or end <= start or end - start > 50:
		return jsonify({'error': 'Invalid range'}), 400
	songs = Songs.query.slice(start, end).all()
	songs_list = []
	for song in songs:
		songs_list.append({
			'id': song.id,
			'title': song.title,
			'artist': song.artist,
			'cover': song.cover,
			'duration': format_duration(song.duration, 0),
		})
	return jsonify({'songs': songs_list})

@api_bp.route('/api/ping', methods=['POST'])
def ping():
	data = request.get_json()
	token = data.get('token')
	if not token:
		return {'status': 'error', 'message': 'Token is required'}

	ip = get_real_ip()
	if not ip:
		return {'status': 'error', 'message': 'IP not found'}

	expiration_time = datetime.utcnow() - timedelta(minutes=30)
	db.session.query(UserToken)\
		.filter(UserToken.last_ping < expiration_time)\
		.delete()
	db.session.commit()

	user_token = db.session.query(UserToken).filter_by(id=token).first()

	if not user_token:
		active_token_count = db.session.query(UserToken)\
			.filter(UserToken.ip == ip)\
			.count()

		if active_token_count >= 5:
			return {'status': 'error', 'message': 'Too many active tokens from this IP'}

		user_token = UserToken(id=token, ip=ip)
		db.session.add(user_token)

	user_token.ip = ip
	user_token.last_ping = datetime.utcnow()
	db.session.commit()

	return {'status': 'success', 'message': 'Ping successful'}

@api_bp.route('/api/search', methods=['GET'])
def search():
	raw = SearchGetRawArgs()

	try:
		min_t = SafeInt(raw['min'])
		max_t = SafeInt(raw['max'])
	except ValueError:
		return jsonify(status='error', message="'min' and 'max' must be integers"), 400

	text_fields = ('query', 'title', 'artist', 'album')
	has_valid_text_field = any(len(raw[k]) > 1 for k in text_fields if raw[k])
	if not has_valid_text_field and min_t is None and max_t is None:
		return jsonify(status='error', message='At least one valid search field (query/title/artist/album or min/max) is required'), 400

	for k in text_fields:
		if len(raw[k]) > 500:
			return jsonify(status='error', message=f"'{k}' must be ≤ 500 characters"), 400

	filters = SearchBuildFilters(raw, min_t, max_t)
	songs = Songs.query.filter(*filters).limit(15).all()
	if not songs:
		return jsonify(status='success', message='No songs found'), 200

	def fmt(song):
		return {
			'id':	   song.id,
			'title':	song.title,
			'artist':   song.artist,
			'album':	getattr(song, 'album', None),
			'cover':	song.cover,
			'duration': format_duration(song.duration, 1),
		}

	return jsonify(status='success', songs=[fmt(s) for s in songs]), 200



@api_bp.route('/api/settings', methods=['GET'])
def get_settings():
	user_id, error = get_user_from_token()
	if error:
		return error

	settings = UserSettings.query.filter_by(user_id=user_id).first()
	if not settings:
		return {'status': 'error', 'message': 'User settings not found'}

	return {
		'status': 'success',
		'settings': {
			'enable_rpc': settings.enable_rpc,
			'theme': settings.theme,
			'theme_overrides': settings.color_overrides
		}
	}