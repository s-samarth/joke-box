"""The backup's Blob download and restore, against a fake store (no network, made-up audio)."""

import json
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from scripts import backup_audio, restore_audio

STORE = {
    "voice/u1/n1.m4a": b"made-up audio one",
    "voice/u1/n2.webm": b"made-up audio two, a little longer",
}


def fake_store(
    monkeypatch: pytest.MonkeyPatch, store: dict[str, bytes], sizes: dict[str, int]
) -> None:
    def query_blobs(**_: Any) -> Iterator[SimpleNamespace]:
        for name, data in store.items():
            when = datetime(2026, 11, 3, tzinfo=UTC)
            yield SimpleNamespace(
                pathname=name, size=sizes.get(name, len(data)), etag=f"e-{name}", uploaded_at=when
            )

    @contextmanager
    def stream_blob(pathname: str, *, access: str) -> Iterator[list[bytes]]:
        assert access == "private"
        data = store[pathname]
        yield [data[:5], data[5:]]

    monkeypatch.setattr(backup_audio.blob, "query_blobs", query_blobs)
    monkeypatch.setattr(backup_audio.blob, "stream_blob", stream_blob)


def test_downloads_every_object_with_a_manifest(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    fake_store(monkeypatch, STORE, {})
    assert backup_audio.main(["backup_audio.py", str(tmp_path)]) == 0
    for name, data in STORE.items():
        assert (tmp_path / name).read_bytes() == data
    manifest = json.loads((tmp_path / "blob-manifest.json").read_text())
    assert [m["pathname"] for m in manifest] == list(STORE)
    out = capsys.readouterr().out
    assert "Downloaded 2 Blob objects" in out
    assert "u1" not in out  # pathnames carry account ids; the logs are public


def test_a_short_download_fails_the_backup(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    fake_store(monkeypatch, STORE, {"voice/u1/n2.webm": 9999})
    assert backup_audio.main(["backup_audio.py", str(tmp_path)]) == 1
    assert not (tmp_path / "blob-manifest.json").exists()
    assert "RuntimeError" in capsys.readouterr().err


@pytest.mark.parametrize("pathname", ["../outside.m4a", "/etc/passwd", "voice/../../x"])
def test_a_pathname_cannot_escape_the_folder(tmp_path: Path, pathname: str) -> None:
    with pytest.raises(ValueError):
        backup_audio.target(tmp_path, pathname)


def test_a_backup_restores_to_the_same_pathnames(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_store(monkeypatch, STORE, {})
    assert backup_audio.main(["backup_audio.py", str(tmp_path)]) == 0
    uploaded: dict[str, tuple[bytes, str]] = {}

    def put_blob(pathname: str, data: bytes, **options: Any) -> None:
        assert options["access"] == "private" and options["allow_overwrite"]
        uploaded[pathname] = (data, options["content_type"])

    monkeypatch.setattr(restore_audio.blob, "put_blob", put_blob)
    assert restore_audio.main(["restore_audio.py", str(tmp_path)]) == 0
    assert {name: data for name, (data, _) in uploaded.items()} == STORE
    assert uploaded["voice/u1/n1.m4a"][1] == "audio/mp4"


def test_a_damaged_backup_uploads_nothing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_store(monkeypatch, STORE, {})
    assert backup_audio.main(["backup_audio.py", str(tmp_path)]) == 0
    (tmp_path / "voice/u1/n2.webm").write_bytes(b"cut short")
    monkeypatch.setattr(restore_audio.blob, "put_blob", lambda *a, **k: pytest.fail("uploaded"))
    assert restore_audio.main(["restore_audio.py", str(tmp_path)]) == 1
