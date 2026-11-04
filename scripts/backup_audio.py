"""Download every object in the voice-note Blob store, for the nightly backup.

    uv run python scripts/backup_audio.py OUT_DIR

Run by .github/workflows/backup.yml with BLOB_READ_WRITE_TOKEN set (Blob has no read-only
token, but this only lists and downloads). Talks to Blob through the same SDK the app uses
(app/services/audio_store.py).

Writes each object under OUT_DIR at its own pathname (voice/<user id>/<note id>.m4a), plus
OUT_DIR/blob-manifest.json listing each one's pathname, size, etag and upload time, so a restore
can check nothing is missing. A download that comes back a different size stops the backup.

It prints only counts and error types: this repository is public, so are its Actions logs, and
pathnames carry account ids.
"""

import json
import sys
from pathlib import Path, PurePosixPath
from typing import Any

from vercel.blob import sync as blob


def target(root: Path, pathname: str) -> Path:
    """Where an object goes under root. Refuses a pathname that would land outside it."""
    parts = PurePosixPath(pathname).parts
    if not parts or PurePosixPath(pathname).is_absolute() or ".." in parts:
        raise ValueError("A Blob pathname points outside the backup folder")
    path = root.joinpath(*parts)
    if not path.resolve().is_relative_to(root.resolve()):
        raise ValueError("A Blob pathname points outside the backup folder")
    return path


def download(root: Path) -> list[dict[str, Any]]:
    """Every object in the store, written under root. Returns the manifest."""
    manifest: list[dict[str, Any]] = []
    for item in blob.query_blobs(page_size=1000):
        path = target(root, item.pathname)
        path.parent.mkdir(parents=True, exist_ok=True)
        with blob.stream_blob(item.pathname, access="private") as stream, path.open("wb") as out:
            for chunk in stream:
                out.write(chunk)
        if path.stat().st_size != item.size:
            raise RuntimeError(f"Object {len(manifest) + 1} downloaded at the wrong size")
        manifest.append(
            {
                "pathname": item.pathname,
                "size": item.size,
                "etag": item.etag,
                "uploaded_at": item.uploaded_at.isoformat(),
            }
        )
    return manifest


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Usage: python scripts/backup_audio.py OUT_DIR", file=sys.stderr)
        return 2
    root = Path(argv[1])
    root.mkdir(parents=True, exist_ok=True)
    try:
        manifest = download(root)
    except Exception as error:  # any failure fails the backup, quietly
        # The message could name a pathname; the type is enough to start from.
        print(f"Blob download failed: {type(error).__name__}", file=sys.stderr)
        return 1
    (root / "blob-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    total = sum(entry["size"] for entry in manifest)
    print(f"Downloaded {len(manifest)} Blob objects, {total / 1_000_000:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
