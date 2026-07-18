from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routers import captions, publish, uploads


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="ReelPilot API", version="0.1.0", lifespan=lifespan)

# Frontend dev server (Vite). Tighten for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(uploads.router)
app.include_router(captions.router)
app.include_router(publish.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
