"""Bodies sent and returned gzip-packed, so a session full of handwriting fits the host's limits.

Vercel refuses a request or a response over 4.5 MB. A brainstorm session with pages of
handwriting is mostly numbers, which gzip shrinks about 3x, so the app packs large saves and the
server packs a whole session when it sends one back.

Packed bodies carry their own content type instead of `Content-Encoding: gzip`, so nothing on the
way (the host, a proxy, the browser) unpacks, repacks or recounts them: the server unpacks
requests here and the app unpacks responses itself (see web/src/api/packed.ts).
"""

import zlib

from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

PACKED_JSON = "application/x-jokebox-gzip-json"

# Vercel refuses a request over 4.5 MB, and handwriting packs about 3x, so no real save unpacks
# past about 15 MB. This leaves room for very regular ink, and stops a gzip bomb well short.
MAX_UNPACKED = 32 * 1024 * 1024
# A packed body is read only up to this (Vercel's own limit is 4.5 MB), before unpacking it.
MAX_PACKED = 8 * 1024 * 1024


class TooBig(ValueError):
    pass


def pack(data: bytes) -> bytes:
    return zlib.compress(data, 6, wbits=31)  # wbits 31: the gzip format the browser speaks


def unpack(data: bytes) -> bytes:
    """Unpack a gzip body, refusing one that unpacks past MAX_UNPACKED. Raises ValueError if
    it isn't gzip at all."""
    inflater = zlib.decompressobj(wbits=31)
    try:
        out = inflater.decompress(data, MAX_UNPACKED + 1)
    except zlib.error as error:
        raise ValueError("Not a gzip body") from error
    if len(out) > MAX_UNPACKED or inflater.unconsumed_tail:
        raise TooBig("Too big once unpacked")
    if not inflater.eof:
        raise ValueError("A gzip body that was cut off")
    return out


def packed_json(payload: bytes) -> Response:
    return Response(pack(payload), media_type=PACKED_JSON)


def _content_type(scope: Scope) -> bytes:
    return next((v for k, v in scope["headers"] if k == b"content-type"), b"")


def _refusal(scope: Scope) -> JSONResponse | None:
    """Why a packed request isn't worth unpacking, if it isn't: only the app's own saves are
    (the CSRF header, see main.py), and only from someone signed in. Checked before reading
    the body, so nobody can make the server inflate one without a sign-in."""
    headers = dict(scope["headers"])
    if not scope["path"].startswith("/api/") or headers.get(b"x-requested-with") != b"jokebox":
        return JSONResponse({"detail": "Missing X-Requested-With header"}, 403)
    if not scope.get("session", {}).get("user_id"):
        return JSONResponse({"detail": "Not signed in"}, 401)
    return None


class UnpackRequests:
    """ASGI middleware: a request sent packed reaches the routes as ordinary JSON. It sits
    inside the session middleware, so it can see who is signed in."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not _content_type(scope).startswith(PACKED_JSON.encode()):
            await self.app(scope, receive, send)
            return
        refusal = _refusal(scope)
        if refusal is not None:
            await refusal(scope, receive, send)
            return
        body, more = b"", True
        while more:
            message = await receive()
            body += message.get("body", b"")
            more = message.get("more_body", False)
            if len(body) > MAX_PACKED:
                await JSONResponse({"detail": "That's too big to save"}, 413)(scope, receive, send)
                return
        try:
            data = unpack(body)
        except TooBig:
            await JSONResponse({"detail": "That's too big to save"}, 413)(scope, receive, send)
            return
        except ValueError:
            await JSONResponse({"detail": "That save arrived damaged"}, 400)(scope, receive, send)
            return
        replaced = (b"content-type", b"content-length")
        headers = [(k, v) for k, v in scope["headers"] if k not in replaced]
        headers += [(b"content-type", b"application/json")]
        headers += [(b"content-length", str(len(data)).encode())]
        replayed = False

        async def replay() -> Message:
            nonlocal replayed
            if replayed:
                return await receive()  # after the body: the disconnect, as usual
            replayed = True
            return {"type": "http.request", "body": data, "more_body": False}

        await self.app({**scope, "headers": headers}, replay, send)
