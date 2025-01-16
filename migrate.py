from app import db, User, ListeningHistory, UserActivity
from datetime import datetime

def migrate_user_data():
	users = User.query.all()

	for user in users:
		total_duration = 0
		total_songs = 0

		histories = ListeningHistory.query.filter_by(user_id=user.id).all()

		activities_by_date = {}

		for history in histories:
			total_duration += history.duration_seconds
			total_songs += 1

			history_date = history.listen_time.date()

			if history_date not in activities_by_date:
				activities_by_date[history_date] = {
					'total_duration': 0,
					'total_songs': 0
				}

			activities_by_date[history_date]['total_duration'] += history.duration_seconds
			activities_by_date[history_date]['total_songs'] += 1

		user.total_duration = total_duration
		user.total_songs = total_songs

		db.session.commit()

		for activity_date, stats in activities_by_date.items():
			activity = UserActivity.query.filter_by(user_id=user.id, date=activity_date).first()

			if not activity:
				activity = UserActivity(user_id=user.id, date=activity_date)

			activity.total_duration = stats['total_duration']
			activity.total_songs = stats['total_songs']

			db.session.add(activity)

		db.session.commit()
		print(f"Activité pour l'utilisateur {user.username} mise à jour.")

	print("Migration des données terminée.")

if __name__ == "__main__":
	from app import app

	with app.app_context():
		migrate_user_data()
