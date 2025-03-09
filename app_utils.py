from itsdangerous import URLSafeTimedSerializer
from flask import current_app
import os

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
