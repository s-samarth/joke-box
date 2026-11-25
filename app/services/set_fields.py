"""Your label fields for beats. Until you change them, everyone has the same four (docs/sets.md
says why these). "Not sure" is never stored as an option: a beat with no label for a field is
Not sure, so it's always there and can't be deleted."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SetFieldConfig, User
from app.schemas.set_beats import SetFieldsIn, SetFieldsOut


def options(*labels: tuple[str, str, str | None]) -> list[dict[str, Any]]:
    return [{"id": i, "label": label, "group": group} for i, label, group in labels]


# Status options say what they mean to the checks: a loss is a humility top-up, a win isn't, and
# neutral (the room and you attacking the system together) is neither.
DEFAULT_FIELDS: list[dict[str, Any]] = [
    {
        "id": "status",
        "name": "Status",
        "role": "status",
        "options": options(
            ("i-win", "I win", "win"),
            ("mixed", "Mixed", "loss"),
            ("neutral", "System attack / Neutral", "neutral"),
            ("we-lose", "We lose", "loss"),
            ("i-lose", "I lose", "loss"),
        ),
    },
    {
        "id": "persona",
        "name": "Persona side",
        "role": "persona",
        "options": options(
            ("riled-up", "Riled up", None),
            ("bakchod", "Bakchod", None),
            ("point-prover", "Point prover", None),
        ),
    },
    {
        "id": "tone",
        "name": "Tone",
        "role": None,
        "options": options(
            ("opinionated", "Opinionated", None),
            ("playful", "Playful", None),
            ("edgy", "Edgy", None),
            ("heartfelt", "Heartfelt", None),
        ),
    },
    {
        "id": "voice",
        "name": "Voice fit",
        "role": None,
        "options": options(
            ("mine", "Mine", None), ("half", "Half", None), ("anyones", "Anyone's", None)
        ),
    },
]


def config_of(db: Session, user: User) -> SetFieldConfig | None:
    return db.scalar(select(SetFieldConfig).where(SetFieldConfig.user_id == user.id))


def fields_out(config: SetFieldConfig | None) -> SetFieldsOut:
    if config is None:
        return SetFieldsOut.model_validate({"fields": DEFAULT_FIELDS})
    return SetFieldsOut(fields=config.fields, top_up_seconds=config.top_up_seconds)  # type: ignore[arg-type]


def save_fields(db: Session, user: User, body: SetFieldsIn) -> SetFieldsOut:
    """The whole list at once; the last save wins (it's settings, edited in one place)."""
    config = config_of(db, user) or SetFieldConfig(user_id=user.id, fields=[])
    config.fields = [f.model_dump(mode="json") for f in body.fields]
    config.top_up_seconds = body.top_up_seconds
    db.add(config)
    db.commit()
    return fields_out(config)
