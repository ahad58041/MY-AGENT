import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from app.db import get_session
from app.models import Upload
from app.services import postiz_client
from app.services.postiz_client import PostizNotConfigured

router = APIRouter(prefix="/api", tags=["publish"])


class PublishTarget(BaseModel):
    integration_id: str
    provider: str


class PublishRequest(BaseModel):
    targets: list[PublishTarget]
    when: str = "now"  # "now" or "schedule"
    date_iso: str | None = None


class PublishResult(BaseModel):
    integration_id: str
    provider: str
    ok: bool
    detail: str | None = None


class PublishResponse(BaseModel):
    results: list[PublishResult]
    publish_status: dict


def _caption_for(provider: str, captions: dict, fallback: str) -> str:
    p = (provider or "").lower()
    if "instagram" in p:
        return captions.get("instagram") or fallback
    if "linkedin" in p:
        return captions.get("linkedin") or fallback
    if "facebook" in p:
        return captions.get("facebook") or fallback
    if "youtube" in p:
        title = (captions.get("youtube_title") or "").strip()
        desc = captions.get("youtube_description") or fallback
        return f"{title}\n\n{desc}".strip() if title else desc
    return fallback


@router.get("/connections")
def connections() -> list[dict]:
    """List social accounts connected in Postiz."""
    try:
        return postiz_client.list_integrations()
    except PostizNotConfigured as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Postiz error: {exc.response.text[:300]}") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Can't reach Postiz at its API URL: {exc}") from exc


@router.post("/uploads/{upload_id}/publish", response_model=PublishResponse)
def publish(upload_id: int, req: PublishRequest, session: Session = Depends(get_session)) -> PublishResponse:
    upload = session.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    if not req.targets:
        raise HTTPException(status_code=400, detail="No platforms selected.")

    # Use the subtitled video if the creator generated one, else the original.
    media_path = upload.subtitled_path or upload.stored_path

    try:
        media = postiz_client.upload_media(media_path)
    except PostizNotConfigured as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Media upload to Postiz failed: {exc}") from exc

    results: list[PublishResult] = []
    status = dict(upload.publish_status or {})
    for target in req.targets:
        caption = _caption_for(target.provider, upload.captions or {}, upload.generic_caption)
        try:
            postiz_client.create_post(
                integration_id=target.integration_id,
                provider=target.provider,
                content=caption,
                media=media,
                when=req.when,
                date_iso=req.date_iso,
            )
            results.append(PublishResult(integration_id=target.integration_id, provider=target.provider, ok=True))
            status[target.provider or target.integration_id] = "scheduled" if req.when == "schedule" else "posted"
        except httpx.HTTPStatusError as exc:
            results.append(
                PublishResult(
                    integration_id=target.integration_id,
                    provider=target.provider,
                    ok=False,
                    detail=exc.response.text[:300],
                )
            )
        except httpx.HTTPError as exc:
            results.append(
                PublishResult(integration_id=target.integration_id, provider=target.provider, ok=False, detail=str(exc))
            )

    upload.publish_status = status
    session.add(upload)
    session.commit()

    return PublishResponse(results=results, publish_status=status)
