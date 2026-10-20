"""Where voice-note audio lives: a private Vercel Blob store on Vercel, a local folder in dev.

Routes depend on `get_audio_store`, so tests swap in a temporary folder and never touch the
network. Paths are always built by the server from the user and note ids, never taken from
the request, so one user can't read or overwrite another's recording.
"""

import os
from collections.abc import Mapping
from pathlib import Path
from typing import Protocol

from fastapi import HTTPException, Request
from vercel.blob import sync as blob
from vercel.headers import HeadersContext

from app.config import get_settings


class AudioStore(Protocol):
    def put(self, path: str, data: bytes, content_type: str) -> None: ...
    def get(self, path: str) -> bytes: ...
    def delete(self, path: str) -> None: ...


class LocalAudioStore:
    """Files under one folder. Used for local development and tests."""

    def __init__(self, root: Path) -> None:
        self.root = root

    def _file(self, path: str) -> Path:
        return self.root / path

    def put(self, path: str, data: bytes, content_type: str) -> None:
        file = self._file(path)
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)

    def get(self, path: str) -> bytes:
        try:
            return self._file(path).read_bytes()
        except FileNotFoundError:
            raise HTTPException(404, "Recording not found") from None

    def delete(self, path: str) -> None:
        self._file(path).unlink(missing_ok=True)


class BlobAudioStore:
    """A private Vercel Blob store.

    On Vercel the SDK signs in with the short-lived OIDC token that Vercel adds to each request
    as a header. The SDK reads headers from a context variable that nothing fills in for us, so
    each call runs inside this request's headers explicitly.
    """

    def __init__(self, headers: Mapping[str, str]) -> None:
        self.context = HeadersContext(dict(headers))

    def put(self, path: str, data: bytes, content_type: str) -> None:
        # Overwriting is allowed so a retried upload of the same note succeeds.
        with self.context.use():
            blob.put_blob(
                path, data, access="private", content_type=content_type, allow_overwrite=True
            )

    def get(self, path: str) -> bytes:
        try:
            with self.context.use():
                return blob.get_blob(path, access="private").body
        except blob.BlobNotFoundError:
            raise HTTPException(404, "Recording not found") from None

    def delete(self, path: str) -> None:
        with self.context.use():
            blob.delete_blob(path)


def blob_configured() -> bool:
    """Connecting a Blob store to the Vercel project sets BLOB_STORE_ID (or a token)."""
    return any(os.environ.get(k) for k in ("BLOB_STORE_ID", "BLOB_READ_WRITE_TOKEN"))


def get_audio_store(request: Request) -> AudioStore:
    """The store for this environment, or 503 if a deployed app has no Blob store yet."""
    settings = get_settings()
    if blob_configured():
        return BlobAudioStore(request.headers)
    if settings.is_local:
        return LocalAudioStore(Path(settings.audio_dir))
    raise HTTPException(503, "Voice notes need a Vercel Blob store connected to the project.")
