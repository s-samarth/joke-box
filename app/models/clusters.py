"""Clusters: versions of one joke, kept together.

Each version is a whole joke (its own status, sets and show record); the cluster names the core
idea they share and says which version leads. A cluster never goes to the Trash: dissolving it
lets its jokes go and deletes nothing, and it goes by itself once it has no jokes at all.
"""

import uuid

from sqlalchemy import Integer, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, OwnedMixin


class JokeCluster(OwnedMixin, Base):
    __tablename__ = "clusters"

    # The core idea. Empty: the lead's setup stands in for it.
    title: Mapped[str] = mapped_column(Text, default="", server_default="")
    notes: Mapped[str] = mapped_column(Text, default="", server_default="")
    # The version you'd do tonight. Not a foreign key (jokes point here already): the server
    # keeps it pointing at a version that isn't discarded whenever the cluster has one.
    lead_joke_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, default=None)
    # Goes up by one per save that changes it; a save edited from an older version is a clash.
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
