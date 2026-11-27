"""The shape of a set's beats and of your label fields. What each part means, and why it's built
this way, is in docs/sets.md.

A set is beats in a fixed order. A beat is one ordered list of entries: a premise with its jokes,
jokes with no premise, or crowd work. Inside a list of jokes, each joke is locked or loose (loose
keeps its place, it's only marked), and a gate on a joke guards the next `gate` jokes: if it
doesn't land, they're skipped. A premise can be gated on the premise before it landing.
"""

import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.limits import INT_MAX

Id = Annotated[str, Field(min_length=1, max_length=64)]


class BridgeIn(BaseModel):
    """A bridge: a line or a few paragraphs you might say to carry the momentum from a joke or a
    block to the next one. Not a joke and not a premise, so nothing else reads it."""

    id: Id
    text: str = Field(default="", max_length=4000)


# Bridges after a joke or a block. Left out (an app from before bridges), a save keeps the stored
# ones; an empty list clears them.
Bridges = Annotated[list[BridgeIn], Field(max_length=20)]


class PieceIn(BaseModel):
    """One joke in a list. A cluster's version follows the cluster's lead unless `pinned`."""

    id: Id
    joke_id: uuid.UUID
    cluster_id: uuid.UUID | None = None
    pinned: bool = False
    loose: bool = False
    gate: int = Field(default=0, ge=0, le=500)
    bridges: Bridges | None = None


class PremiseEntry(BaseModel):
    kind: Literal["premise"]
    id: Id
    premise_id: uuid.UUID | None = None
    # Only if the premise before it in the beat landed.
    gate: bool = False
    pieces: list[PieceIn] = Field(default_factory=list, max_length=500)
    bridges: Bridges | None = None


class JokesEntry(BaseModel):
    """Jokes with no premise, which can sit between premises. The title is a short name you give
    them, like a premise's take. Left out (an older app), a save keeps the stored one."""

    kind: Literal["jokes"]
    id: Id
    title: str | None = Field(default=None, max_length=200)
    pieces: list[PieceIn] = Field(default_factory=list, max_length=500)
    bridges: Bridges | None = None


class ReplyIn(BaseModel):
    id: Id
    when: str = Field(default="", max_length=300)
    line: str = Field(default="", max_length=2000)


class QuestionIn(BaseModel):
    id: Id
    text: str = Field(default="", max_length=1000)
    has_reply: bool = False
    replies: list[ReplyIn] = Field(default_factory=list, max_length=50)


class CrowdEntry(BaseModel):
    """Crowd work: questions for the room, and lines for what they might say. Plain text."""

    kind: Literal["crowd"]
    id: Id
    title: str = Field(default="", max_length=200)
    questions: list[QuestionIn] = Field(default_factory=list, max_length=50)
    bridges: Bridges | None = None


Entry = Annotated[PremiseEntry | JokesEntry | CrowdEntry, Field(discriminator="kind")]


class BeatIn(BaseModel):
    id: Id
    cue: str = Field(default="", max_length=80)
    description: str = Field(default="", max_length=4000)
    # Set by hand for the beat. Joke times don't add up to it: a joke runs longer on stage.
    seconds: int = Field(default=0, ge=0, le=INT_MAX)
    # Field id to option id. A field left out, or an option since deleted, reads as Not sure.
    labels: dict[Id, Id] = Field(default_factory=dict, max_length=50)
    # Why the status turned from the beat before: Top-up, Planned turn, Clash, or "" (none yet).
    # Asked only for a turn (docs/sets.md); one saved before the statuses changed is kept, unshown.
    shift_reason: str = Field(default="", max_length=60)
    entries: list[Entry] = Field(default_factory=list, max_length=500)


Group = Literal["win", "neutral", "loss"]


class FieldOptionIn(BaseModel):
    id: Id
    label: str = Field(min_length=1, max_length=80)
    # What a status option means to the checks. Only the status field's options have one.
    group: Group | None = None
    # Hex. Left out (an older app), a save keeps the stored colour; none stored, the default.
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class SetFieldIn(BaseModel):
    id: Id
    name: str = Field(min_length=1, max_length=80)
    # "status" is drawn as the status track; "persona" is what the persona check counts.
    role: Literal["status", "persona"] | None = None
    options: list[FieldOptionIn] = Field(default_factory=list, max_length=40)


class SetFieldsIn(BaseModel):
    fields: list[SetFieldIn] = Field(default_factory=list, max_length=30)
    top_up_seconds: int = Field(default=240, ge=0, le=INT_MAX)

    @model_validator(mode="after")
    def one_of_each_role(self) -> "SetFieldsIn":
        """At most one status field and one persona field; ids unique."""
        roles = [f.role for f in self.fields if f.role]
        if len(roles) != len(set(roles)):
            raise ValueError("Only one field can be the status track, and one the persona")
        if len({f.id for f in self.fields}) != len(self.fields):
            raise ValueError("Two fields have the same id")
        return self


class SetFieldsOut(SetFieldsIn):
    pass
