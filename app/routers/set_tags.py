"""Set tags: your own labels for sets. Deleting one takes it off every set."""

import uuid

from fastapi import APIRouter
from sqlalchemy import func, select

from app.auth.deps import CurrentUser, DbSession, get_owned
from app.models import SetTag
from app.schemas.library import NamedOut, NameIn
from app.services.topics import commit_or_conflict

router = APIRouter(prefix="/api/set-tags", tags=["sets"])

CLASH = "A set tag with that name already exists"


@router.get("", response_model=list[NamedOut])
def list_tags(user: CurrentUser, db: DbSession) -> list[SetTag]:
    query = select(SetTag).where(SetTag.user_id == user.id).order_by(SetTag.position, SetTag.name)
    return list(db.scalars(query))


@router.post("", response_model=NamedOut, status_code=201)
def create_tag(body: NameIn, user: CurrentUser, db: DbSession) -> SetTag:
    """A new tag goes last."""
    last = db.scalar(select(func.max(SetTag.position)).where(SetTag.user_id == user.id))
    tag = SetTag(user_id=user.id, name=body.name, position=(last or 0) + 1)
    db.add(tag)
    commit_or_conflict(db, CLASH)
    return tag


@router.patch("/{tag_id}", response_model=NamedOut)
def rename_tag(tag_id: uuid.UUID, body: NameIn, user: CurrentUser, db: DbSession) -> SetTag:
    tag = get_owned(db, SetTag, tag_id, user)
    tag.name = body.name
    commit_or_conflict(db, CLASH)
    return tag


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    db.delete(get_owned(db, SetTag, tag_id, user))
    db.commit()
