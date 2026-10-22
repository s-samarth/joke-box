"""Response shape for the Trash."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class TrashItemOut(BaseModel):
    """One thing in the Trash. `when` is a show's date, for the app to show in IST."""

    kind: str
    id: uuid.UUID
    title: str
    detail: str = ""
    when: datetime | None = None
    deleted_at: datetime
    erase_at: datetime
