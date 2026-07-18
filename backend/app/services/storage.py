"""Local disk storage for uploaded videos (free, no cloud needed)."""

import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import settings

ALLOWED_SUFFIXES = {".mp4", ".mov", ".m4v", ".webm"}


def save_upload(file: UploadFile) -> tuple[str, str]:
    """Save an uploaded video to the storage dir.

    Returns (original_filename, stored_path). Raises ValueError on bad type/size.
    """
    original = file.filename or "video"
    suffix = Path(original).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise ValueError(f"Unsupported file type '{suffix}'. Allowed: {', '.join(sorted(ALLOWED_SUFFIXES))}")

    stored_name = f"{uuid.uuid4().hex}{suffix}"
    stored_path = settings.storage_path / stored_name

    size = 0
    with stored_path.open("wb") as out:
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > settings.max_upload_bytes:
                out.close()
                stored_path.unlink(missing_ok=True)
                raise ValueError(f"File exceeds {settings.max_upload_mb} MB limit.")
            out.write(chunk)

    return original, str(stored_path)
