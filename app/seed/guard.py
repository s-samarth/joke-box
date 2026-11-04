"""Seeding replaces everything in an account, so a remote database needs saying so out loud.

DATABASE_URL is often a deployed one (pulled from Vercel to run migrations or a one-off load),
and running the demo seed against it would wipe that account's real material.
"""

from sqlalchemy.engine import make_url

LOCAL_HOSTS = {None, "", "localhost", "127.0.0.1", "::1"}
CONFIRM_FLAG = "--replace-remote-account"


def remote_host(url: str) -> str | None:
    """The database's host if it isn't on this machine, else None."""
    parsed = make_url(url)
    if parsed.get_backend_name() == "sqlite":
        return None
    return None if parsed.host in LOCAL_HOSTS else parsed.host


def refusal(url: str, email: str, confirmed: bool, dry_run: bool) -> str | None:
    """Why the seed won't run, or None if it may. A dry run changes nothing, so it may."""
    host = remote_host(url)
    if host is None or confirmed or dry_run:
        return None
    return (
        f"DATABASE_URL points at {host}, not this machine. Loading replaces everything in "
        f"{email}'s account there. If that's really what you want, run it again with "
        f"{CONFIRM_FLAG}."
    )
