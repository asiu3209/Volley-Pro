import os
import base64
import google.generativeai as genai
from app.core.config import GEMINI_API_KEY

genai.configure(api_key=GEMINI_API_KEY) # Need an API key from I think Google AI Studio or something to actually use

def analyze_frames_with_gemini(frame_paths: list[str], action_type: str | None = None) -> str:
    model = genai.GenerativeModel("gemini-2.0-flash")

    skill_context = (
        f"The player is performing a volleyball {action_type}."
        if action_type
        else "The player is performing a volleyball skill."
    )

    prompt = f"""You are an expert volleyball coach analyzing a player's technique.
{skill_context}
Review these sequential frames from a volleyball video clip and provide coaching feedback on:
1. Body positioning and posture
2. Arm and hand technique
3. Footwork and balance
4. Timing and execution
5. Key areas for improvement

Be concise, specific, and actionable."""

    parts: list = [prompt]

    for path in frame_paths:
        if not os.path.exists(path):
            continue
        with open(path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        parts.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": encoded,
            }
        })

    response = model.generate_content(parts)
    return response.text
