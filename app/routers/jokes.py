"""Jokes: list, read, create-or-update by client id, delete."""

import uuid

from fastapi import APIRouter
from fastapi.routing import APIRoute
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import Joke
from app.schemas.library import JokeIn, JokeOut
from app.services import jokes as svc
from app.services import trash

router = APIRouter(prefix="/api/jokes", tags=["jokes"])


@router.get("", response_model=list[JokeOut])
def list_jokes(user: CurrentUser, db: DbSession) -> list[JokeOut]:
    """The whole library. Searching and filtering happen in the browser, so they work offline."""
    query = (
        select(Joke)
        .where(Joke.user_id == user.id)
        .options(selectinload(Joke.types), selectinload(Joke.status))
        .order_by(Joke.created_at.desc())
    )
    return [svc.to_out(b) for b in db.scalars(query)]


@router.get("/{joke_id}", response_model=JokeOut)
def get_joke(joke_id: uuid.UUID, user: CurrentUser, db: DbSession) -> JokeOut:
    return svc.to_out(get_owned(db, Joke, joke_id, user))


@router.put("/{joke_id}", response_model=JokeOut)
def put_joke(joke_id: uuid.UUID, body: JokeIn, user: CurrentUser, db: DbSession) -> JokeOut:
    """Create or update. The client picks the id, so a retried offline save never duplicates."""
    existing = find_owned(db, Joke, joke_id, user)
    return svc.to_out(svc.save(db, user, joke_id, body, existing))


@router.delete("/{joke_id}", status_code=204)
def delete_joke(joke_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """To the Trash, with its rewrites. Its places in sets wait for it there."""
    trash.move_to_trash(db, user, Joke, joke_id)


# The old address, for app versions from before the rename (see app/schemas/legacy.py).
legacy_router = APIRouter(include_in_schema=False)
for route in router.routes:
    if isinstance(route, APIRoute):
        legacy_router.add_api_route(
            route.path.replace("/api/jokes", "/api/bits", 1),
            route.endpoint,
            methods=list(route.methods or ()),
            response_model=route.response_model,
            status_code=route.status_code,
        )
