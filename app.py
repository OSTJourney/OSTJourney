import os

from dotenv import load_dotenv
from flask import current_app
from sqlalchemy import func

from app import create_app, db
from app.models import Songs
from app.app_utils import format_duration

load_dotenv()

app = create_app()

if __name__ == '__main__':
	with app.app_context():
		db.create_all()
		#This values should not change once the app is started so we process them only once to reduce the load on the database
		current_app.songs_count = db.session.query(func.count(Songs.id)).scalar()
		current_app.songs_duration = format_duration(db.session.query(func.sum(Songs.duration)).scalar())

	ssl_cert_path = os.getenv('SSL_CERT_PATH')
	ssl_key_path = os.getenv('SSL_KEY_PATH')
	flask_env = os.getenv('FLASK_ENV')
	flask_port = int(os.getenv('FLASK_PORT', 5000))

	if flask_env == 'production' and ssl_cert_path and ssl_key_path:
		app.run(debug=False, host='0.0.0.0', port=flask_port, ssl_context=(ssl_cert_path, ssl_key_path))
	else:
		app.run(debug=True, host='127.0.0.1', port=flask_port)
