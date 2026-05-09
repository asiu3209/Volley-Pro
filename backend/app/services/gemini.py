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
