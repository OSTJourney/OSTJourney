import os
import json

from flask import Flask
from flask_limiter import Limiter
from flask_mail import Mail
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

from .app_utils import get_real_ip

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

	# Register blueprints
	from app.api import api_bp
	from app.errors import errors_bp
	from app.session import session_bp
	from app.user import user_bp
	from app.various import various_bp

	app.register_blueprint(api_bp)
	app.register_blueprint(errors_bp)
	app.register_blueprint(session_bp)
	app.register_blueprint(user_bp)
	app.register_blueprint(various_bp)

	return app
