from collections.abc import Iterator

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)

# Lightweight dev migrations (columns added after the table first shipped).
# Postgres supports IF NOT EXISTS, so these are safe to run on every startup.
_MIGRATIONS = [
    "ALTER TABLE upload ADD COLUMN IF NOT EXISTS subtitled_path VARCHAR",
    "ALTER TABLE upload ADD COLUMN IF NOT EXISTS transcript VARCHAR",
]


def init_db() -> None:
    # Import models so their tables register on SQLModel.metadata before create_all.
    from app import models  # noqa: F401

    SQLModel.metadata.create_all(engine)
    with engine.begin() as conn:
        for stmt in _MIGRATIONS:
            conn.execute(text(stmt))


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
