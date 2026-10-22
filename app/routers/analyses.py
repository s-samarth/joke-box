"""Analyses: your write-ups of sets and online jokes, each with a name, a link and the text."""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import Analysis, WatchItem
from app.schemas.study import AnalysisIn, AnalysisOut
from app.services.trash import move_to_trash

router = APIRouter(prefix="/api/analyses", tags=["analyses"])


@router.get("", response_model=list[AnalysisOut])
def list_analyses(user: CurrentUser, db: DbSession) -> list[Analysis]:
    query = select(Analysis).where(Analysis.user_id == user.id)
    return list(db.scalars(query.order_by(Analysis.updated_at.desc())))


@router.put("/{analysis_id}", response_model=AnalysisOut)
def put_analysis(
    analysis_id: uuid.UUID, body: AnalysisIn, user: CurrentUser, db: DbSession
) -> Analysis:
    """Create or update. The client picks the id, so a save made offline replays safely."""
    if body.watch_item_id is not None:
        get_owned(db, WatchItem, body.watch_item_id, user, in_trash=True)  # only your own routines
    analysis = find_owned(db, Analysis, analysis_id, user)
    if analysis is None:
        analysis = Analysis(id=analysis_id, user_id=user.id)
        db.add(analysis)
    for field, value in body.model_dump().items():
        setattr(analysis, field, value)
    db.commit()
    db.refresh(analysis)
    return analysis


@router.delete("/{analysis_id}", status_code=204)
def delete_analysis(analysis_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    move_to_trash(db, user, Analysis, analysis_id)
