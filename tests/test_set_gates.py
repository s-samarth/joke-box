"""Gates fit their list the way the app reads them (gateRows.test.ts has the same cases): a
gate inside a gate ends inside it, and gates go two levels deep at most."""

import uuid

import pytest

from app.schemas.set_beats import PieceIn
from app.services.set_beats import clamp


def fitted(spec: str) -> str:
    """'a2 b c' is a gate over the next 2 jokes, then two jokes; the same notation comes back."""
    pieces = [PieceIn(id=t[0], joke_id=uuid.uuid4(), gate=int(t[1:] or 0)) for t in spec.split()]
    clamp(pieces)
    return " ".join(f"{p.id}{p.gate}" if p.gate else p.id for p in pieces)


@pytest.mark.parametrize(
    ("before", "after"),
    [
        ("a b5 c", "a b1 c"),  # a gate guards only jokes after it
        ("a1 b2 c d e", "a3 b2 c d e"),  # an inner gate that ran past widens the outer one
        ("a4 b3 c2 d e f", "a4 b3 c d e f"),  # a third level folds into the gate it's in
        ("a3 b1 c d e", "a3 b1 c d e"),  # two levels stay as they are
    ],
)
def test_gates_fit_their_list(before: str, after: str) -> None:
    assert fitted(before) == after
