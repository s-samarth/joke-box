"""Bounds that keep a request inside what the database can hold.

Postgres refuses a string longer than its column or a number past a 32-bit integer, and the
refusal surfaced as a 500 after the request was accepted. Checking here answers 422 instead,
which the app treats as a save it shouldn't retry. (SQLite, used in tests, ignores lengths.)
"""

from typing import Annotated

from pydantic import Field

INT_MAX = 2**31 - 1  # a Postgres integer column
# A joke type or status name, as their columns hold it.
ShortName = Annotated[str, Field(max_length=80)]
