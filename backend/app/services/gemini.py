import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(override=True)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def analyze_frames_with_gemini(
    frame_paths: list[str],
    action_type: str | None = None
) -> str:

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

    for path in frame_paths:
        if not os.path.exists(path):
            continue

        with open(path, "rb") as f:
            img_bytes = f.read()

        contents.append(
            types.Part.from_bytes(
                data=img_bytes,
                mime_type="image/jpeg"
            )
        )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents
    )

    return response.text
