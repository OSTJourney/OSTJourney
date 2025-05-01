import os
import json

from dotenv import load_dotenv
from flask import Flask, render_template, request
from flask_limiter import Limiter
from flask_mail import Mail
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func

from .app_utils import format_duration, get_real_ip

load_dotenv()

db = SQLAlchemy()
mail = Mail()
email_enabled = os.getenv('EMAIL_ENABLED', 'false').lower() == 'true'

limiter = Limiter(
	key_func=get_real_ip,
	default_limits=[]
)

songs_dir = "../songs"

def create_app():
	app = Flask(__name__,
				static_folder="../static",
				template_folder="../templates")

	# General configuration
	app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
	app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
	binds = os.getenv('SQLALCHEMY_BINDS')
	app.config['SQLALCHEMY_BINDS'] = json.loads(binds) if binds else {}

	# Mail configuration
	if email_enabled:
		app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
		app.config['MAIL_PORT'] = os.getenv('MAIL_PORT')
		app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

	# Initialize extensions
	db.init_app(app)
	mail.init_app(app)
	limiter.init_app(app)

	with app.app_context():
		db.create_all()
		from .models import Songs

		#This values should not change once the app is started so we process them only once to reduce the load on the database
		app.config['SONGS_COUNT'] = db.session.query(func.count(Songs.id)).scalar()
		app.config['SONGS_DURATION'] = format_duration(db.session.query(func.sum(Songs.duration)).scalar(), 0)

	# Register blueprints
	from app.api import api_bp
	from app.errors import errors_bp, ratelimit_error, page_not_found  # Import the error handler functions
	from app.session import session_bp
	from app.user import user_bp
	from app.various import various_bp

	app.register_blueprint(api_bp)
	app.register_blueprint(errors_bp)
	app.register_blueprint(session_bp)
	app.register_blueprint(user_bp)
	app.register_blueprint(various_bp)

	# Error handling
	app.register_error_handler(429, ratelimit_error)
	app.register_error_handler(404, page_not_found)

	@app.before_request
	def check_blacklist():
		from app.models import BlacklistedIP

		if request.path == "/static/images/various/banned.webp":
			return  

		ip_address = get_real_ip()
		blacklisted_ip = BlacklistedIP.query.filter_by(ip_address=ip_address).first()

		if blacklisted_ip:
			return render_template('banned.html', ip_address=ip_address, banned_at=blacklisted_ip.banned_at, ban_id=blacklisted_ip.id)


	# Inject Umami tracking variables if they are set
	@app.context_processor
	def inject_umami():
		return {
			"umami_script_url": os.getenv("UMAMI_SCRIPT_URL"),
			"umami_website_id": os.getenv("UMAMI_WEBSITE_ID"),
			"umami_stats_url": os.getenv("UMAMI_PUB_STATS_URL")
		}

	return app
