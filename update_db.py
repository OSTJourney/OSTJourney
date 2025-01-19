import eyed3
import os
import sys
import sqlite3
import shutil
import json
from mutagen.mp3 import MP3
from PIL import Image
import imagehash
from io import BytesIO
import datetime
import traceback
from time import monotonic


base_dir = covers_folder = os.path.join(os.getcwd(), "songs")
covers_folder = covers_folder = os.path.join(os.getcwd(), "static", "images", "covers")
db_file = "songs.db"
hashes = []


conn = sqlite3.connect(db_file)
cursor = conn.cursor()

cursor.execute('''
CREATE TABLE IF NOT EXISTS songs (
	id TEXT PRIMARY KEY,
	title TEXT,
	artist TEXT,
	album TEXT,
	cover TEXT DEFAULT NULL,
	duration REAL,
	tags TEXT,
	path TEXT
)
''')
conn.commit()


added = 0
updated = 0
errors = 0
new_files = 0
new_cover = 0
startid = cursor.execute("SELECT COUNT(*) FROM songs").fetchone()[0]
file_count = 0
start_time = monotonic()

def update_last_line(text):
	sys.stdout.write("\033[F")
	sys.stdout.write("\033[K")
	sys.stdout.write(text)
	sys.stdout.flush()

import os

import sys

def clear_console_except_top(lines_to_keep=5):
	sys.stdout.write("\033[H")
	for i in range(1, lines_to_keep + 1):
		sys.stdout.write("\n")
	sys.stdout.write("\033[J")
	sys.stdout.flush()



def hash_images_in_folder(covers_folder):
	image_hashes = []

	for filename in os.listdir(covers_folder):
		file_path = os.path.join(covers_folder, filename)

		if os.path.isfile(file_path) and filename.endswith('.jpg'):
			try:
				image = Image.open(file_path)
				image_hash = imagehash.phash(image)

				image_hashes.append([os.path.splitext(filename)[0], str(image_hash)])

			except Exception as e:
				print(f"Error with image {filename}: {e}")

	return image_hashes

os.system('clear')
print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')[:23]}] Starting...")
print(f"Generating existing images hashes...\n")
hashes = hash_images_in_folder(covers_folder)
print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')[:23]}] Hashes generated in {round(monotonic() - start_time, 3)} seconds. | {len(hashes)} files already exist")
print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')[:23]}] Updating database of size {startid}\n")

start_time = monotonic()

