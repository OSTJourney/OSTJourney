import json
from datetime import datetime, timedelta
from sqlalchemy import func

from flask import abort, Blueprint, current_app, render_template, request, send_from_directory, session

from app import songs_dir
from app.app_utils import commit_data, format_duration
from app.config import BUILD, BRANCH, COPYRIGHT, REPO_NAME, REPO_OWNER, REPO_URL
from .models import db, ListeningHistory, LogAdditions, Songs, User, UserToken

various_bp = Blueprint('various', __name__)

@various_bp.route('/')
def index():
	song_id = request.args.get("song")
	listened_count = None

	if not song_id:
		return render_template('index.html')

	song = Songs.query.get(song_id)
	if not song:
		return render_template('index.html', error="Song not found")

	user_id = session.get('user_id')
	if user_id:
		listened_count = db.session.query(func.count(ListeningHistory.id)).filter_by(
			user_id=user_id,
			song_id=song_id
		).scalar()

	if isinstance(song.tags, str):
		song.tags = json.loads(song.tags)

	cover_image = song.cover if song.cover and song.cover.strip() else "null"

	if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
		return render_template('song.html', song=song, listened_count=listened_count, currentUrl=request.url, title=song.title)

	return render_template('base.html', 
							content=render_template('song.html', 
								song=song, 
								listened_count=listened_count), 
						   title=song.title, 
						   icon=f"/static/images/covers/{cover_image}.jpg")

@various_bp.route('/latest')
def latest():
	additions = db.session.query(LogAdditions).order_by(LogAdditions.id.desc()).all()
	for addition in additions:
		addition.duration = format_duration(db.session.query(func.sum(Songs.duration)).filter(Songs.id >= addition.first_id, Songs.id <= addition.last_id).scalar())
	if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
		return render_template('latest.html', additions=additions)
	return render_template('base.html', content=render_template('latest.html', additions=additions), title="Latest Additions", currentUrl="/latest")

@various_bp.route('/stats')
def stats():
	user_count = db.session.query(func.count(User.id)).scalar()
	listening_count = db.session.query(func.sum(User.total_songs)).scalar()
	listening_duration = format_duration(db.session.query(func.sum(User.total_duration)).scalar())

	lim = datetime.utcnow() - timedelta(seconds=70)
	active_users = db.session.query(UserToken).filter(UserToken.last_ping > lim).all()
	if request.args.get('json'):
		return {
			'user_count': user_count,
			'active_users': len(active_users),
			'listening_count': listening_count,
			'listening_duration': listening_duration,
		}
	song_count = current_app.config['SONGS_COUNT']
	duration_count = current_app.config['SONGS_DURATION']
	if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
		return render_template('stats.html', user_count=user_count, listening_count=listening_count, listening_duration=listening_duration, song_count=song_count, duration_count=duration_count, active_users=len(active_users))
	return render_template('base.html', content=render_template('stats.html', user_count=user_count, listening_count=listening_count, listening_duration=listening_duration, song_count=song_count, duration_count=duration_count, active_users=len(active_users)), title="Statistics", currentUrl="/stats")

@various_bp.route('/robots.txt')
def robots():
	return send_from_directory('../static', 'robots.txt')

@various_bp.route('/sitemap.xml')
def sitemap():
	return send_from_directory('../static', 'sitemap.xml')

@various_bp.route('/nav')
def nav():
	if request.headers.get('X-Requested-With') != 'XMLHttpRequest':
		abort(404)
	return render_template('nav.html')

@various_bp.route('/footer')
def footer():
	if request.headers.get('X-Requested-With') != 'XMLHttpRequest':
		abort(404)
	return render_template('footer.html', commit_data=commit_data, build=BUILD, repo_owner=REPO_OWNER, repo_name=REPO_NAME, repo_url=REPO_URL, branch=BRANCH, copy_right=COPYRIGHT)

@various_bp.route('/songs/<path:filename>')
def media(filename):
	return send_from_directory(songs_dir, filename)
