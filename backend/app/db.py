import os

from dotenv import load_dotenv

load_dotenv()

_VIDEO_TEST = os.environ.get("VOLLEY_VIDEO_TEST_MODE", "").lower() in (
    "1",
    "true",
    "yes",
)

if _VIDEO_TEST:
    supabase = None
else:
    from supabase import create_client

    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)