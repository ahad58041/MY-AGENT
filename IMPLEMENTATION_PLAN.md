# ReelPilot — Implementation Plan

A phased build. Each phase produces something you can **see and use** before moving on.
Nothing in Phases 1–2 is blocked on any social-platform approval, so we get value fast.

---

## The flow (end to end)

```
                        ┌─────────────────────────────────────────┐
   You upload           │  ReelPilot Portal (React)               │
   1 video +            │  Upload → Review captions → Publish      │
   1 generic caption ──▶│                                          │
                        └───────────────┬─────────────────────────┘
                                        │  REST API
                                        ▼
                        ┌─────────────────────────────────────────┐
                        │  Backend (FastAPI + SQLite)              │
                        │  • stores video                          │
                        │  • asks Claude for per-platform captions │
                        │  • sends video+caption to Postiz         │
                        └───────┬───────────────────────┬─────────┘
                                │                        │
                                ▼                        ▼
                     ┌───────────────────┐   ┌───────────────────────┐
                     │  Claude API        │   │  Postiz (self-hosted) │
                     │  writes captions   │   │  posts to IG/LinkedIn │
                     │  per platform      │   │  /YT Shorts/FB        │
                     └───────────────────┘   └───────────────────────┘
```

**Why Postiz?** Posting directly to Instagram/LinkedIn requires *you* to pass Meta App
Review and LinkedIn's Community Management API approval — slow, and not designed for a
one-person tool. Postiz is free, open-source, self-hostable, and already handles all that
OAuth. We call it from our backend after Claude writes the captions.

---

## Phase 0 — Setup & scaffolding  ✅ (in progress)

**Goal:** repo structure + both apps boot with a "hello" screen.

- [x] Install design skills (ui-ux-pro-max, webapp-testing, 21st.dev). Log into 21st.
- [x] Write `CLAUDE.md` + this plan.
- [ ] Scaffold `backend/` (FastAPI, SQLModel, config, `.env.example`).
- [ ] Scaffold `frontend/` (Vite + React + TS + Tailwind + shadcn/ui, theme tokens).
- [ ] `docker-compose.yml` with Postiz (we start it in Phase 3).

**You can see:** backend at `localhost:8000/docs`, frontend at `localhost:5173`.

---

## Phase 1 — Upload portal  🎯 first real feature

**Goal:** upload a video + type a generic caption; it's saved and listed.

- [ ] Backend: `POST /api/uploads` (multipart video → `storage/`, row in DB).
- [ ] Backend: `GET /api/uploads` list, `GET /api/uploads/{id}`.
- [ ] Frontend: **Upload page** — drag-and-drop video, caption textarea, submit.
- [ ] Frontend: video preview + upload progress + success state.
- [ ] Validation: file type (mp4/mov), size cap, friendly errors.

**You can see:** drop a reel, add a caption, see it saved in a list. No AI yet.

**Design:** dashboard shell (sidebar), Vibrant & Block style, Plus Jakarta Sans, rose/blue
tokens. Run `ui-ux-pro-max --domain ux "forms upload feedback"` before building.

---

## Phase 2 — AI captions per platform  🤖 the smart part

**Goal:** turn 1 generic caption into 4 tailored ones you can edit.

- [ ] Backend service `claude_captions.py`: one call → JSON with captions for
      Instagram, LinkedIn, YouTube Shorts, Facebook (correct tone + hashtag rules per
      platform; LinkedIn professional, IG hashtag-heavy, YT title+description, FB casual).
- [ ] Backend: `POST /api/uploads/{id}/generate-captions`.
- [ ] Frontend: **Review page** — tabbed/cards per platform, each caption editable,
      "regenerate" button, character counters per platform limit.
- [ ] Save edited captions back to DB.

**You can see:** upload → click Generate → 4 platform captions appear → tweak them.
**Before coding:** read the `claude-api` skill for model IDs + structured-output patterns.

---

## Phase 3 — Connect accounts & publish  🚀 posting

**Goal:** actually push the video + captions out.

- [ ] `docker compose up postiz`; connect IG + LinkedIn (then YT, FB) inside Postiz UI.
- [ ] Backend `postiz_client.py`: create post (video + per-channel caption), schedule or
      publish-now, read back status.
- [ ] Frontend: **Publish page** — pick platforms, "post now" or schedule (date/time),
      confirmation + link to the Postiz post.
- [ ] Store publish results (per-platform status) in DB.

**You can see:** one click → the reel goes to Instagram + LinkedIn with the right caption.
**Your to-dos here:** have IG as Business/Creator, connect each account in Postiz once.

---

## Phase 4 — Dashboard & history  📊 polish

**Goal:** a home base to see everything.

- [ ] **Dashboard**: recent uploads, publish status per platform, quick re-post.
- [ ] Filters (platform, status, date), empty states, skeleton loaders.
- [ ] Dark mode pass + accessibility pass (contrast, keyboard, reduced-motion).
- [ ] End-to-end test with `webapp-testing` (Playwright).

**You can see:** a real dashboard of your content pipeline.

---

## Later / optional (not now)

- Auto-transcribe video → caption suggestions (Whisper, local/free).
- Best-time-to-post suggestions.
- Multiple "brand voices" / caption presets.
- Swap SQLite→Postgres, add Celery+Redis if volume grows.
- Move storage to S3/R2 if disk gets tight.

---

## What only YOU can do (blockers I can't clear)

1. **Rotate the 21st.dev API key** you pasted in chat (it's exposed). Put the new one in
   `backend/.env`.
2. **Instagram** account must be **Business or Creator** (not personal) to post via API.
3. In **Phase 3**, connect each social account inside the Postiz UI once (OAuth login).
4. Get **Docker Desktop** running on Windows (needed to self-host Postiz) — free.
5. Provide an **Anthropic API key** for caption generation (paid per-use, but cheap with
   Haiku; a few captions cost fractions of a cent).

I'll flag each of these again when we reach the phase that needs it.
