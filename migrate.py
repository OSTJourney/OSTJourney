from app import db, User, ListeningHistory, ListeningStatistics
from datetime import datetime

def migrate_listening_statistics():
    users = User.query.all()

    for user in users:
        listening_histories = ListeningHistory.query.filter_by(user_id=user.id).all()

        listens_by_hour = {}

        for history in listening_histories:
            listen_hour = history.listen_time.hour

            if listen_hour not in listens_by_hour:
                listens_by_hour[listen_hour] = 0

            listens_by_hour[listen_hour] += 1

        for hour, listen_count in listens_by_hour.items():
            statistic = ListeningStatistics.query.filter_by(user_id=user.id, hour=hour).first()

            if not statistic:
                statistic = ListeningStatistics(user_id=user.id, hour=hour)

            statistic.listen_count = listen_count
            db.session.add(statistic)

        db.session.commit()
        print(f"Statistiques pour l'utilisateur {user.username} mises à jour.")

    print("Migration des statistiques terminée.")

if __name__ == "__main__":
    from app import app

    with app.app_context():
        migrate_listening_statistics()
