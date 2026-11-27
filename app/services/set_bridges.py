"""Bridges in a set (docs/sets.md): lines you might say between two jokes or two blocks. Each is
stored on the joke or block it follows, so it moves with it.

A save from an app made before bridges sends no `bridges` at all. Missing means "keep what's
stored", never "clear it"; the app clears them with an empty list.
"""

from app.schemas.set_beats import BeatIn, BridgeIn, CrowdEntry


def keep_bridges(old: list[BeatIn], new: list[BeatIn]) -> None:
    """Fill in bridges a save left out from the stored beats, by the joke's or block's id."""
    blocks: dict[str, list[BridgeIn] | None] = {}
    jokes: dict[str, list[BridgeIn] | None] = {}
    for beat in old:
        for entry in beat.entries:
            blocks[entry.id] = entry.bridges
            if not isinstance(entry, CrowdEntry):
                jokes.update((p.id, p.bridges) for p in entry.pieces)
    for beat in new:
        for entry in beat.entries:
            if entry.bridges is None:
                entry.bridges = blocks.get(entry.id)
            if isinstance(entry, CrowdEntry):
                continue
            for p in entry.pieces:
                if p.bridges is None:
                    p.bridges = jokes.get(p.id)


def spoken(bridges: list[BridgeIn] | None) -> list[str]:
    """The bridges' text, blank ones left out: what Claude and the views read."""
    return [b.text for b in bridges or [] if b.text.strip()]
