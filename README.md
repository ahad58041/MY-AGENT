# ReelPilot

**Upload one video. Get four platform-native captions. Publish everywhere.**

ReelPilot is a content-automation portal for solo creators. You upload a single short-form video with one generic caption, and it generates captions tailored to each platform's tone, length, and hashtag conventions using Google Gemini — then schedules or publishes the video to Instagram, LinkedIn, YouTube Shorts, and Facebook through a self-hosted Postiz instance.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?logo=googlegemini&logoColor=white)

---

## The problem

Cross-posting one video to four platforms means writing four captions. Instagram wants hashtags and energy. LinkedIn wants a hook and a takeaway. YouTube Shorts wants searchable keywords. Facebook wants plain conversational text. Doing this by hand for every upload is the single most repetitive task in a creator's workflow.

ReelPilot collapses it into one upload and one review screen.

---

## How it works

```
                  ┌─────────────────────────────────────────┐
   Upload video   │  React + Vite + TypeScript              │
   + one caption  │  Upload → Review → Dashboard            │
        │         └──────────────────┬──────────────────────┘
        │                            │ REST
        ▼                            ▼
┌──────────────────────────────────────────────────────────┐
│  FastAPI backend                                         │
│                                                          │
│  routers/uploads   → store video to disk, record in DB   │
│  routers/captions  → Gemini generates 4 variants         │
│  routers/publish   → hand off to Postiz                  │
│                                                          │
│  services/gemini_captions  services/subtitles            │
│  services/postiz_client    services/storage              │
└───────────┬──────────────────────────────┬───────────────┘
            │                              │
            ▼                              ▼
   ┌─────────────────┐          ┌──────────────────────┐
   │ PostgreSQL      │          │ Postiz (self-hosted) │
   │ (SQLModel)      │          │ IG · LI · YT · FB    │
   └─────────────────┘          └──────────────────────┘
```

Each platform's voice is defined as a prompt template in `backend/app/skills/captions/` — one Markdown file per platform (`instagram.md`, `linkedin.md`, `youtube.md`, `facebook.md`). Tuning a platform's tone means editing a Markdown file, not touching Python.

---

## Features

- **Platform-tailored caption generation** — four distinct captions from one input, each matching its platform's conventions
- **Prompt templates as data** — caption voice lives in editable Markdown, not hardcoded strings
- **Human review step** — every caption is editable before anything is published
- **Unified publishing** — one Postiz integration covers all four platforms, with no per-platform API approval process
- **Subtitle generation** — automatic subtitles for uploaded video
- **Local-first and free** — self-hosted Postiz, local disk storage, local Postgres, Gemini free tier. No paid services required.
- **Light and dark themes** — accessible design system, keyboard navigable, WCAG AA contrast

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Backend | Python 3.12, FastAPI, SQLModel |
| Database | PostgreSQL (via `psycopg`) |
| AI captions | Google Gemini (`google-genai` SDK) |
| Publishing | Postiz (self-hosted, Docker) |
| Storage | Local disk (`backend/storage/`) |

---

## Getting started

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+
- Docker (for Postiz)
- A Google AI Studio API key — free at [aistudio.google.com](https://aistudio.google.com)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
cp .env.example .env            # then fill in your keys

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

### Postiz

```bash
docker compose up -d postiz     # http://localhost:5000
```

Connect your social accounts in the Postiz UI, then copy the API key into `backend/.env`.

---

## Configuration

`backend/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_API_KEY` | Google AI Studio key |
| `GEMINI_MODEL` | Gemini model id (default: `gemini-3.5-flash`) |
| `POSTIZ_API_URL` | Postiz instance URL (default: `http://localhost:5000`) |
| `POSTIZ_API_KEY` | Postiz API key |

`frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend URL (default: `http://localhost:8000`) |

> Secrets live in `.env` files only — never commit them. `.env.example` ships with placeholders.

---

## Project structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint
│   │   ├── config.py            # env-driven settings
│   │   ├── models.py            # SQLModel tables
│   │   ├── db.py
│   │   ├── routers/             # uploads · captions · publish
│   │   ├── services/            # gemini_captions · postiz_client
│   │   │                        # subtitles · storage
│   │   └── skills/captions/     # per-platform prompt templates
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/               # Upload · Review · Dashboard
        ├── components/          # Layout · PublishPanel · ThemeToggle
        └── lib/                 # api client, types
```

---

## Design

Built against a documented design system: **Plus Jakarta Sans**, a rose/blue token palette, 150–300ms motion with `prefers-reduced-motion` respected, Lucide SVG icons (never emoji), ≥44px touch targets, visible focus rings, and semantic color tokens rather than raw hex in components. Responsive at 375 / 768 / 1024 / 1440.

---

## Status

Personal-scale tool, single user by design — not multi-tenant SaaS. See `IMPLEMENTATION_PLAN.md` for phased progress.

## License

MIT
