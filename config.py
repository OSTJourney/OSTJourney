class Config:
	SECRET_KEY = ""
	SQLALCHEMY_DATABASE_URI = 'sqlite:///songs.db'
	SQLALCHEMY_BINDS = {
		'users': 'sqlite:///users.db'
	}
	SQLALCHEMY_TRACK_MODIFICATIONS = False
