"""Claude reading a handwritten brainstorm: each page comes back as an image of the page."""

import base64
import json
import uuid
from collections.abc import Iterator
from io import BytesIO
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.connector import brainstorm as tool
from app.main import app
from tests.conftest import signed_in
from tests.connector_auth import call, connect, content

LIGHT, RED, PAGE = (236, 230, 218), (255, 90, 71), (27, 32, 48)


def scribble(page: int, color: str = "#ece6da", x: float = 100) -> dict[str, Any]:
    """A thick made-up zigzag, so its colour shows clearly in the image."""
    points = [[x + i * 8, 200 + (i % 2) * 40, 0.8] for i in range(30)]
    return {"color": color, "size": 12, "page": page, "points": points}


@pytest.fixture
def claude() -> Iterator[tuple[TestClient, str]]:
    browser = signed_in("dev@example.com")
    with TestClient(app) as client:
        yield client, connect(browser)["access_token"]


def save(ink: list[dict[str, Any]], title: str = "Fake airport bits") -> str:
    session_id = str(uuid.uuid4())
    body = {"title": title, "content": "Fake typed lines", "ink": ink, "ink_pages": 3}
    assert signed_in("dev@example.com").put(f"/api/sessions/{session_id}", json=body).is_success
    return session_id


def image(block: dict[str, Any]) -> Image.Image:
    assert block["type"] == "image" and block["mimeType"] == "image/png"
    return Image.open(BytesIO(base64.b64decode(block["data"]))).convert("RGB")


def colors(picture: Image.Image) -> set[tuple[int, int, int]]:
    return {c for _, c in picture.getcolors(maxcolors=1 << 16) or []}


def near(wanted: tuple[int, int, int], found: set[tuple[int, int, int]]) -> bool:
    return any(sum(abs(a - b) for a, b in zip(wanted, c, strict=True)) < 30 for c in found)


def test_every_handwritten_page_comes_as_an_image(claude: tuple[TestClient, str]) -> None:
    session_id = save([scribble(0), scribble(2, "#ff5a47")])  # page 2 left blank
    blocks = content(claude, "get_brainstorm", brainstorm_id=session_id)
    about = json.loads(blocks[0]["text"])
    assert about["title"] == "Fake airport bits" and about["text"] == "Fake typed lines"
    assert about["handwritten_pages"] == about["pages_shown"] == [1, 3]
    assert about["more_from_page"] is None
    assert [b.get("text") for b in blocks[1::2]] == ["Page 1", "Page 3"]
    first, third = image(blocks[2]), image(blocks[4])
    # The app's dark page, in the comic's own ink colours.
    assert near(PAGE, colors(first)) and near(LIGHT, colors(first)) and not near(RED, colors(first))
    assert near(RED, colors(third))
    assert max(first.size) <= 1568


def test_a_page_written_across_both_screens_is_drawn_wide(claude: tuple[TestClient, str]) -> None:
    narrow = image(content(claude, "get_brainstorm", brainstorm_id=save([scribble(0)]))[2])
    wide_id = save([scribble(0), scribble(0, x=1500)])
    wide = image(content(claude, "get_brainstorm", brainstorm_id=wide_id)[2])
    assert narrow.width < narrow.height  # one screen wide: a portrait sheet
    assert wide.width > wide.height  # two screens wide


def test_a_dense_brainstorm_continues_in_a_second_call(
    claude: tuple[TestClient, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(tool, "PNG_BUDGET", 1)  # every page past the first is over budget
    session_id = save([scribble(0), scribble(1), scribble(2)])
    first = json.loads(content(claude, "get_brainstorm", brainstorm_id=session_id)[0]["text"])
    assert first["pages_shown"] == [1] and first["more_from_page"] == 2
    rest = content(claude, "get_brainstorm", brainstorm_id=session_id, from_page=2)
    assert json.loads(rest[0]["text"])["pages_shown"] == [2]


def test_typed_only_brainstorms_have_no_images(claude: tuple[TestClient, str]) -> None:
    blocks = content(claude, "get_brainstorm", brainstorm_id=save([]))
    assert len(blocks) == 1 and json.loads(blocks[0]["text"])["handwritten_pages"] == []


def test_only_your_own_brainstorms_and_never_the_trash(claude: tuple[TestClient, str]) -> None:
    client, token = claude
    theirs = str(uuid.uuid4())
    signed_in("someone@example.com").put(f"/api/sessions/{theirs}", json={"title": "Fake"})
    mine = save([scribble(0)])
    signed_in("dev@example.com").delete(f"/api/sessions/{mine}")
    for brainstorm_id in (theirs, mine, "not-an-id"):
        out = call(client, token, "get_brainstorm", brainstorm_id=brainstorm_id)
        assert out.get("isError"), brainstorm_id


def test_search_counts_handwritten_pages(claude: tuple[TestClient, str]) -> None:
    save([scribble(0), scribble(1)], title="Fake handwritten only")
    client, token = claude
    found = call(client, token, "search_brainstorms", query="handwritten only")["structuredContent"]
    assert found["results"][0]["handwritten_pages"] == 2
