"""The connector loads on its first request, so the app's own cold starts skip the MCP SDK."""

import subprocess
import sys

from app.connector import consent_link, http, lazy
from app.connector.consent import router as consent
from app.main import app


def test_starting_the_app_does_not_load_the_connector() -> None:
    probe = (
        "import sys, app.main; print(any(m == 'mcp' or m.startswith('mcp.') for m in sys.modules))"
    )
    loaded = subprocess.run(
        [sys.executable, "-c", probe], capture_output=True, text=True, check=True
    )
    assert loaded.stdout.strip() == "False"


def test_the_app_knows_every_path_the_connector_serves() -> None:
    routes = [*getattr(http.build(app), "routes", []), *consent.routes]
    served = {getattr(route, "path", None) for route in routes} - {None}
    assert set(lazy.PATHS) == served
    assert lazy.CONSENT_PATH == consent_link.CONSENT_PATH
