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

# Unpacked, a body may be this big: well past 20 dense pages, short of a gzip bomb.
MAX_UNPACKED = 64 * 1024 * 1024


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


class UnpackRequests:
    """ASGI middleware: a request sent packed reaches the routes as ordinary JSON."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not _content_type(scope).startswith(PACKED_JSON.encode()):
            await self.app(scope, receive, send)
            return
        body, more = b"", True
        while more:
            message = await receive()
            body += message.get("body", b"")
            more = message.get("more_body", False)
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
