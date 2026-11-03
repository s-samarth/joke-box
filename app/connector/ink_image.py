"""Handwriting pages drawn as images, so Claude can read a brainstorm written with the Pencil.

Drawn the way the app shows them: the dark page and the comic's own ink colours. Strokes are
points on a page where the screen is 1000 units wide (web/src/features/brainstorm/ink.ts); a page
is two screens wide, so a page whose ink stays on its left half is drawn one screen wide, which
keeps the writing bigger in the image.

Drawn at twice the size and scaled down, which smooths the lines (Pillow draws them jagged).
"""

from collections.abc import Sequence
from io import BytesIO
from typing import Any

from PIL import Image, ImageColor, ImageDraw

PAGE_COLOR = "#1b2030"  # --color-ink-2 in web/src/app.css
FALLBACK_INK = "#ece6da"  # the app's light ink, for a colour Pillow can't read
SCREEN = 1000  # the screen's width in page units
PAGE_HEIGHT = 1414  # an A4 sheet one screen wide
LONG_EDGE = 1568  # Claude scales a longer image down to this anyway
SMOOTHING = 2

Stroke = dict[str, Any]


def pages_with_ink(ink: Sequence[Stroke]) -> list[int]:
    """The pages that have something on them, in order (page 0 is the first)."""
    return sorted({int(s.get("page") or 0) for s in ink if s.get("points")})


def strokes_on(ink: Sequence[Stroke], page: int) -> list[Stroke]:
    return [s for s in ink if int(s.get("page") or 0) == page and s.get("points")]


def _color(value: object) -> tuple[int, int, int]:
    try:
        rgb = ImageColor.getrgb(str(value))
    except ValueError:
        rgb = ImageColor.getrgb(FALLBACK_INK)
    return rgb[0], rgb[1], rgb[2]


def draw_page(strokes: Sequence[Stroke]) -> bytes:
    """One page as a PNG, at most LONG_EDGE pixels on its longer side."""
    xs = [p[0] for s in strokes for p in s["points"]]
    ys = [p[1] for s in strokes for p in s["points"]]
    width = 2 * SCREEN if xs and max(xs) > SCREEN else SCREEN
    height = max([PAGE_HEIGHT, *ys])
    scale = LONG_EDGE / max(width, height)
    size = (max(1, round(width * scale)), max(1, round(height * scale)))
    big = scale * SMOOTHING
    image = Image.new("RGB", (size[0] * SMOOTHING, size[1] * SMOOTHING), PAGE_COLOR)
    pen = ImageDraw.Draw(image)
    for stroke in strokes:
        points = [(p[0] * big, p[1] * big) for p in stroke["points"]]
        pressure = sum(p[2] for p in stroke["points"]) / len(points)
        # As in the app: harder Pencil pressure, thicker line.
        line = max(1, round(float(stroke.get("size") or 2.4) * (0.4 + pressure * 1.2) * big))
        color = _color(stroke.get("color"))
        if len(points) > 1:
            pen.line(points, fill=color, width=line, joint="curve")
        for x, y in (points[0], points[-1]):  # round ends, and a single tap as a dot
            pen.ellipse((x - line / 2, y - line / 2, x + line / 2, y + line / 2), fill=color)
    image = image.resize(size, Image.Resampling.LANCZOS)
    out = BytesIO()
    image.quantize(colors=64).save(out, "PNG", optimize=True)
    return out.getvalue()
