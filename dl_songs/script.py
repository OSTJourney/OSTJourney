import os
import re
import traceback
import yt_dlp
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, TIT2, TPE1, TALB, APIC
import eyed3

TEMP_FOLDER = "temp"
OUTPUT_FOLDER = "output"
FAILED_FILE = "failed.txt"
URL_LIST_FILE = "list.txt"

def sanitize_filename(name):
	"""Removes special characters from filenames."""
	name = re.sub(r'[<>:"/\\|?*]', '', name)
	name = re.sub(r'\s+', '_', name)
	return name.strip('_')

def clean_temp_folder():
	"""Removes all files in the temporary folder."""
	for file in os.listdir(TEMP_FOLDER):
		os.remove(os.path.join(TEMP_FOLDER, file))

def add_cover(mp3_file, cover_path):
	"""Adds a cover image to the MP3 file."""
	audio = MP3(mp3_file, ID3=ID3)
	if os.path.exists(cover_path):
		with open(cover_path, 'rb') as img:
			audio.tags["APIC"] = APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=img.read())
	audio.save()
	print(f"✅ Metadata added to {mp3_file}")

def get_metadata_from_mp3(mp3_file):
	"""Extracts metadata (title, artist, album) from an MP3 file."""
	audio = eyed3.load(mp3_file)
	if audio.tag is None:
		audio.initTag()
		audio.tag.save()
	title = audio.tag.title if audio.tag.title else "Unknown Title"
	artist = audio.tag.artist if audio.tag.artist else "Unknown Artist"
	album = audio.tag.album if audio.tag.album else "Unknown Album"
	return title, artist, album


def download_song(url):
	"""Downloads a song from the given URL, ensures it's MP3, and organizes it."""
	os.makedirs(TEMP_FOLDER, exist_ok=True)

	ydl_opts = {
		'format': 'bestaudio/best',
		'outtmpl': f'{TEMP_FOLDER}/%(title)s.%(ext)s',
		'postprocessors': [
			{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'},
			{'key': 'FFmpegMetadata'}
		],
		'writethumbnail': True,
		'writemetadata': True,
		'quiet': True,
		'no_warnings': True
	}

	try:
		with yt_dlp.YoutubeDL(ydl_opts) as ydl:
			info = ydl.extract_info(url, download=True)

		# Extract metadata from the MP3 file (after download)
		for file in os.listdir(TEMP_FOLDER):
			if file.endswith(".mp3"):
				mp3_file = os.path.join(TEMP_FOLDER, file)

				# Get metadata from the MP3 file
				title, artist, album = get_metadata_from_mp3(mp3_file)
				thumbnail = f"{mp3_file.strip('.mp3')}.jpg"

				# Sanitize filenames for folders
				artist = sanitize_filename(artist)
				album = sanitize_filename(album)
				title = sanitize_filename(title)

				# Decide where to store the file
				artist_folder = f"{OUTPUT_FOLDER}/{artist}"
				album_folder = f"{artist_folder}/{album}"

				# If album is not available, store only in artist's folder
				if album == 'Unknown Album':
					os.makedirs(artist_folder, exist_ok=True)
					song_folder = artist_folder
				else:
					os.makedirs(album_folder, exist_ok=True)
					song_folder = album_folder

				# Move MP3 file to the appropriate folder
				new_mp3_path = os.path.join(song_folder, f"{title}.mp3")
				os.rename(mp3_file, new_mp3_path)

				if os.path.exists(thumbnail):
					add_cover(new_mp3_path, thumbnail)
					os.remove(thumbnail)
				else:
					print(f"⚠️ Thumbnail not found for {title}. Skipping cover image.")
					print(f"Wanted: {thumbnail}")
				print(f"✅ {title} downloaded and saved in {song_folder}")

	except Exception as e:
		line = traceback.extract_tb(e.__traceback__)[-1]
		print(f"❌ Failed to download {url} - {line[0]}:{line[1]} - {e}")
		with open(FAILED_FILE, "a") as failed_log:
			failed_log.write(url + "\n")
	finally:
		clean_temp_folder()



def process_url_list():
	"""Reads URLs from list.txt and downloads them one by one."""
	if not os.path.exists(URL_LIST_FILE):
		print(f"⚠️ {URL_LIST_FILE} not found. Create this file and add URLs.")
		return

	with open(URL_LIST_FILE, "r") as file:
		urls = file.readlines()

	for url in urls:
		url = url.strip()
		if url:
			download_song(url)
	clean_temp_folder()
	os.removedirs(TEMP_FOLDER)

if __name__ == "__main__":
	process_url_list()
