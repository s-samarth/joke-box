"""Turns and shifts between beats, as get_set reports them (the same cases as beats.test.ts)."""

from app.connector.status_change import changes, status_sides
from app.schemas.set_beats import BeatIn, SetFieldIn
from app.services.set_fields import DEFAULT_FIELDS

FIELDS = [SetFieldIn.model_validate(f) for f in DEFAULT_FIELDS]


def beat(n: int, status: str | None = None) -> BeatIn:
    return BeatIn(id=f"b{n}", labels={"status": status} if status else {})


def test_turn_crosses_neutral_and_shift_stays_on_one_side() -> None:
    statuses = ["i-lose", "i-lose", "we-lose", None, "mixed", "i-win", "neutral"]
    beats = [beat(i, s) for i, s in enumerate(statuses)]
    assert changes(beats, status_sides(FIELDS)) == [
        None,  # the first
        None,  # the same status
        "shift",  # I lose to We lose
        None,  # Not sure
        "turn",  # We lose to Mixed, across the Not sure beat (Mixed is above Neutral)
        "shift",  # Mixed to I win
        "turn",  # onto Neutral
    ]


def test_without_neutral_a_win_and_a_loss_are_the_two_sides() -> None:
    field = SetFieldIn.model_validate(
        {
            "id": "s",
            "name": "Status",
            "role": "status",
            "options": [
                {"id": "w", "label": "W", "group": "win"},
                {"id": "l", "label": "L", "group": "loss"},
                {"id": "l2", "label": "L2", "group": "loss"},
            ],
        }
    )
    beats = [beat(0), BeatIn(id="a", labels={"s": "w"}), BeatIn(id="b", labels={"s": "l"})]
    beats.append(BeatIn(id="c", labels={"s": "l2"}))
    assert changes(beats, status_sides([field])) == [None, None, "turn", "shift"]


def test_no_status_field_means_no_changes() -> None:
    assert changes([beat(0, "i-win"), beat(1, "i-lose")], None) == [None, None]
