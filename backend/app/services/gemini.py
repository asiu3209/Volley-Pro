import os
import mimetypes
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(override=True)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
REFERENCE_IMAGE_BUCKET = os.environ["REFERENCE_IMAGE_BUCKET"]
REFERENCE_IMAGE_EXT = os.environ["REFERENCE_IMAGE_EXT"].lstrip(".")
REFERENCE_IMAGE_COUNT = int(os.environ["REFERENCE_IMAGE_COUNT"])
REFERENCE_IMAGE_CACHE_TTL_SECONDS = int(os.environ["REFERENCE_IMAGE_CACHE_TTL_SECONDS"])

REFERENCE_IMAGE_SETS = {
    "blocks": "block",
    "digs": "dig",
    "pins": "hit",
    "setters": "setter",
    "serves": "serve",
}

_reference_image_cache: dict[str, tuple[float, list[types.Part]]] = {}


def normalize_action_type(action_type: str | None) -> str | None:
    if not action_type:
        return None

    normalized = action_type.strip().lower()
    return normalized if normalized in REFERENCE_IMAGE_SETS else None


def _reference_image_set(action_type: str | None) -> tuple[str, str] | None:
    normalized = normalize_action_type(action_type)
    if not normalized:
        return None

    return normalized, REFERENCE_IMAGE_SETS[normalized]


def _reference_image_urls(folder: str, file_stem: str) -> list[str]:
    return [
        (
            f"{SUPABASE_URL}/storage/v1/object/public/{REFERENCE_IMAGE_BUCKET}/"
            f"{quote(f'{folder}/{file_stem}{index}.{REFERENCE_IMAGE_EXT}', safe='/')}"
        )
        for index in range(1, REFERENCE_IMAGE_COUNT + 1)
    ]


def _mime_type_for_url(url: str) -> str:
    mime_type, _ = mimetypes.guess_type(url)
    return mime_type or "image/png"


def _download_image_part(url: str) -> types.Part | None:
    request = Request(url, headers={"User-Agent": "volleyPro/1.0"})

    try:
        with urlopen(request, timeout=8) as response:
            image_bytes = response.read()
            mime_type = response.headers.get_content_type() or _mime_type_for_url(url)
    except (HTTPError, URLError, TimeoutError):
        return None

    return types.Part.from_bytes(
        data=image_bytes,
        mime_type=mime_type
    )


def _get_reference_image_parts(action_type: str | None) -> list[types.Part]:
    image_set = _reference_image_set(action_type)
    if not image_set:
        return []

    folder, file_stem = image_set
    cached = _reference_image_cache.get(folder)
    now = time.time()
    if cached and now - cached[0] < REFERENCE_IMAGE_CACHE_TTL_SECONDS:
        return cached[1]

    parts = []
    for url in _reference_image_urls(folder, file_stem):
        part = _download_image_part(url)
        if part:
            parts.append(part)

    _reference_image_cache[folder] = (now, parts)
    return parts


def analyze_frames_with_gemini(
    frame_paths: list[str],
    action_type: str | None = None
) -> str:
    action_type = normalize_action_type(action_type)

    skill_context = (
        f"The player is performing a volleyball {action_type}."
        if action_type
        else "The player is performing a volleyball skill."
    )

    prompt = f"""
You are an expert volleyball coach analyzing a player's technique.

{skill_context}

Review these sequential frames and provide feedback on:
1. Body positioning and posture
2. Arm and hand technique
3. Footwork and balance
4. Timing and execution
5. Key improvements

Be concise and actionable.
"""
    contents = [prompt]
    reference_parts = _get_reference_image_parts(action_type)

    if reference_parts:
        contents.append(
            "Use the next images as ideal volleyball form references for comparison. "
            "Do not critique the reference images; use them only as the standard."
        )
        contents.extend(reference_parts)
        contents.append(
            "Now analyze the user's sequential frames below against those references."
        )

    for path in frame_paths:
        if not os.path.exists(path):
            continue

        with open(path, "rb") as f:
            img_bytes = f.read()

        contents.append(
            types.Part.from_bytes(
                data=img_bytes,
                mime_type=mimetypes.guess_type(path)[0] or "image/jpeg"
            )
        )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents
    )

    return response.text
