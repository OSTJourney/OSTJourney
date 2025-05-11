import sqlite3
import os
import json

# Paths to the SQLite database files
db_path_songs = "instance/songs.db"
db_path_users = "instance/users.db"

# ANSI color codes
RED = "\033[91m"
YELLOW = "\033[93m"
GREEN = "\033[92m"
CYAN = "\033[96m"
RESET = "\033[0m"

def compare_versions(v1, v2):
	v1_tuple = tuple(map(int, v1.split('.')))
	v2_tuple = tuple(map(int, v2.split('.')))
	return v1_tuple <= v2_tuple

def get_connection(db_type='songs'):
	if db_type == 'songs':
		return sqlite3.connect(db_path_songs)
	elif db_type == 'users':
		return sqlite3.connect(db_path_users)
	else:
		raise ValueError(RED + "Invalid database type specified. Use 'songs' or 'users'." + RESET)

def execute_query(query, db_type='songs'):
	try:
		conn = get_connection(db_type)
		cursor = conn.cursor()
		cursor.execute(query)
		conn.commit()
		conn.close()

		print(GREEN + f"[✔] Executed query on {db_type} database:" + RESET)
		print(CYAN + f"    {query}" + RESET)
	except sqlite3.Error as e:
		print(RED + f"[✘] Error occurred on {db_type} database: {e}" + RESET)

def apply_update(version, version_label, queries):
	if not compare_versions(version, version_label):
		return
	success = True
	print(YELLOW + f"Updating database to version {version_label}..." + RESET)

	for query, db_type in queries:
		success = success and execute_query(query, db_type=db_type)

	if success:
		print(GREEN + f"[✔] Database updated to version {version_label}." + RESET)
	else:
		print(RED + f"[✘] Failed to fully update database to version {version_label}." + RESET)

	return success


def check_and_update_db(version):
	apply_update(version, "1.0.31", [
			("ALTER TABLE user_settings ADD COLUMN theme VARCHAR(50) DEFAULT 'catppuccin-macchiato'", 'users'),
			("ALTER TABLE user_settings ADD COLUMN color_overrides TEXT", 'users'),
		])
	print(GREEN + "[✔] Database update complete." + RESET)

print(RED + "!!! WARNING !!!" + RESET)
print(YELLOW + "Make sure the following variables are correctly set:" + RESET)
print(f" → db_path_songs = {CYAN}{db_path_songs}{RESET}")
print(f" → db_path_users = {CYAN}{db_path_users}{RESET}")
print(YELLOW + "If not, update this script accordingly.\n" + RESET)

version = input("Enter the version number (e.g., 1.0.0): ")
check_and_update_db(version)
