"""Test setup: a fresh database per test and signed-in clients.

Uses TEST_DATABASE_URL when set (CI runs Postgres), otherwise a temporary SQLite file.
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.connector import identity
from app.db import SessionLocal, build_engine, get_db
from app.main import app
from app.models import Base


@pytest.fixture
def session_factory(tmp_path: Path) -> Iterator[sessionmaker[Session]]:
    url = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{tmp_path / 'test.db'}"
    engine = build_engine(url)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def db(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    with session_factory() as session:
        yield session


@pytest.fixture(autouse=True)
def override_db(session_factory: sessionmaker[Session]) -> Iterator[None]:
    def _get_db() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db
    identity.use_sessions(session_factory)  # the connector opens its own sessions
    yield
    app.dependency_overrides.clear()
    identity.use_sessions(SessionLocal)


def signed_in(email: str) -> TestClient:
    """A client signed in through the local-only dev login, sending the CSRF header."""
    client = TestClient(app, headers={"X-Requested-With": "jokebox"})
    response = client.get("/auth/dev-login", params={"email": email}, follow_redirects=False)
    assert response.status_code == 303
    return client


@pytest.fixture
def alice() -> TestClient:
    return signed_in("alice@example.com")


@pytest.fixture
def bob() -> TestClient:
    return signed_in("bob@example.com")


def random_topic_id(client: TestClient) -> str:
    topics = client.get("/api/topics").json()
    return str(next(t["id"] for t in topics if t["is_system"]))
