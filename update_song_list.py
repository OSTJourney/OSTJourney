import csv
import os
import requests
import time
import math
from pathlib import Path
import keyboard
from time import monotonic

start = monotonic()

input_file = 'songs.csv'
base_url = 'https://hourisland.com/'
error_log_file = 'failed_downloads.txt'
start_index = 0
failed_downloads = []

lb = '\033[94m'
green = '\033[92m'
red = '\033[91m'
purple = '\033[95m'
reset = '\033[0m'

print("Downloading song list:")

try:
    response = requests.get(base_url + input_file, timeout=10)
    response.raise_for_status()
    with open(input_file, 'wb') as f:
        f.write(response.content)
except requests.exceptions.RequestException:
    print("{red}Failed to download song list!{reset}")
    exit(1)

with open(input_file) as f:
   total_files = sum(1 for _ in f)

total_files -= 1
i = 0
old_files = 0
downloaded = 0
failed_n = 0

def clear_console():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_progress_bar(progress, total):
    percent = int((progress / total) * 100)
    bar_length = 100
    filled_length = int(bar_length * percent // 100)
    bar = '\033[42m\033[30m'
    bar += '#' * filled_length
    bar += reset + '-' * (bar_length - filled_length)
    print(f"[{bar}] {percent}%")

with open(input_file, mode='r', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        i += 1 
        if i < start_index:
            continue

        file_path = Path(row['file'].strip())  # Utiliser Path pour la gestion des chemins
        if keyboard.is_pressed('`'):  # Si la touche '`' est pressée, on arrête la boucle
            print("\n{purple}Download process interrupted by the user.{reset}")
            break

        if not file_path.is_file():  # Vérifier si le fichier existe déjà localement
            file_url = base_url + str(file_path)
            os.makedirs(file_path.parent, exist_ok=True)
            try:
                response = requests.get(file_url, timeout=10)
                response.raise_for_status()

                with open(file_path, 'wb') as f:
                    f.write(response.content)
                downloaded += 1
                clear_console()
                print(f"{green}File number: {lb}{i}/{total_files}{reset}({green}d{downloaded}{reset}|{red}f{failed_n}{reset}) - {green}Downloading {file_url}...{reset}")
                print(f"{lb}Runtime: {round(monotonic() - start)}s{reset}")
            except requests.exceptions.RequestException as e:
                failed_downloads.append(file_url)
                failed_downloads.append(f"File number {i} reason{e}")
                failed_n+=1
                clear_console()
                print(f"{red}Failed to download {file_url}{reset} ||| {lb}{i}/{total_files}{reset}({green}d{downloaded}{reset}|{red}f{failed_n}{reset})")
                print(f"{lb}Runtime: {round(monotonic() - start)}s{reset}")
        else:
            old_files += 1
            clear_console()
            print(f"{lb}File number: {i}/{total_files}{reset}({green}d{downloaded}{reset}|{red}f{failed_n}{reset}) - {lb}Already exists")
            print(f"Runtime: {round(monotonic() - start)}s{reset}")

        print_progress_bar(i, total_files)

if failed_downloads:
    with open(error_log_file, 'w') as f:
        f.write("\n".join(failed_downloads))
    print(f"{red}Failed downloads have been saved in {error_log_file}{reset}")
else:
    print(f"{green}All the files have been successfully downloaded!{reset}")

print(f"{lb}{old_files} files already exist{reset}, {green}{downloaded} files have been downloaded{reset} and {red}{failed_n} have failed{reset}; {lb}Total files: {total_files}{reset}")

