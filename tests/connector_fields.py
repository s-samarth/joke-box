"""The fields each connector tool returns, as the contract test expects them.

The comedy-writer skill is written against these names: change one only on purpose, together
with the tool table in docs/api.md.
"""

# A Craft note's or an analysis's body, in parts when it's long.
LONG = {"body", "body_length", "more_from_char"}
BRIEF = {
    "id",
    "setup",
    "punchline",
    "topic",
    "subtopic",
    "premise_id",
    "status",
    "strength",
    "seconds",
    "types",
    "cluster_id",
    "lead",
}
DETAIL = BRIEF | {
    "tag_lines",
    "alt_punchlines",
    "hashtags",
    "notes",
    "premise",
    "clean_rating",
    "language",
    "follows",
    "followed_by",
    "in_sets",
    "rewrites",
    "cluster",
    "shows",
    "from_observations",
    "from_voice_notes",
}
SET = {
    "id",
    "name",
    "point",
    "beat_count",
    "tags",
    "rating",
    "venue",
    "target_seconds",
    "runtime_seconds",
    "jokes",
    "updated",
}
PULSE = {
    "as_of",
    "too_little_yet",
    "where_everything_stands",
    "how_far_ideas_got",
    "narrowest_step",
    "month_on_month",
    "when_you_write",
    "sitting_idle",
    "worth_knowing",
}
CLUSTER = {
    "id",
    "title",
    "notes",
    "lead",
    "topic",
    "versions",
    "discarded",
    "version_ids",
    "shows",
}
# Every tool Claude is offered. A new one goes here, and gets its fields checked.
TOOLS = {
    "jokebox_overview",
    "writing_pulse",
    "search_jokes",
    "get_jokes",
    "list_clusters",
    "list_premises",
    "get_premise",
    "list_sets",
    "get_set",
    "list_shows",
    "log_show",
    "search_observations",
    "search_voice_notes",
    "search_brainstorms",
    "get_brainstorm",
    "search_craft",
    "get_craft_notes",
    "search_analyses",
    "get_analysis",
}
BEAT = {
    "cue",
    "description",
    "seconds",
    "starts_at_seconds",
    "labels",
    "shift_reason",
    "entries",
}
SET_JOKE = {"place", "joke_id", "loose", "guards", "cluster_id", "pinned_version"}
# The kinds of entry in a beat, and the fields each has.
ENTRIES = {
    "premise": {"kind", "premise_id", "premise", "jokes", "only_if_previous_premise_landed"},
    "jokes_without_premise": {"kind", "jokes"},
    "crowd_work": {"kind", "title", "questions"},
}
QUESTION = {"question", "has_reply", "replies"}


def beats_set(jokes: list[dict[str, str]], premise: str) -> dict[str, object]:
    """A set with one of every kind of entry: a premise, jokes with no premise, crowd work."""
    piece = lambda n: {"id": f"p{n}", "joke_id": jokes[n]["id"], "gate": 1}  # noqa: E731
    question = {"id": "q", "text": "Fake question", "replies": [{"id": "r", "line": "Fake"}]}
    entries = [
        {"kind": "premise", "id": "e1", "premise_id": premise, "pieces": [piece(0), piece(1)]},
        {"kind": "jokes", "id": "e2", "pieces": [piece(2)]},
        {"kind": "crowd", "id": "e3", "title": "Fake", "questions": [question]},
    ]
    beat = {"id": "b", "cue": "Fake", "seconds": 90, "labels": {"status": "i-lose"}}
    return {"name": "Fake beats", "point": "Fake point", "beats": [beat | {"entries": entries}]}
