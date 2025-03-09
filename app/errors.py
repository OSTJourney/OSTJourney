from datetime import datetime

from flask import Blueprint, jsonify, render_template

from .models import BlacklistedIP, db
from .app_utils import get_real_ip

errors_bp = Blueprint('errors', __name__)

@errors_bp.errorhandler(429)
def ratelimit_error(e):
	ip_address = get_real_ip()
	blacklisted_ip = BlacklistedIP.query.filter_by(ip_address=ip_address).first()

	if not blacklisted_ip:
		blacklisted_ip = BlacklistedIP(ip_address=ip_address, banned_at=datetime.utcnow())
		db.session.add(blacklisted_ip)
		db.session.commit()

	return jsonify({"success": False, "error": "Too many requests. Try again later."}), 429

@errors_bp.errorhandler(404)
def page_not_found(error):
	return render_template('404.html'), 404

@errors_bp.before_request
def check_blacklist():
	ip_address = get_real_ip()
	blacklisted_ip = BlacklistedIP.query.filter_by(ip_address=ip_address).first()

	if blacklisted_ip:
		return render_template('banned.html', ip_address=ip_address, banned_at=blacklisted_ip.banned_at, ban_id=blacklisted_ip.id)