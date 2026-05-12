import os
import mimetypes
import time
from collections import OrderedDict
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

_REFERENCE_TYPES: dict[str, tuple[str, str]] = {
    "blocks": ("block", "Block"),
    "digs": ("dig", "Dig/Pass"),
    "pins": ("hit", "Attack (hit)"),
    "setters": ("setter", "Set"),
    "serves": ("serve", "Serve"),
}

# Coaches/channels whose uploads may be cited as concrete watch URLs (no search-result links).
_YOUTUBE_SOURCE_CHANNELS = """\
- Elevate Yourself (Donny Hui)
- The Art of Coaching Volleyball
- Volleyball World
- Sarah Pavan Volleyball
- Moomoo Volley
- Isaiah Rivera TV
- Ninh Ly Volleyball Guides
- Better at Beach Volleyball
- Coach Donny Volleyball
- Out of System
- Koko Volley
- Get The Pancake
- Deep Dish Volleyball
- NCAA Volleyball
- Power Volleyball"""


def action_types_public() -> list[dict[str, str]]:
    return [{"value": k, "label": v[1]} for k, v in sorted(_REFERENCE_TYPES.items())]


def action_type_label(action_id: str | None) -> str | None:
    if not action_id:
        return None
    meta = _REFERENCE_TYPES.get(action_id)
    return meta[1] if meta else None


def normalize_action_type(action_type: str | None) -> str | None:
    if not action_type:
        return None
    normalized = action_type.strip().lower()
    return normalized if normalized in _REFERENCE_TYPES else None


_reference_image_cache: OrderedDict[str, tuple[float, list[types.Part]]] = OrderedDict()


def _reference_image_set(action_type: str | None) -> tuple[str, str] | None:
    normalized = normalize_action_type(action_type)
    return None if not normalized else (normalized, _REFERENCE_TYPES[normalized][0])


def _reference_urls(folder: str, stem: str) -> list[str]:
    base = f"{SUPABASE_URL}/storage/v1/object/public/{REFERENCE_IMAGE_BUCKET}/"
    return [
        f'{base}{quote(f"{folder}/{stem}{i}.{REFERENCE_IMAGE_EXT}", safe="/")}'
        for i in range(1, REFERENCE_IMAGE_COUNT + 1)
    ]


def _download_part(url: str) -> types.Part | None:
    try:
        with urlopen(
            Request(url, headers={"User-Agent": "volleyPro/1.0"}), timeout=8
        ) as r:
            blob = r.read()
            ctype = r.headers.get_content_type() or (
                mimetypes.guess_type(url)[0] or "image/png"
            )
    except (HTTPError, URLError, TimeoutError):
        return None
    return types.Part.from_bytes(data=blob, mime_type=ctype)


def _get_reference_image_parts(action_type: str | None) -> list[types.Part]:
    image_set = _reference_image_set(action_type)
    if not image_set:
        return []
    folder, stem = image_set
    cached = _reference_image_cache.get(folder)
    now = time.time()
    if cached and now - cached[0] < REFERENCE_IMAGE_CACHE_TTL_SECONDS:
        _reference_image_cache.move_to_end(folder)
        return cached[1]

    parts: list[types.Part] = []
    for url in _reference_urls(folder, stem):
        part = _download_part(url)
        if part:
            parts.append(part)
    _reference_image_cache[folder] = (now, parts)
    _reference_image_cache.move_to_end(folder)

    mx = max(1, int(os.environ.get("REFERENCE_IMAGE_CACHE_MAX_FOLDERS", "3")))
    while len(_reference_image_cache) > mx:
        _reference_image_cache.popitem(last=False)

    return parts


def _video_mime(path: str) -> str:
    ext = os.path.splitext(path.lower())[1]
    return {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
    }.get(ext, "video/mp4")


def _gemini_file_state_upper(info: object) -> str:
    st = getattr(info, "state", None)
    if st is None:
        return ""
    n = getattr(st, "name", None)
    return str(n).upper() if isinstance(n, str) else str(st).upper()


def _upload_video_via_files_api(video_path: str) -> tuple[str, object]:
    mime = _video_mime(video_path)
    timeout = float(os.environ.get("GEMINI_FILE_READY_TIMEOUT_SEC", "300"))
    step = float(os.environ.get("GEMINI_FILE_POLL_INTERVAL_SEC", "2"))
    try:
        up = client.files.upload(
            file=video_path,
            config=types.UploadFileConfig(mime_type=mime),
        )
    except Exception:
        up = client.files.upload(file=video_path)
    name = up.name
    deadline = time.time() + timeout
    while time.time() < deadline:
        info = client.files.get(name=name)
        st = _gemini_file_state_upper(info)
        if st.endswith("ACTIVE") or "_ACTIVE" in st or st == "ACTIVE":
            return name, info
        if "FAILED" in st:
            raise RuntimeError(
                f"Gemini could not ingest video (state={st}). Try MP4/H.264 or a shorter clip."
            )
        time.sleep(step)
    raise TimeoutError(f"Video upload not ready within {timeout:.0f}s.")


