"""The writing pulse Claude reads gives the same answers as the one on the Activity screen.

The first cases are the ones in web/src/features/daily/pulse.test.ts, with the same expected
numbers and sentences: the screen and the tool are separate code, and these keep them in step.
Made-up material only.
"""

import uuid
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.connector import pulse
from app.connector.pulse import JokeRow, NotedRow, PremiseRow, days_ago, work_out
from app.connector.pulse_trends import part_index
from app.connector.text import IST
from tests.conftest import random_topic_id, signed_in
from tests.test_connector_voice import user
from tests.test_jokes import put_joke

TODAY = date(2026, 11, 11)


def at(ago: int, hour: int = 12) -> datetime:
    """`hour` o'clock in India, `ago` days before TODAY."""
    return datetime(2026, 11, 11, hour, tzinfo=IST) - timedelta(days=ago)


def joke(ago: int, hour: int = 12, **extra: str | None) -> JokeRow:
    fields: dict[str, str | None] = {"status": "Draft"} | extra
    return JokeRow(str(uuid.uuid4()), at(ago, hour), at(ago), **fields)  # type: ignore[arg-type]


def premise(ago: int, premise_id: str = "", status: str = "Draft") -> PremiseRow:
    return PremiseRow(premise_id or str(uuid.uuid4()), at(ago), status)


def noted(
    ago: int,
    used: bool = False,
    hour: int = 12,
    joke_ids: tuple[str, ...] = (),
    status: str = "Draft",
) -> NotedRow:
    used = used or bool(joke_ids)
    return NotedRow(str(uuid.uuid4()), at(ago, hour), "t1", "Trains", joke_ids, used, status)


ORDER = ["Draft", "Work in Progress", "Stage Ready", "Discarded"]


def test_days_ago_go_by_the_calendar_in_india() -> None:
    assert days_ago(at(0), TODAY) == 0
    assert days_ago(datetime.fromisoformat("2026-11-10T19:00:00+00:00"), TODAY) == 0
    assert days_ago(at(30), TODAY) == 30


def test_ideas_are_followed_through_over_the_last_90_days_only() -> None:
    jokes = [
        joke(1, premise_id="built", status="Stage Ready"),
        joke(2),
        joke(120, status="Stage Ready"),
    ]
    premises = [premise(10, "built"), premise(12), premise(300)]
    out = work_out(jokes, premises, [noted(5, used=True), noted(6), noted(200, used=True)], TODAY)
    assert [(s["done"], s["of"]) for s in out["how_far_ideas_got"]] == [(1, 2)] * 3
    assert out["how_far_ideas_got"][0]["step"] == "Observations that led somewhere"
    assert out["narrowest_step"] is None  # no step has five ideas in it yet


def test_the_narrowest_step_once_a_step_has_enough_in_it() -> None:
    observations = [noted(d, used=d <= 3) for d in range(1, 6)]
    premises = [premise(1, "a")] + [premise(d) for d in range(2, 6)]
    jokes = [joke(1, premise_id="a", status="Stage Ready"), joke(2, status="Stage Ready")]
    jokes += [joke(d) for d in range(3, 6)]
    out = work_out(jokes, premises, observations, TODAY)
    assert out["narrowest_step"] == "Premises with a joke on them"


def test_each_kind_by_where_it_stands_jokes_in_the_comics_order() -> None:
    observations = [noted(1, used=True, status="Stage Ready"), noted(2), noted(3)]
    premises = [premise(1, "a", "Work in Progress"), premise(2, "b", "Discarded"), premise(3)]
    jokes = [joke(1, status="Need Tags"), joke(2, status="Stage Ready"), joke(3, status=None)]
    jokes.append(joke(4))
    out = work_out(jokes, premises, observations, TODAY, ORDER)
    assert out["where_everything_stands"] == {
        "observations": {"Draft": 2, "Work in Progress": 0, "Stage Ready": 1, "Discarded": 0},
        "premises": {"Draft": 1, "Work in Progress": 1, "Stage Ready": 0, "Discarded": 1},
        "jokes": {"Draft": 2, "Stage Ready": 1, "Need Tags": 1},
    }
    assert list(out["where_everything_stands"]["jokes"]) == ["Draft", "Stage Ready", "Need Tags"]


def test_what_sits_idle_is_listed_and_what_does_not_is_left_out() -> None:
    jokes = [joke(40), joke(45, status="Stage Ready"), joke(3)]
    out = work_out(jokes, [premise(4)], [noted(1), noted(2), noted(3, used=True)], TODAY)
    assert out["sitting_idle"] == [
        {"what": "observations unused", "count": 2},
        {"what": "premises with no joke", "count": 1},
        {"what": "drafts untouched for 30 days", "count": 1},
    ]


def test_nothing_is_said_until_there_is_enough_to_go_on() -> None:
    out = work_out([joke(1)], [], [noted(1)], TODAY)
    assert (out["too_little_yet"], out["worth_knowing"]) == (True, [])
    assert (out["narrowest_step"], out["when_you_write"]) == (None, None)


def test_a_quiet_kind_and_the_biggest_unused_pile() -> None:
    kept = joke(1)
    observations = [noted(i * 7) for i in range(6)] + [noted(2, joke_ids=(kept.id,))]
    out = work_out([kept, joke(8), joke(15)], [premise(40)], observations, TODAY)
    assert out["worth_knowing"] == [
        "No new premise in 40 days.",
        "Trains holds 7 observations and 1 joke has come from them: 6 are still unused.",
    ]


def test_month_on_month_by_what_was_written_that_month() -> None:
    observations = [noted(0, used=True), noted(15), noted(45, used=True)]
    out = work_out([joke(15, status="Stage Ready"), joke(160)], [], observations, TODAY)
    months = out["month_on_month"]
    assert [(m["month"], m["pieces_written"], m["still_settling"]) for m in months] == [
        ("2026-06", 1, False),
        ("2026-07", 0, False),
        ("2026-08", 0, False),
        ("2026-09", 1, False),
        ("2026-10", 2, True),
        ("2026-11", 1, True),
    ]
    assert [(s["done"], s["of"]) for s in months[4]["steps"]] == [(0, 1), (0, 0), (1, 1)]


def test_when_the_writing_happens_by_weekday_and_part_of_the_day() -> None:
    observations = [noted(0, hour=23) for _ in range(8)] + [noted(1, hour=9), noted(7, hour=23)]
    out = work_out([], [], observations, TODAY)["when_you_write"]
    assert out["busiest"] == {"day": "Wednesdays", "part": "Night", "count": 9}
    assert (out["of_pieces"], out["by_weekday"]["Tuesdays"]["Morning"]) == (10, 1)


def test_the_part_of_the_day() -> None:
    assert [part_index(h) for h in (5, 12, 17, 22, 2)] == [0, 1, 2, 3, 3]


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
    assert [(s["done"], s["of"]) for s in out["how_far_ideas_got"]] == [(1, 2), (0, 1), (0, 1)]
    assert out["sitting_idle"] == [
        {"what": "observations unused", "count": 1},
        {"what": "premises with no joke", "count": 1},
    ]
    assert out["where_everything_stands"]["jokes"] == {"Draft": 1}
    assert out["where_everything_stands"]["premises"]["Draft"] == 1
    assert out["too_little_yet"] is True
