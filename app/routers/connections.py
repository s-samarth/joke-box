"""Apps you've connected to JokeBox (Claude, through the connector), and disconnecting them."""

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import delete, select

from app.auth.deps import CurrentUser, DbSession
from app.models import ConnectorClient, ConnectorToken
from app.models.base import utcnow

router = APIRouter(prefix="/api/connections", tags=["connections"])


class ConnectionOut(BaseModel):
    client_id: str
    name: str
    # The last time it signed in or refreshed its access, which it does about hourly in use.
    last_used_at: datetime


@router.get("", response_model=list[ConnectionOut])
def list_connections(user: CurrentUser, db: DbSession) -> list[ConnectionOut]:
    """Apps still signed in: the ones holding a refresh token that hasn't run out."""
    rows = db.execute(
        select(ConnectorToken.client_id, ConnectorToken.created_at, ConnectorClient.info)
        .join(ConnectorClient, ConnectorClient.client_id == ConnectorToken.client_id)
        .where(
            ConnectorToken.user_id == user.id,
            ConnectorToken.kind == "refresh",
            ConnectorToken.expires_at > utcnow(),
        )
    )
    latest: dict[str, ConnectionOut] = {}
    for client_id, created_at, info in rows:
        seen = latest.get(client_id)
        if seen is None or created_at > seen.last_used_at:
            name = str(info.get("client_name") or "An app")
            latest[client_id] = ConnectionOut(
                client_id=client_id, name=name, last_used_at=created_at
            )
    return sorted(latest.values(), key=lambda c: c.last_used_at, reverse=True)


@router.delete("/{client_id}", status_code=204)
def disconnect(client_id: str, user: CurrentUser, db: DbSession) -> None:
    """Sign the app out: its tokens stop working at once. It can connect again later."""
    db.execute(
        delete(ConnectorToken).where(
            ConnectorToken.user_id == user.id, ConnectorToken.client_id == client_id
        )
    )
    db.commit()
