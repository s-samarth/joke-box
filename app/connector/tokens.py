"""Storage for the connector's sign-in: registered clients, and tokens kept only as hashes.

Tokens and codes are random 256-bit values. Only their SHA-256 hash is stored, so a copy of the
database can't be used to read anyone's JokeBox.

A refresh token is swapped for a new pair each time it's used. If the reply carrying the new
pair is lost, Claude still holds only the old one, so that keeps working for GRACE after its
first use (a retry, or two refreshes at once, both get a pair); after that a copy stops working.
"""

import hashlib
import secrets
import uuid
from datetime import timedelta
from typing import Any

from mcp.shared.auth import OAuthClientInformationFull, OAuthToken
from sqlalchemy import delete, select, update

from app.connector import identity
from app.models import ConnectorClient, ConnectorToken
from app.models.base import utcnow

LIFETIME = {
    "code": timedelta(minutes=5),
    "access": timedelta(hours=1),
    "refresh": timedelta(days=30),
}
GRACE = timedelta(seconds=60)


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def load_client(client_id: str) -> OAuthClientInformationFull | None:
    with identity.sessions() as db:
        row = db.scalar(select(ConnectorClient).where(ConnectorClient.client_id == client_id))
        return OAuthClientInformationFull.model_validate(row.info) if row else None


def save_client(info: OAuthClientInformationFull) -> None:
    with identity.sessions() as db:
        db.add(ConnectorClient(client_id=info.client_id, info=info.model_dump(mode="json")))
        db.commit()


def find(token: str, kind: str, client_id: str | None = None) -> ConnectorToken | None:
    """A live token of this kind, by its value."""
    with identity.sessions() as db:
        query = select(ConnectorToken).where(
            ConnectorToken.token_hash == digest(token),
            ConnectorToken.kind == kind,
            ConnectorToken.expires_at > utcnow(),
        )
        row = db.scalar(query)
        return row if row and client_id in (None, row.client_id) else None


def store(user_id: uuid.UUID, client_id: str, kind: str, scopes: list[str], **details: Any) -> str:
    """Make a token, keep its hash, and return the value (shown once, never stored)."""
    value = secrets.token_urlsafe(32)
    with identity.sessions() as db:
        db.add(
            ConnectorToken(
                user_id=user_id,
                client_id=client_id,
                kind=kind,
                token_hash=digest(value),
                scopes=scopes,
                expires_at=utcnow() + LIFETIME[kind],
                details=details,
            )
        )
        db.commit()
    return value


def use_up(token: str, kind: str) -> bool:
    """Delete a sign-in code as it's used. False if it was already used: each works once, so a
    stolen copy fails as soon as the real one has been used (or vice versa)."""
    with identity.sessions() as db:
        query = delete(ConnectorToken).where(
            ConnectorToken.token_hash == digest(token), ConnectorToken.kind == kind
        )
        used = bool(db.execute(query).rowcount)  # type: ignore[attr-defined]
        db.commit()
        return used


def issue(user_id: uuid.UUID, client_id: str, scopes: list[str]) -> OAuthToken:
    """A fresh access token and refresh token, after clearing this user's expired ones."""
    with identity.sessions() as db:
        db.execute(
            delete(ConnectorToken).where(
                ConnectorToken.user_id == user_id, ConnectorToken.expires_at <= utcnow()
            )
        )
        db.commit()
    return OAuthToken(
        access_token=store(user_id, client_id, "access", scopes),
        token_type="Bearer",
        expires_in=int(LIFETIME["access"].total_seconds()),
        refresh_token=store(user_id, client_id, "refresh", scopes),
        scope=" ".join(scopes),
    )


def spend_refresh(token: str) -> bool:
    """Use a refresh token: False if it no longer works. It isn't deleted but cut to GRACE, so
    a retry after a lost reply still gets a pair; after that it stops working."""
    now = utcnow()
    with identity.sessions() as db:
        same = (ConnectorToken.token_hash == digest(token), ConnectorToken.kind == "refresh")
        first_use = update(ConnectorToken).where(*same, ConnectorToken.expires_at > now + GRACE)
        cut = db.execute(first_use.values(expires_at=now + GRACE))
        first = bool(cut.rowcount)  # type: ignore[attr-defined]
        db.commit()
        return first or bool(
            db.scalar(select(ConnectorToken.id).where(*same, ConnectorToken.expires_at > now))
        )


def forget(user_id: uuid.UUID, client_id: str) -> None:
    """Sign a client out of one user's JokeBox: all its tokens go."""
    with identity.sessions() as db:
        db.execute(
            delete(ConnectorToken).where(
                ConnectorToken.user_id == user_id, ConnectorToken.client_id == client_id
            )
        )
        db.commit()
