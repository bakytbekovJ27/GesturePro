# -*- coding: utf-8 -*-
"""
screens/settings_screen.py
Экран настроек: переключение языка (RU / EN).
"""

import cv2
import numpy as np
import time
import math

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.localization import Lang
from core.gesture import GestureDetector, PinchButton, GESTURE_NONE
from core.renderer import (
    fill_bg, draw_rect_rounded, put_text, draw_cursor,
    draw_pinch_progress, draw_gesture_badge,
    C_BG, C_PANEL, C_CARD, C_BORDER, C_ACCENT, C_ACCENT2,
    C_PURPLE, C_TEXT, C_TEXT_DIM, C_SUCCESS, C_DANGER,
)

RESULT_BACK = "BACK"
RESULT_NONE = None

W, H = 1280, 720


class SettingsScreen:
    BTN_HOLD = 0.7

    def __init__(self):
        self._build_layout()
        self._t0 = time.time()

    def run(self, cap, detector: GestureDetector) -> str:
        while True:
            ret, frame = cap.read()
            if not ret:
                return RESULT_BACK
            frame = cv2.flip(frame, 1)

            result = detector.process(frame)
            pinch  = result["pinch_pos"]

            action = self._update(pinch)
            if action:
                return action

            canvas = self._render(result)
            cv2.imshow("Gesture Suite", canvas)

            key = cv2.waitKey(1) & 0xFF
            if key in (ord('q'), 27, ord('b')):
                return RESULT_BACK
            elif key == ord('r'):
                Lang.set("ru")
            elif key == ord('e'):
                Lang.set("en")

    # ── Layout ────────────────────────────────────────────────────────────────

    def _build_layout(self):
        cx = W // 2

        # Кнопки языка: РУС / ENG
        lang_y   = H // 2 - 20
        btn_w    = 160
        btn_h    = 64
        gap      = 24
        total_w  = btn_w * 2 + gap
        lx_ru    = cx - total_w // 2
        lx_en    = lx_ru + btn_w + gap

        self._btn_ru   = PinchButton(lx_ru, lang_y, btn_w, btn_h, self.BTN_HOLD)
        self._btn_en   = PinchButton(lx_en, lang_y, btn_w, btn_h, self.BTN_HOLD)
        self._ru_rect  = (lx_ru,  lang_y, btn_w, btn_h)
        self._en_rect  = (lx_en,  lang_y, btn_w, btn_h)

        # Кнопка «Назад»
        bk_w, bk_h = 220, 60
        bk_x = cx - bk_w // 2
        bk_y = H - 120
        self._btn_back  = PinchButton(bk_x, bk_y, bk_w, bk_h, self.BTN_HOLD)
        self._back_rect = (bk_x, bk_y, bk_w, bk_h)

    def _update(self, pinch) -> str | None:
        if self._btn_ru.update(pinch):
            Lang.set("ru")
        if self._btn_en.update(pinch):
            Lang.set("en")
        if self._btn_back.update(pinch):
            return RESULT_BACK
        return None

    # ── Рендеринг ─────────────────────────────────────────────────────────────

    def _render(self, det_result: dict) -> np.ndarray:
        canvas = np.zeros((H, W, 3), dtype=np.uint8)
        t      = time.time() - self._t0
        pinch  = det_result["pinch_pos"]

        # Фон
        for y in range(H):
            ratio = y / H
            canvas[y, :] = (int(20 + ratio*8), int(25 + ratio*10), int(38 + ratio*12))
        for x in range(0, W, 80):
            cv2.line(canvas, (x, 0), (x, H), (38, 42, 58), 1)
        for y in range(0, H, 80):
            cv2.line(canvas, (0, y), (W, y), (38, 42, 58), 1)

        # Заголовок
        put_text(canvas, Lang.t("settings_title"), (W//2, 110),
                 font_size=50, color=C_ACCENT, bold=True, anchor="ct")
        cv2.line(canvas, (W//2 - 200, 150), (W//2 + 200, 150), C_BORDER, 1)

        # Секция языка
        put_text(canvas, Lang.t("settings_language"), (W//2, 230),
                 font_size=26, color=C_TEXT_DIM, anchor="ct")

        current_lang = Lang.get()
        self._draw_lang_btn(canvas, self._ru_rect, "ru", current_lang, self._btn_ru, pinch)
        self._draw_lang_btn(canvas, self._en_rect, "en", current_lang, self._btn_en, pinch)

        # Разделитель
        cv2.line(canvas, (W//2 - 200, H - 145), (W//2 + 200, H - 145), C_BORDER, 1)

        # Кнопка «Назад»
        self._draw_simple_btn(canvas, self._back_rect,
                               Lang.t("settings_back"),
                               C_PANEL, C_BORDER, C_TEXT_DIM,
                               self._btn_back, pinch)

        # Подсказка
        put_text(canvas, Lang.t("gesture_hint"), (W//2, H - 36),
                 font_size=18, color=C_TEXT_DIM, anchor="ct")

        # PIP камера
        pw, ph = 200, 112
        pip = cv2.resize(det_result["annotated"], (pw, ph))
        x0, y0 = W - pw - 16, H - ph - 16
        draw_rect_rounded(canvas, (x0-2, y0-2), (x0+pw+2, y0+ph+2), C_BORDER, radius=8)
        canvas[y0:y0+ph, x0:x0+pw] = pip

        # Курсор
        if pinch:
            draw_cursor(canvas, pinch, is_pinching=True)
            for btn_obj in [self._btn_ru, self._btn_en, self._btn_back]:
                if btn_obj.is_hovered(pinch):
                    draw_pinch_progress(canvas, pinch, btn_obj.progress())
        elif det_result["index_pos"]:
            draw_cursor(canvas, det_result["index_pos"])

        g = det_result["gesture"]
        if g != GESTURE_NONE:
            draw_gesture_badge(canvas, g, 20, H - 16)

        return canvas

    def _draw_lang_btn(self, canvas, rect, code, current, btn_obj, pinch):
        x, y, bw, bh = rect
        is_active  = (current == code)
        is_hovered = btn_obj.is_hovered(pinch)
        pct        = btn_obj.progress()

        accent  = C_ACCENT if code == "ru" else C_ACCENT2
        bg      = tuple(int(c * 0.4) for c in accent) if is_active else C_CARD
        border  = accent if (is_active or is_hovered) else C_BORDER
        bw_t    = 2 if (is_active or is_hovered) else 1

        draw_rect_rounded(canvas, (x, y), (x+bw, y+bh), bg, radius=14)
        draw_rect_rounded(canvas, (x, y), (x+bw, y+bh), border, radius=14, thickness=bw_t)

        # Прогресс-заливка
        if is_hovered and pct > 0 and not is_active:
            fill_w = int(bw * pct)
            ov = canvas.copy()
            draw_rect_rounded(ov, (x, y), (x+fill_w, y+bh),
                               tuple(int(c*0.3) for c in accent), radius=14)
            cv2.addWeighted(ov, 0.5, canvas, 0.5, 0, canvas)

        label = Lang.t(f"settings_lang_{code}")
        color = accent if is_active else C_TEXT
        put_text(canvas, label, (x + bw//2, y + bh//2),
                 font_size=22, color=color, bold=is_active, anchor="cc")

        if is_active:
            dot_x = x + bw//2
            dot_y = y + bh + 10
            cv2.circle(canvas, (dot_x, dot_y), 4, accent, -1)

    def _draw_simple_btn(self, canvas, rect, label, bg, border, text_col,
                          btn_obj, pinch):
        x, y, bw, bh = rect
        hovered = btn_obj.is_hovered(pinch)
        pct     = btn_obj.progress()

        actual_bg = C_CARD if hovered else bg
        draw_rect_rounded(canvas, (x, y), (x+bw, y+bh), actual_bg, radius=12)
        draw_rect_rounded(canvas, (x, y), (x+bw, y+bh),
                           C_ACCENT2 if hovered else border,
                           radius=12, thickness=2 if hovered else 1)

        if hovered and pct > 0:
            fw = int(bw * pct)
            ov = canvas.copy()
            draw_rect_rounded(ov, (x, y), (x+fw, y+bh),
                               tuple(int(c*0.25) for c in C_ACCENT2), radius=12)
            cv2.addWeighted(ov, 0.5, canvas, 0.5, 0, canvas)

        col = C_ACCENT2 if hovered else text_col
        put_text(canvas, label, (x + bw//2, y + bh//2),
                 font_size=22, color=col, anchor="cc")