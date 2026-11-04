"""Put a backup's recordings back into a Blob store, as part of a restore (docs/backups.md).

    BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... uv run python scripts/restore_audio.py BACKUP/blob

Uploads every recording listed in blob-manifest.json at its original pathname, which is what
the database's voice_notes.audio_path holds, so restored notes play again. Every file is checked
against the manifest before anything is uploaded; what's already in the store is overwritten.
"""

import json
import sys
from pathlib import Path, PurePosixPath
from typing import Any

from vercel.blob import sync as blob

TYPES = {".m4a": "audio/mp4", ".webm": "audio/webm", ".ogg": "audio/ogg", ".mp3": "audio/mpeg"}


def checked(root: Path, manifest: list[dict[str, Any]]) -> list[tuple[str, bytes]]:
    """Each recording's pathname and bytes, once all of them are present at the right size."""
    files = []
    for entry in manifest:
        pathname = entry["pathname"]
        parts = PurePosixPath(pathname).parts
        if not parts or PurePosixPath(pathname).is_absolute() or ".." in parts:
            raise ValueError(f"{pathname} points outside the backup folder")
        data = root.joinpath(*parts).read_bytes()
        if len(data) != entry["size"]:
            raise ValueError(f"{pathname} is {len(data)} bytes; the backup says {entry['size']}")
        files.append((pathname, data))
    return files


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Usage: python scripts/restore_audio.py BACKUP/blob", file=sys.stderr)
        return 2
    root = Path(argv[1])
    manifest = json.loads((root / "blob-manifest.json").read_text())
    try:
        files = checked(root, manifest)
    except (OSError, ValueError) as error:
        print(f"Nothing uploaded: {error}", file=sys.stderr)
        return 1
    for n, (pathname, data) in enumerate(files, 1):
        kind = TYPES.get(PurePosixPath(pathname).suffix.lower(), "application/octet-stream")
        blob.put_blob(pathname, data, access="private", content_type=kind, allow_overwrite=True)
        print(f"\rUploaded {n} of {len(files)}", end="", flush=True)
    print(f"\nRestored {len(files)} recordings")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
