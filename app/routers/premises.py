"""Premises: list, create-or-update by client id, delete."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select, update

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import Joke, Premise, Topic
from app.schemas.premises import PremiseIn, PremiseOut
from app.services.ordering import next_position

router = APIRouter(prefix="/api/premises", tags=["premises"])


@router.get("", response_model=list[PremiseOut])
def list_premises(user: CurrentUser, db: DbSession) -> list[Premise]:
    query = (
        select(Premise)
        .where(Premise.user_id == user.id)
        .order_by(Premise.position, Premise.created_at)
    )
    return list(db.scalars(query))


@router.put("/{premise_id}", response_model=PremiseOut)
def put_premise(
    premise_id: uuid.UUID, body: PremiseIn, user: CurrentUser, db: DbSession
) -> Premise:
    """Create or update. The client picks the id, so a retried offline save never duplicates."""
    topic = db.scalar(select(Topic).where(Topic.id == body.topic_id, Topic.user_id == user.id))
    if topic is None:
        raise HTTPException(422, "Unknown topic")
    premise = find_owned(db, Premise, premise_id, user)
    if premise is None:
        position = next_position(db, Premise.position, Premise.user_id == user.id)
        premise = Premise(id=premise_id, user_id=user.id, position=position)
        db.add(premise)
    premise.topic_id, premise.take, premise.notes = body.topic_id, body.take, body.notes
    db.commit()
    db.refresh(premise)
    return premise


@router.delete("/{premise_id}", status_code=204)
def delete_premise(premise_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """The premise goes; its jokes stay where they are, resting on nothing."""
    premise = get_owned(db, Premise, premise_id, user)
    db.execute(
        update(Joke)
        .where(Joke.user_id == user.id, Joke.premise_id == premise.id)
        .values(premise_id=None)
    )
    db.delete(premise)
    db.commit()
