import os

from dotenv import load_dotenv

from livereload import Server
from app import create_app

load_dotenv()

app = create_app()

if __name__ == '__main__':

	ssl_cert_path = os.getenv('SSL_CERT_PATH')
	ssl_key_path = os.getenv('SSL_KEY_PATH')
	flask_env = os.getenv('FLASK_ENV')
	flask_port = int(os.getenv('FLASK_PORT', 5000))

	if flask_env == 'production' and ssl_cert_path and ssl_key_path:
		app.run(debug=False, host='0.0.0.0', port=flask_port, ssl_context=(ssl_cert_path, ssl_key_path))
	else:
		app.jinja_env.auto_reload = True
		app.config['TEMPLATES_AUTO_RELOAD'] = True
		server = Server(app.wsgi_app)
		server.watch('static/css/*.css')
		server.watch('static/js/')
		server.watch('templates/*.html')

		server.serve(host='127.0.0.1', port=flask_port, debug=True)