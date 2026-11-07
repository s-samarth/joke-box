"""The fields each connector tool returns, as the contract test expects them.

The comedy-writer skill is written against these names: change one only on purpose, together
with the tool table in docs/api.md.
"""

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
}
DETAIL = BRIEF | {
    "tag_lines",
    "hashtags",
    "notes",
    "premise",
    "clean_rating",
    "language",
    "follows",
    "followed_by",
    "in_sets",
    "rewrites",
    "shows",
    "from_observations",
}
SET = {
    "id",
    "name",
    "tags",
    "rating",
    "venue",
    "target_seconds",
    "runtime_seconds",
    "jokes",
    "updated",
}
