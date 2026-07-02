#!/usr/bin/env python3
"""Generate static image assets (og.png, favicon.ico, apple-touch-icon.png).

Build-time only — run manually and commit the output; the site itself stays
dependency-free at runtime. Requires Pillow (reads the self-hosted woff2 fonts
directly). Design tokens mirror assets/style.css (dark theme + green accent).

Usage: python3 scripts/build_assets.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "assets" / "fonts"

BG = "#070b08"        # --bg (dark)
SURFACE = "#0c1410"   # --surface
ACCENT = "#27d27f"    # --accent (green)
TEXT = "#e9f4eb"      # --text
TEXT2 = "#90a596"     # --text2


def rounded_square(size: int, radius: int, color: str) -> Image.Image:
    """Anti-aliased rounded square via 4x supersampling."""
    scale = 4
    big = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(big)
    draw.rounded_rectangle(
        [0, 0, size * scale - 1, size * scale - 1],
        radius=radius * scale,
        fill=color,
    )
    return big.resize((size, size), Image.LANCZOS)


def build_icons() -> None:
    # favicon.ico: 48x48 (Google Search minimum), plus 32/16 variants embedded
    base = rounded_square(48, 9, ACCENT)
    base.save(ROOT / "favicon.ico", sizes=[(48, 48), (32, 32), (16, 16)])

    # apple-touch-icon: 180x180, radius scaled from the 16px viewBox (3/16)
    touch = rounded_square(180, 34, ACCENT)
    opaque = Image.new("RGB", touch.size, BG)
    opaque.paste(touch, mask=touch.split()[3])
    opaque.save(ROOT / "assets" / "apple-touch-icon.png")


def build_og() -> None:
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    # faint background grid (echoes .bg-grid)
    grid = "#0d1510"
    for x in range(0, w, 48):
        draw.line([(x, 0), (x, h)], fill=grid, width=1)
    for y in range(0, h, 48):
        draw.line([(0, y), (w, y)], fill=grid, width=1)

    display = ImageFont.truetype(str(FONTS / "ibm-plex-sans-700.woff2"), 132)
    sub = ImageFont.truetype(str(FONTS / "ibm-plex-sans-500.woff2"), 44)
    mono = ImageFont.truetype(str(FONTS / "jetbrains-mono-500.woff2"), 26)

    cx = 120
    # brand dot (glow ring + solid core, echoes .brand__dot)
    dot_y = 235
    draw.ellipse([cx - 6, dot_y - 6, cx + 62, dot_y + 62], outline=ACCENT, width=2)
    draw.rounded_rectangle([cx, dot_y, cx + 56, dot_y + 56], radius=14, fill=ACCENT)

    # wordmark
    draw.text((cx + 92, 180), "sieve", font=display, fill=TEXT)

    # tagline
    draw.text((cx, 366), "Local security proxy for AI coding agents", font=sub, fill=TEXT2)

    # bottom mono strip
    draw.text((cx, 500), "127.0.0.1 · fail-closed · zero cloud · open engine", font=mono, fill=ACCENT)

    img.save(ROOT / "assets" / "og.png")


if __name__ == "__main__":
    build_icons()
    build_og()
    print("ok: favicon.ico, assets/apple-touch-icon.png, assets/og.png")
