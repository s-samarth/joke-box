"""How a set's status changes into each beat: a turn or a shift (docs/sets.md). The same rule as
`sideOf` and `changeAt` in web/src/features/sets/beats.ts: change both together, with
tests/test_connector_status_change.py and beats.test.ts."""

from collections.abc import Sequence

from app.schemas.set_beats import BeatIn, SetFieldIn


def status_sides(fields: Sequence[SetFieldIn]) -> tuple[str, dict[str, int]] | None:
    """The status field's id, and each option's side of neutral: 1 above, 0 neutral, -1 below,
    in the options' order (best first). With no neutral option, a win is above, a loss below."""
    f = next((f for f in fields if f.role == "status"), None)
    if f is None:
        return None
    groups = [o.group or "neutral" for o in f.options]
    first = groups.index("neutral") if "neutral" in groups else None
    sides: dict[str, int] = {}
    for i, (o, g) in enumerate(zip(f.options, groups, strict=True)):
        if g == "neutral":
            sides[o.id] = 0
        elif first is None:
            sides[o.id] = 1 if g == "win" else -1
        else:
            sides[o.id] = 1 if i < first else -1
    return f.id, sides


def changes(beats: Sequence[BeatIn], status: tuple[str, dict[str, int]] | None) -> list[str | None]:
    """For each beat, "turn" (crosses neutral, or onto or off it), "shift" (another status on the
    same side) or None (the same status, Not sure, or the first labelled beat). A Not sure beat
    between two labelled ones doesn't hide the change."""
    out: list[str | None] = []
    if status is None:
        return [None] * len(beats)
    fid, sides = status
    last: str | None = None
    for b in beats:
        now = b.labels.get(fid)
        if now not in sides:
            out.append(None)
            continue
        if last is None or last == now:
            out.append(None)
        else:
            out.append("shift" if sides[last] == sides[now] else "turn")
        last = now
    return out
