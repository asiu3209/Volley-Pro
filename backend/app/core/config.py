import os
from dotenv import load_dotenv

load_dotenv()
#Load secrets
DATABASE_URL = os.getenv("DATABASE_URL")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION")
AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL")
USE_LOCALSTACK = os.getenv("USE_LOCALSTACK", "False") == "True"
LOCALSTACK_ENDPOINT = os.getenv("LOCALSTACK_ENDPOINT")