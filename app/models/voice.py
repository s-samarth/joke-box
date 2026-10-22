"""Voice notes: raw recordings with a label and hashtags.

The audio itself lives in file storage (a private Vercel Blob store); this row keeps only what
the list needs and where the file is. `audio_path` stays empty until the upload lands, so a
note recorded offline can exist before its audio arrives.
"""

from sqlalchemy import JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, OwnedMixin
from app.models.trash import Trashable


class VoiceNote(Trashable, OwnedMixin, Base):
    __tablename__ = "voice_notes"

    label: Mapped[str] = mapped_column(String(200), default="")
    hashtags: Mapped[list[str]] = mapped_column(JSON, default=list)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    content_type: Mapped[str] = mapped_column(String(100), default="")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    audio_path: Mapped[str] = mapped_column(String(300), default="")

    @property
    def has_audio(self) -> bool:
        return bool(self.audio_path)
