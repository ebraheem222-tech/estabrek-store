"""
A 360° sprite sheet for the shop's tests (tests/fixtures/spin-sheet.png): 12 frames,
4 across and 3 down, 120 x 150 each, a dark band moving round a pink "product" so each
frame differs. Plain Python (zlib), no other packages.  Run: python scripts/make-test-spin.py
"""
import struct
import zlib
from pathlib import Path

COLS, ROWS, CW, CH, COUNT = 4, 3, 120, 150, 12
W, H = COLS * CW, ROWS * CH


def pixel(x, y):
    k = (y // CH) * COLS + (x // CW)
    if k >= COUNT:
        return (0, 0, 0, 0)
    cx, cy = x % CW, y % CH
    if not (20 <= cx < 100 and 15 <= cy < 135):
        return (0, 0, 0, 0)  # see-through round the product
    band = 20 + ((k * 80) // COUNT)
    if band <= cx < band + 12:
        return (90, 30, 60, 255)
    return (232, 150, 185, 255)


rows = bytearray()
for y in range(H):
    rows.append(0)
    for x in range(W):
        rows.extend(pixel(x, y))


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(bytes(rows), 9)) + chunk(b"IEND", b"")
out = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "spin-sheet.png"
out.write_bytes(png)
print(out, len(png), "bytes")
