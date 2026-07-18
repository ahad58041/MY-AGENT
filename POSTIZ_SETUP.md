# Phase 3 — Connect Postiz for real posting

ReelPilot's posting code is done. To actually post to Instagram/LinkedIn/etc., you
connect your accounts through **Postiz** (self-hosted) and give ReelPilot a Postiz
API key. This is the part only you can do — it involves registering developer apps
with each platform, which the platforms gate behind approval.

---

## Step 1 — Start Postiz (Docker)

```bash
git clone https://github.com/gitroomhq/postiz-docker-compose
cd postiz-docker-compose
docker compose up -d
```

Open **http://localhost:4007**, create your admin account. (It's a ~10-container
stack — give it a minute to come up. `docker compose logs -f postiz` to watch.)

---

## Step 2 — Register developer apps (the gated part)

Self-hosted Postiz manages the OAuth login + token refresh, but you must supply your
**own** developer-app credentials for each platform. Put them in Postiz's env
(edit the compose `.env` / `postiz.env`, then `docker compose down && up -d`).

> The **authoritative, per-platform** list of env var names + exact steps is here:
> **https://docs.postiz.com/providers** — follow the page for each platform. Summary:

### Instagram + Facebook (Meta)
1. Create an app at **https://developers.facebook.com** (type: Business).
2. Add products: **Facebook Login** + **Instagram** (Graph API).
3. Your IG must be a **Business/Creator** account linked to a Facebook Page ✅ (you have this).
4. Request permissions: `instagram_content_publish`, `pages_manage_posts`,
   `pages_read_engagement`, `business_management`.
5. Complete **Business Verification + App Review** (this is the days-to-weeks wait).
6. Set the OAuth redirect to Postiz's callback (shown in Postiz's Providers docs).
7. Put the App ID/Secret into Postiz's env (var names per the Providers doc).

### LinkedIn
1. Create an app at **https://www.linkedin.com/developers/apps**.
2. Request the **Community Management API** + **Sign In with LinkedIn** products (approval-gated).
3. Set the redirect URL to Postiz's callback.
4. Put the Client ID/Secret into Postiz's env.

### YouTube / Facebook Page / others
Same pattern — see the Providers doc for each. YouTube uses a Google Cloud OAuth client.

---

## Step 3 — Connect your accounts in Postiz

In the Postiz UI → **Add Channel** → pick the platform → complete the OAuth login.
Once connected, the account (Postiz calls it a "channel"/"integration") is ready.

---

## Step 4 — Give ReelPilot a Postiz API key

1. In Postiz: **Settings → Developers → Public API → create key**.
2. Paste it into **`backend/.env`**:
   ```
   POSTIZ_API_URL=http://localhost:4007
   POSTIZ_API_KEY=<your key>
   ```
3. Restart the backend:
   ```
   cd "C:\Users\PMLS\Desktop\MY AGENT\backend" && .venv\Scripts\uvicorn app.main:app --port 8000
   ```

---

## Step 5 — Post from ReelPilot 🚀

1. Upload a video → **Generate captions** (→ optionally **Generate subtitles**).
2. Scroll to **Publish** → your connected accounts appear.
3. Tick the platforms → **Post now** or **Schedule** → done.
4. The Dashboard badge flips to **Posted**.

---

## Notes
- ReelPilot posts the **subtitled** video if you generated one, else the original.
- Each platform gets its **own** caption (Instagram/LinkedIn/YouTube/Facebook).
- If a platform isn't approved yet, connect the ones that are and add others later —
  nothing else is blocked.
