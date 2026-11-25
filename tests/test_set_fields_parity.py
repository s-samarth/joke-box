"""The default label fields are written twice: app/services/set_fields.py for the server and
web/src/api/setFields.ts for the app before it hears back (and offline). AGENTS.md asks for both
to change together; this catches one changed alone."""

import re
from pathlib import Path

from app.services.set_fields import DEFAULT_COLORS, DEFAULT_FIELDS

TS = Path(__file__).parent.parent / "web" / "src" / "api" / "setFields.ts"
FIELD = re.compile(
    r"\{ id: '([^']+)', name: '([^']+)', role: (?:'(\w+)'|null), options: opts\((.*)\) \},"
)
OPTION = re.compile(r"\['([^']+)', (?:'([^']*)'|\"([^\"]*)\")(?:, '(\w+)')?\]")


def browser_fields() -> list[dict[str, object]]:
    fields = []
    for fid, name, role, opts in FIELD.findall(TS.read_text()):
        options = [
            {"id": oid, "label": single or double, "group": group or None}
            for oid, single, double, group in OPTION.findall(opts)
        ]
        fields.append({"id": fid, "name": name, "role": role or None, "options": options})
    return fields


def test_the_app_and_the_server_start_from_the_same_label_fields() -> None:
    assert browser_fields() == DEFAULT_FIELDS


def test_the_app_and_the_server_colour_the_default_options_alike() -> None:
    source = (TS.parent.parent / "lib" / "labelColors.ts").read_text()
    block = source.split("DEFAULT_OPTION_COLORS", 1)[1].split("}", 1)[0]
    pairs = re.findall(r"'?([\w-]+)'?: '(#[0-9a-f]{6})'", block)
    assert dict(pairs) == DEFAULT_COLORS
