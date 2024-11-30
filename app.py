from flask import Flask, render_template, url_for, request, redirect, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///songs.db'
db = SQLAlchemy(app)

class Songs(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200), nullable=False)
    duration = db.Column(db.Float)
    tags = db.Column(db.Text)
    path = db.Column(db.String(500))
    album = db.Column(db.String(200))
    cover = db.Column(db.String(200))

    def __repr__(self):
        return f'<Songs {self.id}: {self.title} by {self.artist}>'

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/a', methods=['GET'])
def indexx():
    return render_template('index.html')

@app.route('/api/songs/<int:id>', methods=['GET'])
def get_song(id):
    song = Songs.query.get_or_404(id)
    return {
        'id': song.id,
        'title': song.title,
        'artist': song.artist,
        'album': song.album,
        'cover': song.cover,
        'duration': song.duration,
        'path': song.path,
        'tags': song.tags
    }

@app.route('/songs/<path:filename>')
def media(filename):
    return send_from_directory("/home/server/songs", filename)

if __name__ == "__main__":
    app.run(debug=True)

