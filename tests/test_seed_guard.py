"""The seed command replaces an account, so it won't touch a remote database unless told to."""

import os
import subprocess
import sys

from app.seed.guard import CONFIRM_FLAG, refusal, remote_host

REMOTE = "postgresql://fake:fake@db.example.invalid/jokebox"


def test_local_databases_need_no_confirmation() -> None:
    assert remote_host("sqlite:///jokebox.db") is None
    assert remote_host("postgresql://jokebox@localhost:5432/jokebox") is None
    assert remote_host("postgresql://jokebox@127.0.0.1:8501/jokebox") is None
    assert remote_host(REMOTE) == "db.example.invalid"


def test_a_remote_database_needs_the_flag_unless_it_is_a_dry_run() -> None:
    refused = refusal(REMOTE, "fake@example.com", confirmed=False, dry_run=False)
    assert refused is not None and "db.example.invalid" in refused and CONFIRM_FLAG in refused
    assert refusal(REMOTE, "fake@example.com", confirmed=True, dry_run=False) is None
    assert refusal(REMOTE, "fake@example.com", confirmed=False, dry_run=True) is None


def test_the_command_stops_before_connecting() -> None:
    """The host doesn't exist: getting as far as connecting would fail differently."""
    env = {**os.environ, "DATABASE_URL": REMOTE}
    run = subprocess.run(
        [sys.executable, "-m", "app.seed", "fake@example.com"],
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert run.returncode == 1
    assert "points at db.example.invalid" in run.stderr
