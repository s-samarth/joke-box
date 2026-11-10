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
    "shows",
    "from_observations",
    "from_voice_notes",
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
PULSE = {
    "as_of",
    "too_little_yet",
    "written",
    "how_far_ideas_got",
    "sitting_idle",
    "worth_knowing",
}
# Every tool Claude is offered. A new one goes here, and gets its fields checked.
TOOLS = {
    "jokebox_overview",
    "writing_pulse",
    "search_jokes",
    "get_jokes",
    "list_premises",
    "get_premise",
    "list_sets",
    "get_set",
    "list_shows",
    "search_observations",
    "search_voice_notes",
    "search_brainstorms",
    "get_brainstorm",
    "search_craft",
    "get_craft_notes",
    "search_analyses",
    "get_analysis",
}
