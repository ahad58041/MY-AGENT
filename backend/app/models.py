from datetime import datetime, timezone

from sqlmodel import JSON, Column, Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Upload(SQLModel, table=True):
    """A single uploaded video + its generic caption and generated per-platform captions."""

    id: int | None = Field(default=None, primary_key=True)
    filename: str
    stored_path: str
    generic_caption: str
    context: str | None = None

    # Generated captions, keyed by field (instagram, linkedin, facebook,
    # youtube_title, youtube_description). Empty until captions are generated.
    captions: dict = Field(default_factory=dict, sa_column=Column(JSON))

    # Per-platform publish status once wired to Postiz (Phase 3).
    publish_status: dict = Field(default_factory=dict, sa_column=Column(JSON))

    # Auto-subtitles: path to the burned-in video + the transcript text.
    subtitled_path: str | None = None
    transcript: str | None = None

    created_at: datetime = Field(default_factory=_now)
