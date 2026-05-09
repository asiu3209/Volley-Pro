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

# Single source of truth: action id → (reference image basename in bucket, UI label).
_REFERENCE_TYPES: dict[str, tuple[str, str]] = {
    "blocks": ("block", "Block"),
    "digs": ("dig", "Dig"),
    "pins": ("hit", "Attack (hit)"),
    "setters": ("setter", "Set"),
    "serves": ("serve", "Serve"),
}


def action_types_public() -> list[dict[str, str]]:
    return [
        {"value": aid, "label": meta[1]}
        for aid, meta in sorted(_REFERENCE_TYPES.items())
    ]


def action_type_label(action_id: str | None) -> str | None:
    if not action_id:
        return None
    meta = _REFERENCE_TYPES.get(action_id)
    return meta[1] if meta else None


_reference_image_cache: dict[str, tuple[float, list[types.Part]]] = {}


def normalize_action_type(action_type: str | None) -> str | None:
    if not action_type:
        return None

    normalized = action_type.strip().lower()
    return normalized if normalized in _REFERENCE_TYPES else None


def _reference_image_set(action_type: str | None) -> tuple[str, str] | None:
    normalized = normalize_action_type(action_type)
    if not normalized:
        return None

    return normalized, _REFERENCE_TYPES[normalized][0]


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
You are an elite volleyball coach and biomechanical movement analyst.

Your task is to analyze sequential volleyball frames of a player and compare the player's form against professional reference images.

{skill_context}

IMPORTANT ANALYSIS RULES:
- Analyze ONLY usable frames.
- Skip frames that are:
  - blurry
  - too dark
  - cropped incorrectly
  - duplicated
  - missing key body parts
  - player out of frame
  - impossible to evaluate
- Ignore low-quality frames completely.
- Base conclusions ONLY on visible evidence.
- Do NOT hallucinate movements not visible in the frames.
- Be objective, technical, and concise.

--------------------------------------------------
SCORING SYSTEM (0-100)
--------------------------------------------------

Score the player using the following weighted rubric:

1. Body Positioning & Posture (25 points)
- spine alignment
- athletic stance
- hip positioning
- shoulder posture

2. Footwork & Balance (20 points)
- balance
- approach mechanics
- landing control
- weight transfer

3. Arm Swing / Hand Technique (20 points)
- arm mechanics
- elbow positioning
- wrist contact
- hand control

4. Timing & Coordination (20 points)
- sequencing
- jump timing
- contact timing
- synchronization

5. Overall Athletic Execution (15 points)
- fluidity
- explosiveness
- consistency
- confidence

TOTAL SCORE = sum of all categories out of 100.

SCORING GUIDELINES:
90-100 = elite / near professional
80-89 = very strong technique
70-79 = solid but noticeable weaknesses
60-69 = inconsistent mechanics
40-59 = major technical flaws
0-39 = poor execution

--------------------------------------------------
OUTPUT REQUIREMENTS
--------------------------------------------------

Return ONLY valid JSON.
Do NOT include markdown.
Do NOT include explanation text outside JSON.
Do NOT wrap JSON in triple backticks.

The JSON response MUST follow this exact schema:

{{
  "action_type": "string",

  "overall_score": 0,

  "score_breakdown": {{
    "body_positioning_posture": 0,
    "footwork_balance": 0,
    "arm_hand_technique": 0,
    "timing_coordination": 0,
    "overall_execution": 0
  }},

  "analysis_summary": "string",

  "strengths": [
    "string",
    "string"
  ],

  "weaknesses": [
    "string",
    "string"
  ],

  "improvement_tips": [
    {{
      "issue": "string",
      "recommendation": "string",
      "priority": "high | medium | low"
    }}
  ],

  "frame_analysis": [
    {{
      "frame_index": 0,
      "usable": true,
      "observations": [
        "string"
      ]
    }}
  ],

  "professional_comparison": {{
    "matches_reference_well": [
      "string"
    ],
    "differs_from_reference": [
      "string"
    ]
  }},

  "youtube_recommendations": [
    {{
      "title": "string",
      "search_query": "string",
      "reason": "string"
    }}
  ],

  "final_coaching_feedback": "string"
}}

--------------------------------------------------
YOUTUBE RECOMMENDATION RULES
--------------------------------------------------

Provide 3-5 highly relevant YouTube search recommendations based on the player's biggest weaknesses.

Examples:
- "Volleyball hitting approach footwork drill"
- "How to improve volleyball arm swing mechanics"
- "Volleyball jump timing tutorial"

The recommendations should directly target the detected flaws.

--------------------------------------------------
FRAME ANALYSIS RULES
--------------------------------------------------

For every frame:
- determine if usable = true/false
- if false, briefly explain why
- if true, include technical observations

--------------------------------------------------
ANALYSIS STYLE
--------------------------------------------------

Your coaching feedback should:
- sound professional
- be specific
- be actionable
- focus on biomechanics and volleyball fundamentals
- avoid generic advice

