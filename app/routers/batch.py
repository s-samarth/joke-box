"""Several lists in one request: POST /api/batch with {"paths": ["/api/jokes", ...]}.

Opening the app, pulling to refresh, or coming back after a few minutes asks for many lists at
once. On Vercel, when no server copy is awake, each of those requests started its own copy, and
each start costs about a second of CPU against the Hobby plan's monthly allowance (logged: 12
copies for one app open). The app now sends lists asked for together as one batch here, so one
copy starts and answers them all.

Each path runs through the whole app as its own GET, with the caller's cookie, so it's answered
exactly as it would be alone: signed in or not, scoped to the user, the same errors. Only list
addresses can be batched (no ids, no query), so nothing that streams audio or reads Blob storage
comes through here. An answer that isn't JSON, or that would take the batch past what Vercel lets
a response carry, comes back as {"status": null}, and the app fetches that one on its own.
"""

import re

import anyio
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from starlette.responses import Response
from starlette.types import Message, Scope

from app.auth.deps import renew

router = APIRouter(tags=["batch"])

LIST_PATH = re.compile(r"/api/[a-z-]+(/[a-z-]+)?")
MAX_PATHS = 30
# Vercel refuses a response over 4.5 MB. Answers past this go back unsent, fetched one by one.
BUDGET = 3_500_000
# Headers that described the batch's own body, not the GETs made for it.
DROPPED = {b"content-length", b"content-type", b"content-encoding"}


class BatchIn(BaseModel):
    paths: list[str] = Field(max_length=MAX_PATHS)


class Answer:
    def __init__(self) -> None:
        self.status = 500
        self.json = False
        self.body = bytearray()


def batchable(path: str) -> bool:
    return LIST_PATH.fullmatch(path) is not None and path != "/api/batch"


def get_scope(request: Request, path: str) -> Scope:
    """A GET for one path, made as this request (its cookie, host and client)."""
    original = request.scope
    headers = [(k, v) for k, v in original["headers"] if k not in DROPPED]
    keep = ("type", "asgi", "http_version", "scheme", "server", "client", "root_path", "state")
    scope: Scope = {key: original[key] for key in keep if key in original}
    scope.update(method="GET", path=path, raw_path=path.encode(), query_string=b"", headers=headers)
    return scope


async def get(request: Request, path: str) -> Answer:
    answer = Answer()

    async def receive() -> Message:
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: Message) -> None:
        if message["type"] == "http.response.start":
            answer.status = message["status"]
            types = [v for k, v in message.get("headers", []) if k == b"content-type"]
            answer.json = any(b"json" in v and b"gzip" not in v for v in types)
        elif message["type"] == "http.response.body":
            answer.body.extend(message.get("body", b""))

    await request.app(get_scope(request, path), receive, send)
    return answer


def item(answer: Answer, room: int) -> bytes:
    if answer.status == 204:
        return b'{"status":204,"body":null}'
    if not answer.json or not answer.body or len(answer.body) > room:
        return b'{"status":null}'
    return b'{"status":%d,"body":%s}' % (answer.status, bytes(answer.body))


@router.post("/api/batch")
async def batch(data: BatchIn, request: Request) -> Response:
    if not all(batchable(path) for path in data.paths):
        raise HTTPException(422, "Only list addresses can be batched")
    answers: dict[int, Answer] = {}

    async def run(index: int, path: str) -> None:
        try:
            answers[index] = await get(request, path)
        except Exception:  # its error went to the logs; the app asks for that one alone
            answers[index] = Answer()

    async with anyio.create_task_group() as tasks:
        for index, path in enumerate(data.paths):
            tasks.start_soon(run, index, path)
    items, room = [], BUDGET
    for index in range(len(data.paths)):
        piece = item(answers[index], room)
        room -= len(piece)
        items.append(piece)
    if request.session.get("user_id"):
        renew(request)  # the GETs above renewed their own copy of the session, not this one
    body = b'{"results":[' + b",".join(items) + b"]}"
    return Response(body, media_type="application/json")
