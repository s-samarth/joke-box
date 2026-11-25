"""Anyone can register a connector app, so ones that never sign in are cleared out after a week.
Ones that did sign in stay, whatever happens to their tokens."""

from datetime import timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import ConnectorClient
from app.models.base import utcnow
from tests.conftest import signed_in
from tests.connector_auth import connect, register


def client_ids(db: Session) -> set[str]:
    db.expire_all()
    return set(db.scalars(select(ConnectorClient.client_id)))


def test_registrations_that_never_signed_in_are_cleared_after_a_week(db: Session) -> None:
    browser = signed_in("dev@example.com")
    abandoned = register(browser).json()["client_id"]
    recent = register(browser).json()["client_id"]
    used = connect(browser)["client_id"]
    a_week_ago = utcnow() - timedelta(days=8)
    old = ConnectorClient.client_id.in_([abandoned, used])
    db.execute(update(ConnectorClient).where(old).values(created_at=a_week_ago))
    db.commit()
    newest = register(browser).json()["client_id"]  # registering is when the clear-out runs
    assert client_ids(db) == {recent, used, newest}
    row = db.scalar(select(ConnectorClient).where(ConnectorClient.client_id == used))
    assert row is not None and row.signed_in_at is not None


def test_a_registration_bigger_than_a_real_one_is_refused(db: Session) -> None:
    """Anyone can register without signing in, so a huge one must not reach the database."""
    browser = signed_in("dev@example.com")
    body = {
        "redirect_uris": ["https://claude.ai/api/mcp/auth_callback"],
        "client_name": "Claude",
        "token_endpoint_auth_method": "none",
        "jwks": {"keys": [{"k": "x" * 100_000}]},
    }
    response = browser.post("/register", json=body)
    assert response.status_code == 400
    assert response.json()["error"] == "invalid_client_metadata"
    long_name = {**body, "client_name": "C" * 101}
    long_name.pop("jwks")
    assert browser.post("/register", json=long_name).status_code == 400
    assert client_ids(db) == set()
    assert register(browser).status_code == 201  # a real one still registers
