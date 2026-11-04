"""The old "bit" names, from before jokes were renamed.

Requests take either name for good: a save queued offline on a phone can be sent months later
with `bit_id` or `bit_ids` in it. Responses use only the new names.
"""

from pydantic import AliasChoices

JOKE_ID = AliasChoices("joke_id", "bit_id")
JOKE_IDS = AliasChoices("joke_ids", "bit_ids")
