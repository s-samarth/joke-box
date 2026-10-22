"""Creative Studio brainstorms. Every save appends a version snapshot."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import Bit, Brainstorm, BrainstormVersion
from app.schemas.shows import BrainstormIn, BrainstormOut
from app.services.trash import move_to_trash

router = APIRouter(prefix="/api", tags=["studio"])


@router.get("/brainstorms", response_model=list[BrainstormOut])
def list_brainstorms(user: CurrentUser, db: DbSession) -> list[Brainstorm]:
    query = (
        select(Brainstorm)
        .where(Brainstorm.user_id == user.id)
        .options(selectinload(Brainstorm.versions))
        .order_by(Brainstorm.updated_at.desc())
    )
    return list(db.scalars(query))


@router.put("/brainstorms/{brainstorm_id}", response_model=BrainstormOut)
def save_brainstorm(
    brainstorm_id: uuid.UUID, body: BrainstormIn, user: CurrentUser, db: DbSession
) -> Brainstorm:
    get_owned(db, Bit, body.bit_id, user)
    brainstorm = find_owned(db, Brainstorm, brainstorm_id, user)
    if brainstorm is None:
        brainstorm = Brainstorm(id=brainstorm_id, user_id=user.id, bit_id=body.bit_id)
        db.add(brainstorm)
    elif brainstorm.bit_id != body.bit_id:
        raise HTTPException(422, "A brainstorm can't move to another joke")
    brainstorm.title = body.title
    brainstorm.content = body.content
    brainstorm.timer_seconds = body.timer_seconds
    brainstorm.versions.append(BrainstormVersion(title=body.title, content=body.content))
    db.commit()
    db.refresh(brainstorm)
    return brainstorm


@router.delete("/brainstorms/{brainstorm_id}", status_code=204)
def delete_brainstorm(brainstorm_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    move_to_trash(db, user, Brainstorm, brainstorm_id)


@router.delete("/brainstorm-versions/{version_id}", status_code=204)
def delete_version(version_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    version = db.get(BrainstormVersion, version_id)
    if version is None:
        raise HTTPException(404, "Version not found")
    get_owned(db, Brainstorm, version.brainstorm_id, user)
    db.delete(version)
    db.commit()