Keep feedback concise but insightful.
"""

    contents = [prompt]

    reference_parts = _get_reference_image_parts(action_type)

    if reference_parts:
        contents.append(
            "The next images are professional volleyball reference forms. "
            "Use them as the gold standard for comparison. "
            "Do not critique the reference images."
        )

        contents.extend(reference_parts)

        contents.append(
            "Now analyze the user's sequential volleyball frames against the professional references."
        )

    else:
        contents.append(
            "No professional reference images are available. "
            "Analyze the user's sequential volleyball frames using standard volleyball biomechanics."
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


def _video_mime(video_path: str) -> str:
    ext = os.path.splitext(video_path.lower())[1]
    mapping = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".quicktime": "video/quicktime",
    }
    return mapping.get(ext, "video/mp4")


def analyze_video_with_gemini(
    video_path: str,
    preview_image_path: str,
    action_type: str | None = None,
) -> str:
    """
    Analyze the entire clip with Gemini. Preview image is the first frame rendered with a
    user-drawn selection box (green tint + border) — the focal athlete lies in that region.
    """
    action_type = normalize_action_type(action_type)
    skill = (
        f"The athlete performed a volleyball {action_type} (or repeats it in the clip)."
        if action_type
        else "The athlete performs a volleyball skill in the clip."
    )
    schema_action_line = (
        f'  "action_type_out": "{action_type}",'
        if action_type
        else '  "action_type_out": "string — inferred skill label",'
    )

    prompt = f"""
You are an elite volleyball coach and biomechanical movement analyst.

INPUTS (in order after this prompt):
1) A still PREVIEW IMAGE — the FIRST frame of the same video, but **already edited**:
   the user has drawn a **bright green rectangular selection** (semi-transparent green fill
   inside + green border). Treat that rectangle as the authoritative hint for **which single
   player** the user wants coached.    The athlete to score is the person **primarily inside
   that box** (or the one the box is clearly centered on if two players overlap the edge).
   You may rely on continuity of motion, body shape/silhouette, and court position internally
   to keep the same person in view — **do not** mention jersey numbers, printed digits,
   hair, kit colors, ethnicity, gender, age, height, weight, facial features, or other
   appearance labels anywhere in your JSON output (digits are unreadable/occluded/wrong often).
2) The COMPLETE VIDEO from the beginning (same footage as the unedited first frame).
   Analyze **only** that same identified athlete wherever they appear. Ignore unrelated
   players for scoring unless they mechanically affect the focal athlete.

{skill}

RULES:
- The green box is intentional UI. In **`identity_note`**, explain tracking only in neutral
  terms (e.g. "followed the athlete indicated by the selection through motion continuity and
  court positioning"), **without** claiming or guessing jersey numbers or other appearance
  details. Elsewhere (`analysis_summary`, `final_coaching_feedback`, timeline notes, etc.)
  refer to "**the focal athlete**" / "**the selected player**" — never describe them by
  number, garment text, colors, hairstyle, facial features, or similar identifiers that are
  easy to misread.
- Match preview → athlete in video reliably (if ambiguous despite the box, say ambiguity
  in neutral language without inventing specifics).
- Base findings only on motion actually visible — do NOT invent contacts or angles not seen.
- Reference images (if supplied) benchmark elite form — do not judge the refs.
- If the clip has low resolution, occlusions, or bad angles, state limitations succinctly.
- Do not make up any information. If you cannot find the player in the video, say so.

SCORING (0–100): same rationale as biomechanics + volleyball fundamentals combined.

OUTPUT ONLY valid JSON — no markdown, no code fences.

Schema:
{{
  "identity_note": "string — brief neutral explanation of tracking the boxed athlete through the clip — NO jersey digits, readable numbers on clothing, hairstyle, ethnicity, gender, ages, kits, facial features",
{schema_action_line}

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
    {{ "title": "string", "search_query": "string", "reason": "string", "youtube_url": "string" }}
  ],

  "final_coaching_feedback": "string"
}}

Provide **3–5** timeline_highlights spaced across noteworthy moments involving the focal athlete.

Provide **3–5** relevant YouTube **search_query** suggestions from major weaknesses only.
"""

    if not os.path.isfile(video_path):
        raise FileNotFoundError(f"Video missing: {video_path}")
    if not os.path.isfile(preview_image_path):
        raise FileNotFoundError(f"Preview missing: {preview_image_path}")

    contents: list = [prompt]

    preview_mime = mimetypes.guess_type(preview_image_path)[0] or "image/jpeg"
    video_mime = _video_mime(video_path)

    with open(preview_image_path, "rb") as f:
        preview_bytes = f.read()
    with open(video_path, "rb") as f:
        video_bytes = f.read()

    contents.append(
        "PREVIEW IMAGE — first frame of the video WITH user-drawn green selection box "
        "around the athlete to analyze (same timestamp as clip start)."
    )
    contents.append(types.Part.from_bytes(data=preview_bytes, mime_type=preview_mime))
    contents.append(
        "FULL VIDEO — analyze only that athlete everywhere they appear."
    )
    contents.append(types.Part.from_bytes(data=video_bytes, mime_type=video_mime))

    reference_parts = _get_reference_image_parts(action_type)
    if reference_parts:
        contents.append(
            "Reference stills showing elite volleyball form for this skill archetype:"
        )
        contents.extend(reference_parts)
        contents.append(
            "Contrast the focal athlete throughout the VIDEO against references where applicable."
        )
    else:
        contents.append(
            "Reference stills unavailable — use standard biomechanically sound volleyball."
        )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
    )

    return response.text or "{}"
