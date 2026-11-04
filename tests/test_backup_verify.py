"""The nightly backup's restore check: which differences stop it and which only warn."""

from scripts.backup_verify import compare

LIVE = {"jokes": 5, "premises": 2, "trash": 0}


def test_an_exact_copy_passes() -> None:
    assert compare(LIVE, dict(LIVE)) == ([], [])


def test_a_missing_or_extra_table_stops_it() -> None:
    errors, _ = compare(LIVE, {"jokes": 5, "premises": 2, "stray": 1})
    assert errors == [
        "Tables missing from the restored copy: trash",
        "Tables only in the restored copy: stray",
    ]


def test_a_table_that_came_back_empty_stops_it() -> None:
    errors, warnings = compare(LIVE, {"jokes": 0, "premises": 2, "trash": 0})
    assert errors == ["Tables with rows live but empty in the copy: jokes"]
    assert warnings == []


def test_a_row_saved_during_the_dump_only_warns() -> None:
    errors, warnings = compare(LIVE, {"jokes": 4, "premises": 2, "trash": 0})
    assert errors == []
    assert warnings == ["Row counts changed during the dump in: jokes (something was saved)"]
