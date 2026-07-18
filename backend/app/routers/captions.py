from fastapi import APIRouter, Depends, HTTPException
from google.genai import errors as genai_errors
from pydantic import BaseModel
from sqlmodel import Session

from app.db import get_session
from app.models import Upload
from app.services.gemini_captions import generate_captions

router = APIRouter(prefix="/api/uploads", tags=["captions"])


class CaptionEdit(BaseModel):
    """Payload to save creator-edited captions."""

    captions: dict


@router.post("/{upload_id}/generate-captions", response_model=Upload)
def generate(upload_id: int, session: Session = Depends(get_session)) -> Upload:
    upload = session.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail="Upload not found")

    try:
        result = generate_captions(upload.generic_caption, upload.context)
    except RuntimeError as exc:
        # e.g. missing API key
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except genai_errors.ServerError as exc:
        # 503/504 — the free tier is temporarily overloaded.
        raise HTTPException(
            status_code=503,
            detail="Gemini is busy right now (free-tier demand spike). Please click Generate again in a moment.",
        ) from exc
    except genai_errors.APIError as exc:
        raise HTTPException(status_code=502, detail=f"Caption generation failed: {exc}") from exc

    upload.captions = result.model_dump()
    session.add(upload)
    session.commit()
    session.refresh(upload)
    return upload


@router.put("/{upload_id}/captions", response_model=Upload)
def save_captions(upload_id: int, payload: CaptionEdit, session: Session = Depends(get_session)) -> Upload:
    upload = session.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    upload.captions = payload.captions
    session.add(upload)
    session.commit()
    session.refresh(upload)
    return upload
