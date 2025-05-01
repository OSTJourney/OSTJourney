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

def format_duration(seconds, mode):
	months, seconds = divmod(seconds, 2592000)
	weeks, seconds = divmod(seconds, 604800)
	days, seconds = divmod(seconds, 86400)
	hours, seconds = divmod(seconds, 3600)
	minutes, seconds = divmod(seconds, 60)

	months += weeks // 4
	weeks = weeks % 4

	duration_parts = []

	def add(unit_value, full, short, plural_suffix='s'):
		if unit_value > 0:
			is_plural = unit_value > 1
			if mode == 0:
				label = f"{full}{plural_suffix if is_plural else ''}"
				duration_parts.append(f"{round(unit_value)} {label}")
			else:
				label = short
				# exceptions: if only seconds are present and minutes are zero
				if label == "s" and minutes == 0 and not any([months, weeks, days, hours]):
					label = f"second{plural_suffix if is_plural else ''}"
					duration_parts.append(f"{round(unit_value)} {label}")
				else:
					duration_parts.append(f"{round(unit_value)}{label}")

	add(months, "month", "m")
	add(weeks, "week", "w")
	add(days, "day", "d")
	add(hours, "hour", "h")
	add(minutes, "minute", "min")
	add(seconds, "second", "s")

	if not duration_parts:
		return "0 seconds" if mode == 0 else "0s"

	return ', '.join(duration_parts)



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