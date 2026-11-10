"""The writing pulse Claude reads gives the same answers as the one on the Daily activity screen.

The first cases are the ones in web/src/features/daily/pulse.test.ts, with the same expected
numbers and sentences: the screen and the tool are separate code, and these keep them in step.
Made-up material only.
"""

import uuid
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.connector import pulse
from app.connector.pulse import JokeRow, NotedRow, PremiseRow, days_ago, work_out
from app.connector.pulse_notes import part_of_day
from app.connector.text import IST
from tests.conftest import random_topic_id, signed_in
from tests.test_connector_voice import user
from tests.test_jokes import put_joke

TODAY = date(2026, 11, 11)


def at(ago: int, hour: int = 12) -> datetime:
    """`hour` o'clock in India, `ago` days before TODAY."""
    return datetime(2026, 11, 11, hour, tzinfo=IST) - timedelta(days=ago)


def joke(ago: int, hour: int = 12, **extra: str | None) -> JokeRow:
    fields: dict[str, str | None] = {"punchline": "A made-up punch", "status": "Draft"} | extra
    return JokeRow(str(uuid.uuid4()), at(ago, hour), at(ago), **fields)  # type: ignore[arg-type]


def premise(ago: int, premise_id: str = "") -> PremiseRow:
    return PremiseRow(premise_id or str(uuid.uuid4()), at(ago))


def noted(ago: int, used: bool = False, hour: int = 12, joke_ids: tuple[str, ...] = ()) -> NotedRow:
    used = used or bool(joke_ids)
    return NotedRow(str(uuid.uuid4()), at(ago, hour), "t1", "Trains", joke_ids, used)


def test_days_ago_go_by_the_calendar_in_india() -> None:
    assert days_ago(at(0), TODAY) == 0
    assert days_ago(datetime.fromisoformat("2026-11-10T19:00:00+00:00"), TODAY) == 0
    assert days_ago(at(30), TODAY) == 30


def test_the_last_30_days_against_the_30_before() -> None:
    out = work_out([joke(0), joke(29), joke(30), joke(59), joke(60)], [], [noted(3)], TODAY)
    assert out["written"] == [
        {"kind": "observations", "last_30_days": 1, "the_30_days_before": 0},
        {"kind": "premises", "last_30_days": 0, "the_30_days_before": 0},
        {"kind": "jokes", "last_30_days": 2, "the_30_days_before": 2},
    ]


def test_ideas_are_followed_through_over_the_last_90_days_only() -> None:
    jokes = [
        joke(1, premise_id="built", status="Stage Ready"),
        joke(2, punchline="  "),
        joke(120, status="Complete"),
    ]
    premises = [premise(10, "built"), premise(12), premise(300)]
    out = work_out(jokes, premises, [noted(5, used=True), noted(6), noted(200, used=True)], TODAY)
    assert [(s["done"], s["of"]) for s in out["how_far_ideas_got"]] == [(1, 2)] * 4
    assert out["how_far_ideas_got"][0]["step"] == "Observations that led somewhere"


def test_what_sits_idle_is_listed_and_what_does_not_is_left_out() -> None:
    jokes = [joke(40), joke(45, status="Stage Ready"), joke(3)]
    out = work_out(jokes, [premise(4)], [noted(1), noted(2), noted(3, used=True)], TODAY)
    assert out["sitting_idle"] == [
        {"what": "observations nothing has come from", "count": 2},
        {"what": "premises with no joke yet", "count": 1},
        {"what": "drafts not touched in 30 days", "count": 1},
    ]


def test_nothing_is_said_until_there_is_enough_to_go_on() -> None:
    out = work_out([joke(1)], [], [noted(1)], TODAY)
    assert (out["too_little_yet"], out["worth_knowing"]) == (True, [])


def test_a_quiet_kind_the_biggest_unused_pile_and_when_the_writing_happens() -> None:
    kept = joke(1, 23)
    observations = [noted(i * 7, hour=23) for i in range(6)] + [
        noted(2, hour=23, joke_ids=(kept.id,))
    ]
    out = work_out([kept, joke(8, 23), joke(15, 23)], [premise(40)], observations, TODAY)
    assert out["worth_knowing"] == [
        "No new premise in 40 days.",
        "Trains holds 7 observations and 1 joke has come from them: 6 are still unused.",
        "You write most on Wednesdays (6 of your last 11 pieces), and mostly at night.",
    ]


def test_the_part_of_the_day() -> None:
    parts = ["in the morning", "in the afternoon", "in the evening", "at night", "at night"]
    assert [part_of_day(h) for h in (5, 12, 17, 22, 2)] == parts


def test_it_reads_your_own_writing_and_leaves_the_trash_out(db: Session) -> None:
    dev, alice = signed_in("dev@example.com"), signed_in("alice@example.com")
    put_joke(alice, punchline="Fake punch of someone else")
    kept, gone = str(uuid.uuid4()), str(uuid.uuid4())
    put_joke(dev, kept, punchline="")
    put_joke(dev, gone, punchline="Fake punch")
    assert dev.delete(f"/api/jokes/{gone}").status_code == 204
    idea = str(uuid.uuid4())
    body = {"topic_id": random_topic_id(dev), "take": "Fake take", "notes": ""}
    assert dev.put(f"/api/premises/{idea}", json=body).status_code == 200
    seen, unused = str(uuid.uuid4()), str(uuid.uuid4())
    dev.put(f"/api/observations/{seen}", json={"text": "Fake noticed"})
    dev.put(f"/api/observations/{unused}", json={"text": "Fake noticed too"})
    dev.put(f"/api/observations/{seen}/links/premises/{idea}")
    dev.put(f"/api/observations/{unused}/links/jokes/{gone}")  # a joke in the Trash: not a use

    out = pulse.writing_pulse(db, user(db, "dev@example.com"))
    assert [w["last_30_days"] for w in out["written"]] == [2, 1, 1]
    assert [(s["done"], s["of"]) for s in out["how_far_ideas_got"]] == [
        (1, 2),
        (0, 1),
        (0, 1),
        (0, 1),
    ]
    assert out["sitting_idle"] == [
        {"what": "observations nothing has come from", "count": 1},
        {"what": "premises with no joke yet", "count": 1},
        {"what": "jokes without a punchline", "count": 1},
    ]
    assert out["too_little_yet"] is True
