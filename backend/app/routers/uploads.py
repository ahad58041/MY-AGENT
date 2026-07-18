from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from app.db import get_session
from app.models import Upload
from app.services.storage import save_upload
from app.services.subtitles import generate_subtitled_video

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("", response_model=Upload)
def create_upload(
    video: UploadFile = File(...),
    generic_caption: str = Form(...),
    context: str | None = Form(default=None),
    session: Session = Depends(get_session),
) -> Upload:
    try:
        original, stored_path = save_upload(video)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    upload = Upload(
        filename=original,
        stored_path=stored_path,
        generic_caption=generic_caption,
        context=context,
    )
    session.add(upload)
    session.commit()
    session.refresh(upload)
    return upload


@router.get("", response_model=list[Upload])
def list_uploads(session: Session = Depends(get_session)) -> list[Upload]:
    return list(session.exec(select(Upload).order_by(Upload.created_at.desc())))


@router.get("/{upload_id}", response_model=Upload)
def get_upload(upload_id: int, session: Session = Depends(get_session)) -> Upload:
    upload = session.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    return upload


@router.get("/{upload_id}/video")
def get_video(upload_id: int, session: Session = Depends(get_session)) -> FileResponse:
    upload = session.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    path = Path(upload.stored_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Video file missing")
    return FileResponse(path, filename=upload.filename)


@router.delete("/{upload_id}", status_code=204)
def delete_upload(upload_id: int, session: Session = Depends(get_session)) -> None:
    upload = session.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    # Remove the stored video file(s), then the DB row.
    Path(upload.stored_path).unlink(missing_ok=True)
    if upload.subtitled_path:
        Path(upload.subtitled_path).unlink(missing_ok=True)
    session.delete(upload)
    session.commit()


@router.post("/{upload_id}/subtitles", response_model=Upload)
def make_subtitles(upload_id: int, session: Session = Depends(get_session)) -> Upload:
    upload = session.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    try:
        subtitled_path, transcript = generate_subtitled_video(upload.stored_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    upload.subtitled_path = subtitled_path
    upload.transcript = transcript
    session.add(upload)
    session.commit()
    session.refresh(upload)
    return upload


@router.get("/{upload_id}/subtitled-video")
def get_subtitled_video(upload_id: int, session: Session = Depends(get_session)) -> FileResponse:
    upload = session.get(Upload, upload_id)
    if upload is None or not upload.subtitled_path:
        raise HTTPException(status_code=404, detail="No subtitled video yet")
    path = Path(upload.subtitled_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Subtitled video file missing")
    return FileResponse(path, filename=f"subtitled_{upload.filename}")
