from itsdangerous import URLSafeTimedSerializer
from flask import current_app, request
from .config import REPO_OWNER, REPO_NAME, serializer
import os

import requests
import subprocess



def generate_reset_token(email):
	serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
	return serializer.dumps(email, os.getenv("SECURITY_PASSWORD_SALT"))

def verify_reset_token(token, expiration=3600):
	serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
	try:
		email = serializer.loads(token, salt=os.getenv("SECURITY_PASSWORD_SALT"), max_age=expiration)
		return email
	except Exception:
		return None
	
def get_user_from_token():
	token = request.cookies.get('session_token')
	if not token:
		return None, {'status': 'error', 'message': 'User not logged in'}
	try:
		user_data = serializer.loads(token)
		user_id = user_data['user_id']
		return user_id, None
	except Exception:
		return None, {'status': 'error', 'message': 'Invalid session token'}

def get_real_ip():
	return request.headers.get("CF-Connecting-IP", request.remote_addr)

def format_duration(seconds):
	days, seconds = divmod(seconds, 86400)
	hours, seconds = divmod(seconds, 3600)
	minutes, seconds = divmod(seconds, 60)

	duration_parts = []
	if days > 0:
		duration_parts.append(f"{round(days)} day{'s' if days > 1 else ''}")
	if hours > 0:
		duration_parts.append(f"{round(hours)} hour{'s' if hours > 1 else ''}")
	if minutes > 0:
		duration_parts.append(f"{round(minutes)} minute{'s' if minutes > 1 else ''}")
	if seconds > 0:
		duration_parts.append(f"{round(seconds)} second{'s' if seconds > 1 else ''}")

	return ', '.join(duration_parts) if duration_parts else "0 seconds"

def get_commit_from_github():
	try:
		local_commit_hash = subprocess.check_output(["git", "rev-parse", "HEAD"]).strip().decode('utf-8')
		url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/commits/{local_commit_hash}"
		response = requests.get(url)
		response.raise_for_status()
		
		return response.json()
	except Exception as e:
		print(f"Erreur API GitHub: {e}")
		return None
	
commit_data = get_commit_from_github()