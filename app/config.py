import os

from itsdangerous import URLSafeTimedSerializer
from dotenv import load_dotenv
# Footer information
BUILD = "dev 1.0.17"
BRANCH = "main"
COPYRIGHT = "© 2025 - Moutig"
REPO_NAME = "OSTJourney"
REPO_OWNER = "Moutigll"
REPO_URL = f"https://github.com/{REPO_OWNER}/{REPO_NAME}"

load_dotenv()

serializer = URLSafeTimedSerializer(os.getenv("SECRET_KEY"))