def _build_video_prompt(action_type: str | None) -> str:
    skill = (
        f"Athlete is doing / repeating volleyball **{action_type}** in the clip."
        if action_type
        else "Athlete performs a volleyball skill."
    )
    schema_action = (
        f'  "action_type_out": "{action_type}",'
        if action_type
        else '  "action_type_out": "string (inferred skill)",'
    )
    return f"""You are an elite volleyball coach, movement analyst, performance analyst, and a volleyball form coach.

AFTER THIS TEXT you receive:
1) A JPEG preview: first frame of the video with a **green box** drawn on it — analyse only **that athlete** everywhere in the clip (match via motion continuity, silhouette, role; never identify them by jersey number, garment text, hair, kit colour, ethnicity, gender, age, or similar in JSON).
2) The full-length video.

{skill}

Rules: Evidence only; cite limitations if quality/angle is poor. References (if supplied) are gold-standard examples — do not criticise them.

Score 0–100 overall; breakdown sums reflect posture, footwork, arms/hands, timing, execution.

Respond with **ONLY** valid JSON (no markdown fences). Schema:
{{
  "identity_note": "neutral tracking explanation; no appearances/numbers",
{schema_action}
  "overall_score": 0,
  "score_breakdown": {{
    "body_positioning_posture": 0,
    "footwork_balance": 0,
    "arm_hand_technique": 0,
    "timing_coordination": 0,
    "overall_execution": 0
  }},
  "analysis_summary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvement_tips": [
    {{ "issue": "string", "recommendation": "string", "priority": "high | medium | low" }}
  ],
  "timeline_highlights": [
    {{ "approximate_seconds": 0.0, "technical_note": "string" }}
  ],
  "professional_comparison": {{
    "matches_reference_well": ["string"],
    "differs_from_reference": ["string"]
  }},
  "youtube_recommendations": [
    {{
      "title": "exact or near-exact upload title",
      "channel": "must match one name from ALLOWED_CHANNELS below",
      "youtube_url": "https://www.youtube.com/watch?v=VIDEO_ID only",
      "reason": "one sentence tying to athlete weakness"
    }}
  ],
  "final_coaching_feedback": "string"
}}

timeline_highlights: 3–5 moments for the focal athlete.

youtube_recommendations: 3–5 items fixing main weaknesses.

ALLOWED_CHANNELS (videos must be uploads from channels/creators in this list only):
{_YOUTUBE_SOURCE_CHANNELS}
MAKE SURE YOUTUBE VIDEO IS AN ACTIVE VIDEO THAT CAN BE WATCHED BEFORE RECOMMENDING IT. IF UNSURE, DO NOT RECOMMEND IT, JUST RECOMMEND ANOTHER VIDEO

YouTube rules:
- Every **youtube_url** MUST be `https://www.youtube.com/watch?v=` plus a valid 11-char video id — a **specific public video**.
- Forbidden: youtube search URLs, playlists-only links, shortened links you are unsure of, fabricated ids, channel homepages (`/c/`, `/@`), or placeholders.
- If you do not confidently know a **real** video id from ALLOWED_CHANNELS, **omit that entry** (return fewer recommendations) rather than guessing.
- Provide a Maximum of 1-2 recommendations. If you cannot find any good recommendations, returning a good search query hyperlink to youtube can be an alternative, but prioritize providing specific recommendations if possible.
- You are allowed to find more than 2 recoomendations but only return the 2 videos that have the most recent upload or recent release.
"""


def analyze_video_with_gemini(
    video_path: str,
    preview_image_path: str,
    action_type: str | None = None,
) -> str:
    """Full-clip Gemini analysis; preview JPEG has green user selection box."""
    action_type = normalize_action_type(action_type)
    prompt = _build_video_prompt(action_type)

    if not os.path.isfile(video_path):
        raise FileNotFoundError(f"Video missing: {video_path}")
    if not os.path.isfile(preview_image_path):
        raise FileNotFoundError(f"Preview missing: {preview_image_path}")

    prev_mime = mimetypes.guess_type(preview_image_path)[0] or "image/jpeg"
    with open(preview_image_path, "rb") as f:
        preview_bytes = f.read()

    uploaded_name: str | None = None
    force_inline = os.environ.get("GEMINI_FORCE_INLINE_VIDEO", "").lower() in (
        "1",
        "true",
        "yes",
    )
    if force_inline:
        with open(video_path, "rb") as f:
            video_part = types.Part.from_bytes(
                data=f.read(), mime_type=_video_mime(video_path)
            )
    else:
        try:
            uploaded_name, video_part = _upload_video_via_files_api(video_path)
        except Exception:
            with open(video_path, "rb") as f:
                video_part = types.Part.from_bytes(
                    data=f.read(),
                    mime_type=_video_mime(video_path),
                )

    contents: list = [prompt]

    try:
        contents.extend(
            [
                "PREVIEW (first frame, green selection box = athlete to analyse).",
                types.Part.from_bytes(data=preview_bytes, mime_type=prev_mime),
                "FULL VIDEO — same clip; analyse only the selected athlete.",
                video_part,
            ]
        )

        refs = _get_reference_image_parts(action_type)
        if refs:
            contents.extend(
                [
                    "Elite reference stills for this skill — compare VIDEO to these, don't critique refs.",
                    *refs,
                    "Apply comparison to focal athlete motion in the VIDEO.",
                ]
            )
        else:
            contents.append("No refs — rely on textbook volleyball biomechanics.")

        return (
            client.models.generate_content(
                model="gemini-2.5-flash", contents=contents
            ).text
            or "{}"
        )
    finally:
        try:
            del preview_bytes
        except Exception:
            pass
        if uploaded_name:
            try:
                client.files.delete(name=uploaded_name)
            except Exception:
                pass
