# ReelPilot — CLAUDE.md

> Project guide for Claude Code. Read this first before working in this repo.

## What this is

**ReelPilot** is a personal content-automation portal for a solo creator. The creator
uploads **one short video** + **one generic caption**, and the system:

1. Generates **platform-tailored captions** (Instagram, LinkedIn, YouTube Shorts, Facebook)
   using Google Gemini — matching each platform's tone, length, and hashtag conventions.
2. Lets the creator review/edit the captions.
3. **Schedules or publishes** the video to all connected platforms via **Postiz**
   (self-hosted, open-source social scheduler) — no per-platform API approval needed.

This is a **personal-scale** tool (single user), not a multi-tenant SaaS. Optimize for
**free / self-hosted** over managed paid services.

## Priorities (in order)

1. **Free** — no paid APIs or services unless there is genuinely no free path. Self-host.
2. **Instagram + LinkedIn first**, then YouTube Shorts + Facebook.
3. Simple to run locally on the creator's Windows machine.

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | **React + Vite + TypeScript** | Fast dev, matches user request for React |
| Styling | **Tailwind CSS** + shadcn/ui | Design-token driven; pairs with 21st.dev + ui-ux-pro-max |
| Backend | **Python + FastAPI** | Async, great for file uploads + calling Claude/Postiz |
| DB | **PostgreSQL** (via SQLModel, `psycopg`) | Local Postgres 18 already installed; inspect data visually in pgAdmin4. Free, self-hosted |
| Task queue | **FastAPI BackgroundTasks** first; **Celery + Redis** only if needed | Keep it simple until posting volume demands async workers |
| File storage | **Local disk** (`backend/storage/`) | Free. S3/R2 optional later |
| AI captions | **Google Gemini** (`gemini-3.5-flash` default, `google-genai` SDK) | Free tier via AI Studio; model set by `GEMINI_MODEL` env var |
| Social posting | **Postiz** (self-hosted, Docker) | Free, handles IG/LinkedIn/YT/FB/TikTok OAuth + scheduling |

## Design system (from ui-ux-pro-max skill)

- **Style:** Vibrant & Block-based — bold, energetic, geometric, high contrast. Full light + dark.
- **Font:** Plus Jakarta Sans (headings + body).
- **Palette (CSS variables):**
  - `--color-primary: #E11D48` (rose) / on-primary `#FFFFFF`
  - `--color-accent: #2563EB` (CTA blue)
  - `--color-secondary: #FB7185`
  - `--color-background: #FFF1F2` / `--color-foreground: #881337`
  - `--color-muted: #F0ECF2` / `--color-border: #FECDD3`
  - `--color-destructive: #DC2626`
- **Motion:** 150–300ms transitions, ease-out enter / ease-in exit. Respect `prefers-reduced-motion`.
- **Layout:** dashboard shell (sidebar nav ≥1024px, bottom/top nav on mobile), not a landing page.

### Design rules — always follow
- No emojis as icons — use **Lucide** SVG icons.
- `cursor-pointer` on all clickable elements.
- Text contrast ≥ 4.5:1 (both light and dark).
- Visible focus rings; full keyboard nav.
- Touch targets ≥ 44px. Responsive at 375 / 768 / 1024 / 1440.
- Semantic color tokens only — no raw hex inside components.

## How to work in this repo

- **Before any UI work**, consult the `ui-ux-pro-max` skill:
  `python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <ux|style|color> `
- Use the **21st.dev** skills (`21st-registry`, `21st-ai`) to pull polished component
  examples; use `DesignSync` / `21st-design-sync` to align the look.
- **AI captions use Google Gemini** via the `google-genai` SDK (`app/services/gemini_captions.py`).
  Model is set by `GEMINI_MODEL` in `.env`. Free key from https://aistudio.google.com.
- **To test the running app**, use the `webapp-testing` skill (Playwright).

## Secrets & config

- All secrets live in **`.env` files, never in code or git**.
  - `backend/.env`: `DATABASE_URL`, `GOOGLE_API_KEY`, `GEMINI_MODEL`, `POSTIZ_API_URL`, `POSTIZ_API_KEY`
  - `frontend/.env`: `VITE_API_BASE_URL`
- Ship **`.env.example`** files with placeholder keys.
- ⚠️ The 21st.dev key shared in chat is exposed — the creator should rotate it.

## Repo layout (target)

```
MY AGENT/
├── CLAUDE.md                ← this file
├── IMPLEMENTATION_PLAN.md   ← phased build plan
├── .claude/skills/          ← ui-ux-pro-max, webapp-testing (+ global 21st skills)
├── backend/                 ← FastAPI app
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models.py        ← SQLModel tables
│   │   ├── routers/         ← uploads, captions, publish, accounts
│   │   ├── services/        ← claude_captions.py, postiz_client.py, storage.py
│   │   └── db.py
│   ├── storage/             ← uploaded videos (gitignored)
│   ├── requirements.txt
│   └── .env.example
├── frontend/                ← React + Vite + TS
│   ├── src/
│   │   ├── pages/           ← Upload, Review, Dashboard, Accounts
│   │   ├── components/
│   │   ├── lib/             ← api client, theme tokens
│   │   └── main.tsx
│   └── .env.example
└── docker-compose.yml       ← Postiz (+ optional Redis) for local run
```

## Commands

```bash
# Backend
cd backend && python -m venv .venv && .venv/Scripts/activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev   # http://localhost:5173

# Postiz (social posting) — self-hosted
docker compose up -d postiz                 # http://localhost:5000
```

## Current status

See `IMPLEMENTATION_PLAN.md` for phases and progress. Phase 1 (scaffold + upload) is the
active starting point.
