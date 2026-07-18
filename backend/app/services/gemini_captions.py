"""AI caption generation with Google Gemini.

Each social platform has its own "caption skill" — a markdown playbook under
app/skills/captions/ describing that platform's tone, limits, hashtag strategy,
and format. We load the relevant playbooks and feed them to Gemini so every
caption is genuinely native to its platform (YouTube gets a title + description,
Instagram gets a hook + hashtags, LinkedIn gets a professional post, etc.).

You can tune any platform's voice by editing its .md file — no code change.
The model is set via GEMINI_MODEL in .env (default: gemini-3.5-flash).
"""

import json
import time
from functools import lru_cache
from pathlib import Path

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, Field

from app.config import settings

SKILLS_DIR = Path(__file__).resolve().parent.parent / "skills" / "captions"

# Platform -> skill file. Add a platform by dropping in a new .md and a field
# on the Captions model below.
PLATFORM_SKILLS = {
    "instagram": "instagram.md",
    "linkedin": "linkedin.md",
    "youtube": "youtube.md",
    "facebook": "facebook.md",
}


class Captions(BaseModel):
    """Structured, per-platform captions returned by Gemini."""

    instagram: str = Field(description="Instagram Reels caption with hook + 3-8 hashtags.")
    linkedin: str = Field(description="Professional LinkedIn post with 3-5 hashtags.")
    facebook: str = Field(description="Short, casual Facebook post with 0-2 hashtags.")
    youtube_title: str = Field(description="YouTube Shorts title, <=100 chars, includes #Shorts.")
    youtube_description: str = Field(description="YouTube Shorts description with 3-5 hashtags.")


@lru_cache(maxsize=1)
def _load_skills() -> str:
    """Concatenate every platform caption skill into one guidance block."""
    blocks = []
    for platform, filename in PLATFORM_SKILLS.items():
        text = (SKILLS_DIR / filename).read_text(encoding="utf-8")
        blocks.append(f"===== SKILL: {platform.upper()} =====\n{text}")
    return "\n\n".join(blocks)


def _system_prompt() -> str:
    return (
        "You are a social-media copywriter. You turn a creator's single generic "
        "caption into platform-native captions. Follow each platform's SKILL exactly "
        "for tone, length, hooks, and hashtag strategy. Preserve the creator's topic "
        "and voice; never invent facts that aren't implied by the source caption.\n\n"
        "GLOBAL RULES (apply to every platform; override any conflicting SKILL text):\n"
        "1. Do NOT use emojis anywhere in any caption, title, or description.\n"
        "2. Keep a professional, credible tone across all platforms — polished, "
        "not slangy, not hype-y.\n"
        "3. Every hashtag must be specific and directly relevant to the video's "
        "actual topic and keywords. No generic filler, no unrelated trending tags.\n\n"
        + _load_skills()
    )


def _models_to_try() -> list[str]:
    fallbacks = [m.strip() for m in settings.gemini_fallback_models.split(",") if m.strip()]
    return [settings.gemini_model, *fallbacks]


def _parse(response: types.GenerateContentResponse) -> Captions:
    # response.parsed is a Captions instance when response_schema is a Pydantic
    # model; fall back to parsing the raw JSON text if needed.
    if isinstance(response.parsed, Captions):
        return response.parsed
    if response.text:
        return Captions(**json.loads(response.text))
    raise RuntimeError("Caption generation returned no output.")


def generate_captions(generic_caption: str, context: str | None = None) -> Captions:
    """Generate platform-native captions from one generic caption.

    Tries the configured model, then any fallbacks if it's overloaded (503).
    Raises RuntimeError if no API key is set; propagates google.genai errors otherwise.
    """
    if not settings.google_api_key:
        raise RuntimeError("GOOGLE_API_KEY is not set. Add it to backend/.env.")

    # Per-request timeout so an overloaded model fails fast instead of hanging.
    client = genai.Client(
        api_key=settings.google_api_key,
        http_options=types.HttpOptions(timeout=settings.gemini_timeout_ms),
    )

    user_content = f'Creator\'s generic caption:\n"""\n{generic_caption}\n"""'
    if context:
        user_content += f"\n\nExtra context about the video: {context}"
    user_content += "\n\nWrite the platform-native captions now."

    config = types.GenerateContentConfig(
        system_instruction=_system_prompt(),
        response_mime_type="application/json",
        response_schema=Captions,
    )

    last_error: Exception | None = None
    for model in _models_to_try():
        for attempt in range(settings.gemini_max_attempts):
            try:
                response = client.models.generate_content(model=model, contents=user_content, config=config)
                return _parse(response)
            except genai_errors.ServerError as exc:
                # Overloaded / timed out — brief backoff, then retry or fall through.
                last_error = exc
                if attempt < settings.gemini_max_attempts - 1:
                    time.sleep(2)

    raise last_error or RuntimeError("All caption models failed.")
