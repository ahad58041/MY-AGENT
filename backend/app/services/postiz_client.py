"""Postiz integration — publish videos + captions to connected social accounts.

Postiz (self-hosted) manages the OAuth connection and token refresh for each
platform; we call its Public API to upload media and create posts.

Setup (yours): run Postiz, connect your accounts in its UI, then paste a Public
API key (Settings > Developers > Public API) into POSTIZ_API_KEY in .env.

Self-hosted API base is {POSTIZ_API_URL}/public/v1 with header
`Authorization: <api key>`.
"""

import httpx

from app.config import settings


class PostizNotConfigured(RuntimeError):
    pass


def _client() -> httpx.Client:
    if not settings.postiz_api_key:
        raise PostizNotConfigured(
            "POSTIZ_API_KEY is not set. Connect your accounts in Postiz, then paste "
            "a Public API key (Settings > Developers > Public API) into backend/.env."
        )
    base = settings.postiz_api_url.rstrip("/") + "/public/v1"
    return httpx.Client(
        base_url=base,
        headers={"Authorization": settings.postiz_api_key},
        timeout=120.0,
    )


def _provider_of(integration: dict) -> str:
    """Best-effort extraction of the platform identifier (e.g. 'instagram').

    Postiz has varied this field name across versions; try the common ones.
    """
    for key in ("identifier", "providerIdentifier", "provider", "type"):
        val = integration.get(key)
        if isinstance(val, str) and val:
            return val
    return ""


def list_integrations() -> list[dict]:
    """Return connected accounts as [{id, name, provider, picture}]."""
    with _client() as c:
        resp = c.get("/integrations")
        resp.raise_for_status()
        data = resp.json()
    items = data if isinstance(data, list) else data.get("integrations", [])
    return [
        {
            "id": it.get("id"),
            "name": it.get("name") or it.get("username") or _provider_of(it),
            "provider": _provider_of(it),
            "picture": it.get("picture") or it.get("avatar"),
        }
        for it in items
    ]


def upload_media(path: str) -> dict:
    """Upload a video/image file. Returns the media object {id, path}."""
    with _client() as c:
        with open(path, "rb") as f:
            resp = c.post("/upload", files={"file": f})
        resp.raise_for_status()
        return resp.json()


def create_post(
    *,
    integration_id: str,
    provider: str,
    content: str,
    media: dict | None,
    when: str = "now",
    date_iso: str | None = None,
) -> dict:
    """Create a post on one integration. `when` is 'now' or 'schedule'."""
    value_item: dict = {"content": content}
    if media:
        value_item["image"] = [{"id": media.get("id"), "path": media.get("path")}]

    post = {
        "integration": {"id": integration_id},
        "value": [value_item],
        "settings": {"__type": provider},
    }
    body: dict = {"type": when, "shortLink": False, "tags": [], "posts": [post]}
    if when == "schedule" and date_iso:
        body["date"] = date_iso

    with _client() as c:
        resp = c.post("/posts", json=body)
        resp.raise_for_status()
        return resp.json()
