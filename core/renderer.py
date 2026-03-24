# -*- coding: utf-8 -*-
"""
core/renderer.py
Общие утилиты отрисовки OpenCV для всех экранов.
Поддержка UTF-8 текста через Pillow (если установлен), иначе ASCII fallback.
"""

import cv2
import numpy as np
import math

try:
    from PIL import Image, ImageDraw, ImageFont

    PIL_OK = True
except ImportError:
    PIL_OK = False


# ── Цвета (BGR) ───────────────────────────────────────────────────────────────
C_BG = (20, 22, 30)
C_PANEL = (28, 32, 44)
C_CARD = (35, 40, 58)
C_BORDER = (55, 62, 90)
C_ACCENT = (247, 142, 79)  # синий (BGR)
C_ACCENT2 = (194, 217, 41)  # циан
C_PURPLE = (245, 89, 155)
C_TEXT = (235, 240, 250)
C_TEXT_DIM = (110, 120, 150)
C_SUCCESS = (80, 200, 80)
C_DANGER = (60, 70, 230)


def fill_bg(frame: np.ndarray, color=C_BG):
    frame[:] = color


def draw_rect_rounded(img, pt1, pt2, color, radius=16, thickness=-1):
    """Рисует прямоугольник со скруглёнными углами (заливка или контур)."""
    x1, y1 = pt1
    x2, y2 = pt2
    r = radius

    if thickness == -1:
        # Заливка
        cv2.rectangle(img, (x1 + r, y1), (x2 - r, y2), color, -1)
        cv2.rectangle(img, (x1, y1 + r), (x2, y2 - r), color, -1)
        for cx, cy in [
            (x1 + r, y1 + r),
            (x2 - r, y1 + r),
            (x1 + r, y2 - r),
            (x2 - r, y2 - r),
        ]:
            cv2.circle(img, (cx, cy), r, color, -1)
    else:
        # Контур
        cv2.line(img, (x1 + r, y1), (x2 - r, y1), color, thickness)
        cv2.line(img, (x1 + r, y2), (x2 - r, y2), color, thickness)
        cv2.line(img, (x1, y1 + r), (x1, y2 - r), color, thickness)
        cv2.line(img, (x2, y1 + r), (x2, y2 - r), color, thickness)
        cv2.ellipse(img, (x1 + r, y1 + r), (r, r), 180, 0, 90, color, thickness)
        cv2.ellipse(img, (x2 - r, y1 + r), (r, r), 270, 0, 90, color, thickness)
        cv2.ellipse(img, (x1 + r, y2 - r), (r, r), 90, 0, 90, color, thickness)
        cv2.ellipse(img, (x2 - r, y2 - r), (r, r), 0, 0, 90, color, thickness)


def put_text(
    img,
    text: str,
    pos,
    font_size: int = 24,
    color=C_TEXT,
    bold: bool = False,
    anchor: str = "lt",
):
    """
    Рисует текст. Если PIL доступен — поддерживает Unicode/UTF-8.
    anchor: 'lt'=left-top, 'ct'=center-top, 'cc'=center-center, 'lc'=left-center
    """
    if PIL_OK:
        _put_pil(img, text, pos, font_size, color, bold, anchor)
    else:
        _put_cv(img, text, pos, font_size, color, bold, anchor)


def _put_pil(img, text, pos, size, color, bold, anchor):
    # Конвертируем BGR→RGB для PIL
    pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)

    # Ищем системный шрифт
    font = _get_font(size, bold)

    x, y = pos
    if anchor in ("ct", "cc"):
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        x -= tw // 2
    if anchor in ("cc", "lc"):
        bbox = draw.textbbox((0, 0), text, font=font)
        th = bbox[3] - bbox[1]
        y -= th // 2

    # BGR → RGB для цвета
    r, g, b = color[2], color[1], color[0]
    draw.text((x, y), text, font=font, fill=(r, g, b))
    cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR, dst=img)


def _put_cv(img, text, pos, size, color, bold, anchor):
    scale = size / 30.0
    thickness = 2 if bold else 1
    x, y = pos
    if anchor in ("ct", "cc"):
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, thickness)
        x -= tw // 2
        if anchor == "cc":
            y += th // 2
    cv2.putText(
        img,
        text,
        (x, y + int(size * 0.75)),
        cv2.FONT_HERSHEY_SIMPLEX,
        scale,
        color,
        thickness,
        cv2.LINE_AA,
    )


# ── Шрифт PIL ─────────────────────────────────────────────────────────────────
_font_cache: dict = {}


def _get_font(size: int, bold: bool):
    key = (size, bold)
    if key in _font_cache:
        return _font_cache[key]

    candidates = []
    if bold:
        candidates += [
            "C:/Windows/Fonts/segoeui.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
    candidates += [
        "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]

    font = None
    for path in candidates:
        try:
            from PIL import ImageFont

            font = ImageFont.truetype(path, size)
            break
        except Exception:
            continue

    if font is None:
        try:
            from PIL import ImageFont

            font = ImageFont.load_default()
        except Exception:
            font = None

    _font_cache[key] = font
    return font


# ── Специальные виджеты ───────────────────────────────────────────────────────


def draw_cursor(img, pos, is_pinching: bool = False):
    """Рисует курсор руки."""
    x, y = pos
    color = C_ACCENT if is_pinching else C_TEXT
    r = 12 if is_pinching else 8
    cv2.circle(img, (x, y), r, color, -1)
    cv2.circle(img, (x, y), r + 3, (*color[:2], color[2] // 2), 1)


def draw_pinch_progress(img, pos, progress: float, color=C_ACCENT):
    """Рисует кольцевой индикатор прогресса вокруг курсора."""
    if progress <= 0:
        return
    x, y = pos
    radius = 22
    angle = int(360 * progress)
    cv2.ellipse(img, (x, y), (radius, radius), -90, 0, angle, color, 3)


def draw_gesture_badge(img, text: str, x: int, y: int):
    """Маленький бейдж с текущим жестом."""
    padding = 10
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
    bx1 = x - padding
    by1 = y - th - padding
    bx2 = x + tw + padding
    by2 = y + padding
    draw_rect_rounded(img, (bx1, by1), (bx2, by2), C_PANEL)
    draw_rect_rounded(img, (bx1, by1), (bx2, by2), C_BORDER, radius=12, thickness=1)
    cv2.putText(
        img, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, C_TEXT_DIM, 1, cv2.LINE_AA
    )
