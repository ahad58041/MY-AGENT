from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """App configuration, loaded from backend/.env (see .env.example)."""

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5433/reelpilot"

    # Gemini (Google AI Studio). Get a free key at https://aistudio.google.com
    google_api_key: str = ""
    # gemini-3.1-flash-lite: fast + reliable on the free tier (frontier-class).
    # For max quality set gemini-3.5-flash (may hit 503 "high demand" on free tier).
    gemini_model: str = "gemini-3.1-flash-lite"
    # Comma-separated models tried if the primary is overloaded (503/504).
    # Empty = retry the primary only (avoids stacking slow, also-busy fallbacks).
    gemini_fallback_models: str = ""
    # Per-request timeout (ms). A healthy structured call is ~2-3s; 25s catches
    # stragglers without hanging on an overloaded model.
    gemini_timeout_ms: int = 25000
    # Attempts per model before giving up / falling back.
    gemini_max_attempts: int = 2

    # Self-hosted Postiz. Web UI + API on port 4007 by default.
    postiz_api_url: str = "http://localhost:4007"
    postiz_api_key: str = ""

    storage_dir: str = "storage"
    max_upload_mb: int = 200

    # Auto video subtitles (faster-whisper). base.en = fast; small.en = more accurate.
    whisper_model: str = "base.en"
    subtitle_language: str = "en"

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def storage_path(self) -> Path:
        path = BACKEND_ROOT / self.storage_dir
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


settings = Settings()
