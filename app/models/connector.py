"""Sign-in for the Claude connector: apps that registered, and the tokens they hold.

Claude signs in with OAuth. It registers itself once (a client), then each sign-in gives it a
short-lived access token and a refresh token. Tokens and codes are stored only as SHA-256
hashes, so a copy of the database can't be used to read anyone's JokeBox.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin, UTCDateTime


class ConnectorClient(IdMixin, TimestampMixin, Base):
    """An app that registered itself (OAuth dynamic client registration). Not anyone's yet:
    it reaches a JokeBox only once that person signs in and allows it."""

    __tablename__ = "connector_clients"

    client_id: Mapped[str] = mapped_column(String(64), unique=True)
    # The registration as the OAuth library keeps it: name, redirect URLs, secret, auth method.
    info: Mapped[dict[str, Any]] = mapped_column(JSON)


class ConnectorToken(IdMixin, TimestampMixin, Base):
    """A sign-in code, access token or refresh token one user gave one client."""

    __tablename__ = "connector_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    client_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("connector_clients.client_id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(10))  # code, access or refresh
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime())
    # For a code: what the token request must match (PKCE challenge, redirect URL, resource).
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
