"""Your label fields for set beats, and the status check's top-up limit (docs/sets.md)."""

from fastapi import APIRouter

from app.auth.deps import CurrentUser, DbSession
from app.schemas.set_beats import SetFieldsIn, SetFieldsOut
from app.services.set_fields import config_of, fields_out, save_fields

router = APIRouter(prefix="/api/set-fields", tags=["sets"])


@router.get("", response_model=SetFieldsOut)
def get_fields(user: CurrentUser, db: DbSession) -> SetFieldsOut:
    """Yours, or the defaults until you change them."""
    return fields_out(config_of(db, user))


@router.put("", response_model=SetFieldsOut)
def put_fields(body: SetFieldsIn, user: CurrentUser, db: DbSession) -> SetFieldsOut:
    return save_fields(db, user, body)
