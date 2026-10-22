"""The old "bit" names, from before jokes were renamed.

Requests take either name for good: a save queued offline on a phone can be sent months later
with `bit_id` or `bit_ids` in it. Responses also repeat the id under the old name (the
`bit_id`/`bit_ids` computed fields next to these), and `/api/bits` still answers, for an app
version that's still open from before the rename; those two can go after 2026-11-30.
"""

from pydantic import AliasChoices

JOKE_ID = AliasChoices("joke_id", "bit_id")
JOKE_IDS = AliasChoices("joke_ids", "bit_ids")
