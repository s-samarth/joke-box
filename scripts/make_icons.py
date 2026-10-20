"""Generate the app icons and iOS launch screens (standard library only).

Draws an orange stage microphone on near-black. Run: uv run python scripts/make_icons.py
"""

import struct
import zlib
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / "web" / "public"
BG = (10, 10, 10)
ORANGE = (238, 124, 43)
SPLASH_SIZES = [(1290, 2796), (1179, 2556), (1206, 2622), (1320, 2868), (1170, 2532), (750, 1334)]


def inside_mic(x: float, y: float) -> bool:
    """Is the point (in a 0..1 box) part of the microphone?"""
    # Head: a capsule with fully rounded ends.
    cy = min(max(y, 0.30), 0.42)
    if (x - 0.5) ** 2 + (y - cy) ** 2 <= 0.13**2:
        return True
    # Holder: the lower half of a ring around the head.
    dist = ((x - 0.5) ** 2 + (y - 0.45) ** 2) ** 0.5
    if y >= 0.45 and 0.195 <= dist <= 0.24:
        return True
    # Stem and base.
    if abs(x - 0.5) <= 0.0225 and 0.68 <= y <= 0.80:
        return True
    return abs(x - 0.5) <= 0.15 and 0.79 <= y <= 0.835


def coverage(x: float, y: float, step: float) -> float:
    """Anti-aliasing: the share of 3x3 sub-samples inside the shape."""
    offsets = (-step / 3, 0.0, step / 3)
    hits = sum(inside_mic(x + dx, y + dy) for dx in offsets for dy in offsets)
    return hits / 9


def render(width: int, height: int, icon_size: int) -> list[bytes]:
    """Rows of RGB pixels with the mic centred in an icon_size box."""
    left, top = (width - icon_size) // 2, (height - icon_size) // 2
    plain = bytes(BG) * width
    rows = []
    for py in range(height):
        if not top <= py < top + icon_size:
            rows.append(plain)
            continue
        row = bytearray(plain)
        v = (py - top + 0.5) / icon_size
        for px in range(left, left + icon_size):
            c = coverage((px - left + 0.5) / icon_size, v, 1 / icon_size)
            if c:
                row[px * 3 : px * 3 + 3] = bytes(
                    round(b + (o - b) * c) for b, o in zip(BG, ORANGE, strict=True)
                )
        rows.append(bytes(row))
    return rows


def write_png(path: Path, width: int, height: int, rows: list[bytes]) -> None:
    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    raw = b"".join(b"\x00" + r for r in rows)
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
    png += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)
    print("wrote", path.relative_to(PUBLIC))


def square(path: Path, size: int, scale: float) -> None:
    write_png(path, size, size, render(size, size, round(size * scale)))


def main() -> None:
    square(PUBLIC / "icons" / "icon-192.png", 192, 1.0)
    square(PUBLIC / "icons" / "icon-512.png", 512, 1.0)
    square(PUBLIC / "icons" / "maskable-512.png", 512, 0.72)  # inside the maskable safe zone
    square(PUBLIC / "apple-touch-icon.png", 180, 0.9)
    for w, h in SPLASH_SIZES:
        write_png(PUBLIC / "splash" / f"splash-{w}x{h}.png", w, h, render(w, h, w // 3))


if __name__ == "__main__":
    main()