for root, _, files in os.walk(base_dir):
	for file in files:
		if file.endswith(".mp3"):
			try:
				file_path = os.path.join(root, file)
				relative_path = os.path.relpath(file_path, base_dir)
				audio_file = eyed3.load(file_path)

				file_id = None
				file_count += 1

				# Retrieve or create ID
				try:
					for frame in audio_file.tag.user_text_frames:
						if frame.description == "42id":
							if frame.text:
								file_id = frame.text
				except Exception as e:
					print(f"Error while retrieving ID for {file}: {e}")

				# Create ID if not found
				if not file_id:
					frame_id = b"TXXX"
					startid += 1
					file_id = startid
					custom_frame = eyed3.id3.frames.TextFrame(frame_id)
					custom_frame.text = "42id"
					audio_file.tag.frame_set[frame_id] = custom_frame
					audio_file.tag.save()
					audio_file = eyed3.load(file_path)
					for frame in audio_file.tag.user_text_frames:
						if frame.description == "42id":
							frame.text = str(file_id)
					audio_file.tag.save()
					new_files += 1


				# Extract common tags
				title = audio_file.tag.title or "Unknown"
				artist = audio_file.tag.artist or "Unknown"
				album = audio_file.tag.album or "Unknown"
				try:
					audio = MP3(file_path)
					duration = audio.info.length
				except Exception as e:
					duration = 0
					print(f"Error while retrieving duration for {file}: {e}")

				# Extract all text tags
				tags = {
					"TXXX": [],
					"Other": []
				}
				if audio_file.tag is not None:
					for frame_id, frames in audio_file.tag.frame_set.items():
						for frame in frames:
							if frame_id == b"TXXX":
								try:
									if frame.description is not None and frame.text is not None:
										tags["TXXX"].append([frame.description, frame.text])
								except Exception as e:
									print(f"Error while extracting TXXX tags for {file}: {e}")
							else:
								try:
									if frame.text is not None:
										tags["Other"].append([frame_id.decode('utf-8'), frame.text])
								except Exception as e:
									print(e)
				tags_json = json.dumps(tags)

				# Extract cover and check if already exists
				cover = None
				if audio_file.tag is not None and audio_file.tag.images:
					for img in audio_file.tag.images:
						image_data = img.image_data
						image = Image.open(BytesIO(image_data))
						image = image.convert("RGB")
						image = image.resize((512, 512))

						output_path = os.path.join(covers_folder + "/temp", f"{os.path.splitext(file)[0]}.jpg")
						image.save(output_path, "JPEG")
						image_hash = imagehash.phash(image)
						found = False
						for item in hashes:
							if image_hash - imagehash.hex_to_hash(item[1]) < 5:
								os.remove(output_path)
								found = True
								cover = item[0]
								break
						if not found:
							new_filename = f"{len(hashes) + 1}.jpg"
							new_output_path = os.path.join(covers_folder, new_filename)
							cover = len(hashes) + 1
							shutil.move(output_path, new_output_path)
							hashes.append([cover, str(image_hash)])

				# Updating DB
				cursor.execute("SELECT * FROM songs WHERE id = ?", (file_id,))
				row = cursor.fetchone()

				if row:
					if (
						row[1] != title
						or row[2] != artist
						or row[3] != album
						or row[4] != cover
						or row[5] != duration
						or row[6] != tags_json
						or row[7] != relative_path
					):
						cursor.execute('''
						UPDATE songs
						SET title = ?, artist = ?, album = ?, cover = ?, duration = ?, tags = ?, path = ?
						WHERE id = ?
						''', (title, artist, album, cover, duration, tags_json, relative_path, file_id))
						updated += 1
				else:
					# Add new entry
					cursor.execute('''
					INSERT INTO songs (id, title, artist, album, cover, duration, tags, path)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?)
					''', (file_id, title, artist, album, cover, duration, tags_json, relative_path))
					added += 1

				conn.commit()

				elapsed_time = round(monotonic() - start_time)
				estimated_time = round(elapsed_time / file_count * (startid - file_count))
				estimated_time = str(datetime.timedelta(seconds=estimated_time))

				clear_console_except_top()
				print(f"[{datetime.datetime.now().strftime('%H:%M:%S.%f')[:23]}] File: {relative_path} No: {file_count}/{startid + new_files}  added: {added} updated: {updated} errors: {errors} new covers: {new_cover} ETA: {estimated_time}\n")
			except Exception as e:
				errors += 1
				print(f"Error with file {file}: {traceback.format_exc()}")


# Final summary
print(f"\n[{datetime.datetime.now().strftime('%H:%M:%S.%f')[:23]}] Process complete.")
print(f"Total files processed: {file_count}")
print(f"New files added: {new_files}")
print(f"Files updated: {updated}")
print(f"Errors encountered: {errors}")
print(f"New covers added: {new_cover}")

print("Attempting to recover lost covers...")

cover_found = 0
time = monotonic()

cursor.execute("SELECT id, album FROM songs WHERE cover IS NULL;")
songs_with_null_cover = cursor.fetchall()

for song_id, album in songs_with_null_cover:
	if album == "Unknown":
		continue

	cursor.execute(
		"SELECT cover FROM songs WHERE album = ? AND cover IS NOT NULL LIMIT 1;",
		(album,)
	)
	result = cursor.fetchone()

	if result:
		cover = result[0]
		cursor.execute(
			"UPDATE songs SET cover = ? WHERE id = ?;",
			(cover, song_id)
		)
		cover_found += 1

print(f"{cover_found} covers recovered in {round(monotonic() - time, 3)}s")

conn.commit()
conn.close()
