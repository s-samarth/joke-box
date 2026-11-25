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
        "name": "Dominant persona side",
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


# Each default option's colour (web/src/lib/labelColors.ts has the same map): Status runs green
# to red, Tone matches the word, Voice fit fades to stone. Filled in for options saved without one.
DEFAULT_COLORS = {
    "i-win": "#74d3a8",
    "mixed": "#bef264",
    "neutral": "#93c5fd",
    "we-lose": "#fca5a5",
    "i-lose": "#ff5a47",
    "riled-up": "#ff5a47",
    "bakchod": "#9db4ff",
    "point-prover": "#74d3a8",
    "opinionated": "#c4b5fd",
    "playful": "#67e8f9",
    "edgy": "#f43f5e",
    "heartfelt": "#f9a8d4",
    "mine": "#74d3a8",
    "half": "#bef264",
    "anyones": "#a8a29e",
}


def with_colors(fields: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Options with no colour get their default by id (others stay None: shown plain)."""
    return [
        {
            **f,
            "options": [
                {**o, "color": o.get("color") or DEFAULT_COLORS.get(o["id"])}
                for o in f.get("options", [])
            ],
        }
        for f in fields
    ]


def config_of(db: Session, user: User) -> SetFieldConfig | None:
    return db.scalar(select(SetFieldConfig).where(SetFieldConfig.user_id == user.id))


def fields_out(config: SetFieldConfig | None) -> SetFieldsOut:
    if config is None:
        return SetFieldsOut.model_validate({"fields": with_colors(DEFAULT_FIELDS)})
    return SetFieldsOut.model_validate(
        {"fields": with_colors(config.fields), "top_up_seconds": config.top_up_seconds}
    )


def save_fields(db: Session, user: User, body: SetFieldsIn) -> SetFieldsOut:
    """The whole list at once; the last save wins (it's settings, edited in one place)."""
    config = config_of(db, user) or SetFieldConfig(user_id=user.id, fields=[])
    stored = {
        (f["id"], o["id"]): o.get("color") for f in config.fields for o in f.get("options", [])
    }
    fields = [f.model_dump(mode="json") for f in body.fields]
    for f, field_in in zip(fields, body.fields, strict=True):
        for o, option_in in zip(f["options"], field_in.options, strict=True):
            if "color" not in option_in.model_fields_set:  # an older app: keep what's stored
                o["color"] = stored.get((f["id"], o["id"]))
    config.fields = fields
    config.top_up_seconds = body.top_up_seconds
    db.add(config)
    db.commit()
    return fields_out(config)
