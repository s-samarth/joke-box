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
