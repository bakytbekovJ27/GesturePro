# -*- coding: utf-8 -*-
"""
screens/presentation_screen.py
Экран управления презентацией жестами.
Жесты: кулак=вкл/выкл, указательный=рисовать, большой=ластик,
       ладонь=очистить, 2 пальца=листать.
Клавиши: ←/→/A/D=слайды, X=очистить, C=цвет, S=сохранить, M=меню, Q=выход
"""

import cv2
import numpy as np
import time
import os

import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.localization import Lang
from core.gesture import (
    GestureDetector,
    GESTURE_FIST,
    GESTURE_POINT,
    GESTURE_THUMB,
    GESTURE_PALM,
    GESTURE_PEACE,
    GESTURE_NONE,
)
from core.renderer import (
    draw_rect_rounded,
    put_text,
    draw_cursor,
    draw_gesture_badge,
    C_PANEL,
    C_BORDER,
    C_ACCENT,
    C_ACCENT2,
    C_PURPLE,
    C_TEXT,
    C_TEXT_DIM,
    C_SUCCESS,
    C_DANGER,
)

RESULT_MENU = "MENU"
RESULT_LOAD = "LOAD"
RESULT_EXIT = "EXIT"

W, H = 1280, 720
HUD_H = 90
PIP_W, PIP_H = 220, 124

FIST_HOLD = 1.0
CLEAR_HOLD = 1.5
SWIPE_THRESH = 0.14
SWIPE_MAX_TIME = 1.2
SLIDE_COOLDOWN = 0.8

COLORS = [
    (0, 80, 255),
    (0, 200, 60),
    (0, 180, 255),
    (180, 0, 255),
    (0, 230, 230),
    (255, 255, 0),
    (255, 255, 255),
]


class PresentationScreen:
    def __init__(self, slides: list):
        self._slides = slides
        self._total = len(slides)
        self._idx = 0
        self._annotations = [
            np.zeros((H, W, 3), dtype=np.uint8) for _ in range(self._total)
        ]

        self._system_on = False
        self._mode = GESTURE_NONE

        self._brush_col = COLORS[0]
        self._brush_sz = 5
        self._eraser_sz = 30
        self._color_idx = 0

        self._prev_xy = None
        self._fist_t = None
        self._fist_fired = False
        self._clear_t = None
        self._swipe_x = None
        self._swipe_t = None
        self._last_slide = 0

    # ── Публичный метод ───────────────────────────────────────────────────────

    def run(self, cap, detector: GestureDetector) -> str:
        while True:
            ret, frame = cap.read()
            if not ret:
                return RESULT_EXIT
            frame = cv2.flip(frame, 1)

            result = detector.process(frame)
            landmark = result["landmarks"]
            ann_cam = result["annotated"]

            self._process_gesture(result, detector)

            canvas = self._render(ann_cam)
            cv2.imshow("Gesture Suite", canvas)

            key = cv2.waitKey(1) & 0xFF
            action = self._handle_key(key)
            if action:
                return action

        return RESULT_MENU

    # ── Обработка жестов ─────────────────────────────────────────────────────

    def _process_gesture(self, result: dict, detector: GestureDetector):
        lm = result["landmarks"]
        gesture = result["gesture"]
        idx_pos = result["index_pos"]

        if lm is None:
            self._prev_xy = None
            self._fist_t = None
            self._fist_fired = False
            self._swipe_x = None
            self._mode = GESTURE_NONE
            return

        fx, fy = idx_pos or (0, 0)

        # Кулак — активация/деактивация
        if gesture == GESTURE_FIST:
            if self._fist_t is None:
                self._fist_t = time.time()
                self._fist_fired = False
            if time.time() - self._fist_t >= FIST_HOLD and not self._fist_fired:
                self._system_on = not self._system_on
                self._fist_fired = True
                self._prev_xy = None
                self._swipe_x = None
        else:
            self._fist_t = None
            self._fist_fired = False

        if not self._system_on:
            self._mode = GESTURE_NONE
            self._prev_xy = None
            return

        # Листание (два пальца)
        if gesture == GESTURE_PEACE:
            self._mode = GESTURE_PEACE
            self._clear_t = None
            lm_obj = lm
            mp_h = detector._mp_hands
            idx_tip = lm_obj.landmark[mp_h.HandLandmark.INDEX_FINGER_TIP]
            if self._swipe_x is None:
                self._swipe_x = idx_tip.x
                self._swipe_t = time.time()
            else:
                delta = idx_tip.x - self._swipe_x
                dt = time.time() - self._swipe_t
                now = time.time()
                if dt < SWIPE_MAX_TIME and now - self._last_slide > SLIDE_COOLDOWN:
                    if delta > SWIPE_THRESH:
                        self._idx = (self._idx - 1) % self._total
                        self._last_slide = now
                        self._swipe_x = idx_tip.x
                        self._prev_xy = None
                    elif delta < -SWIPE_THRESH:
                        self._idx = (self._idx + 1) % self._total
                        self._last_slide = now
                        self._swipe_x = idx_tip.x
                        self._prev_xy = None
                elif dt >= SWIPE_MAX_TIME:
                    self._swipe_x = idx_tip.x
                    self._swipe_t = time.time()
            self._prev_xy = None
            return
        else:
            self._swipe_x = None

        # Очистка (ладонь)
        if gesture == GESTURE_PALM:
            self._mode = GESTURE_PALM
            if self._clear_t is None:
                self._clear_t = time.time()
            if time.time() - self._clear_t >= CLEAR_HOLD:
                self._annotations[self._idx] = np.zeros((H, W, 3), dtype=np.uint8)
                self._clear_t = None
            self._prev_xy = None
            return

        self._clear_t = None

        # Рисование
        if gesture == GESTURE_POINT:
            self._mode = GESTURE_POINT
            if self._prev_xy:
                cv2.line(
                    self._annotations[self._idx],
                    self._prev_xy,
                    (fx, fy),
                    self._brush_col,
                    self._brush_sz,
                )
            self._prev_xy = (fx, fy)
            return

        # Ластик
        if gesture == GESTURE_THUMB:
            self._mode = GESTURE_THUMB
            mp_h = detector._mp_hands
            th_tip = lm.landmark[mp_h.HandLandmark.THUMB_TIP]
            ex = int(th_tip.x * W)
            ey = int(th_tip.y * H)
            if self._prev_xy:
                cv2.line(
                    self._annotations[self._idx],
                    self._prev_xy,
                    (ex, ey),
                    (0, 0, 0),
                    self._eraser_sz,
                )
            else:
                cv2.circle(
                    self._annotations[self._idx],
                    (ex, ey),
                    self._eraser_sz // 2,
                    (0, 0, 0),
                    -1,
                )
            self._prev_xy = (ex, ey)
            return

        self._prev_xy = None
        self._mode = GESTURE_NONE

    # ── Рендеринг ─────────────────────────────────────────────────────────────

    def _render(self, cam_frame: np.ndarray) -> np.ndarray:
        slide = self._slides[self._idx].copy()

        # Наложение аннотаций
        ann = self._annotations[self._idx]
        gray = cv2.cvtColor(ann, cv2.COLOR_BGR2GRAY)
        _, mask = cv2.threshold(gray, 1, 255, cv2.THRESH_BINARY)
        mask_inv = cv2.bitwise_not(mask)
        display = cv2.add(
            cv2.bitwise_and(slide, slide, mask=mask_inv),
            cv2.bitwise_and(ann, ann, mask=mask),
        )

        # Затемнение если неактивно
        if not self._system_on:
            ov = display.copy()
            cv2.rectangle(ov, (0, 0), (W, H), (0, 0, 40), -1)
            display = cv2.addWeighted(display, 0.8, ov, 0.2, 0)
            put_text(
                display,
                "HOLD FIST TO ACTIVATE",
                (W // 2, H // 2),
                font_size=38,
                color=(200, 160, 80),
                bold=True,
                anchor="cc",
            )

        # Курсор рисования
        if self._system_on and self._mode == GESTURE_POINT and self._prev_xy:
            cv2.circle(display, self._prev_xy, self._brush_sz + 4, self._brush_col, 2)

        # PIP камера
        pip = cv2.resize(cam_frame, (PIP_W, PIP_H))
        draw_rect_rounded(
            display,
            (W - PIP_W - 12, H - PIP_H - 12),
            (W - 10, H - 10),
            C_BORDER,
            radius=8,
        )
        display[H - PIP_H - 10 : H - 10, W - PIP_W - 10 : W - 10] = pip

        # HUD снизу
        hud = self._draw_hud()
        return np.vstack([display, hud])

    def _draw_hud(self) -> np.ndarray:
        hud = np.zeros((HUD_H, W, 3), dtype=np.uint8)
        hud[:] = (18, 22, 32)
        cv2.line(hud, (0, 0), (W, 0), C_BORDER, 1)

        # Статус
        if self._system_on:
            put_text(
                hud,
                Lang.t("hud_active"),
                (12, 12),
                font_size=20,
                color=C_SUCCESS,
                bold=True,
                anchor="lt",
            )
        else:
            put_text(
                hud,
                Lang.t("hud_paused"),
                (12, 12),
                font_size=20,
                color=(80, 80, 200),
                bold=True,
                anchor="lt",
            )

        # Номер слайда
        slide_text = (
            f"{Lang.t('hud_slide')} {self._idx+1} {Lang.t('hud_of')} {self._total}"
        )
        put_text(hud, slide_text, (12, 42), font_size=18, color=C_TEXT_DIM, anchor="lt")

        # Режим
        mode_map = {
            GESTURE_POINT: Lang.t("hud_draw"),
            GESTURE_THUMB: Lang.t("hud_erase"),
            GESTURE_PEACE: Lang.t("hud_swipe"),
            GESTURE_PALM: Lang.t("hud_clear"),
            GESTURE_NONE: Lang.t("hud_idle"),
        }
        mode_str = mode_map.get(self._mode, self._mode)
        put_text(
            hud,
            mode_str,
            (200, 15),
            font_size=22,
            color=C_ACCENT2,
            bold=True,
            anchor="lt",
        )

        # Цвет кисти
        cv2.rectangle(hud, (200, 48), (260, 75), self._brush_col, -1)
        cv2.rectangle(hud, (200, 48), (260, 75), C_BORDER, 1)
        put_text(
            hud,
            f"B:{self._brush_sz}",
            (268, 48),
            font_size=16,
            color=C_TEXT_DIM,
            anchor="lt",
        )

        # Прогресс слайдов (полоска)
        bar_x = W - 320
        bar_w = 300
        bar_y = 35
        bar_h = 6
        cv2.rectangle(
            hud, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (40, 44, 60), -1
        )
        fill = int(bar_w * (self._idx / max(self._total - 1, 1)))
        cv2.rectangle(hud, (bar_x, bar_y), (bar_x + fill, bar_y + bar_h), C_ACCENT, -1)

        # Подсказка
        hint = Lang.t("hud_hint")
        put_text(
            hud, hint, (8, HUD_H - 24), font_size=12, color=(90, 95, 120), anchor="lt"
        )
        put_text(
            hud,
            Lang.t("hud_back_menu"),
            (W - 160, HUD_H - 24),
            font_size=14,
            color=C_TEXT_DIM,
            anchor="lt",
        )

        return hud

    # ── Клавиатура ────────────────────────────────────────────────────────────

    def _handle_key(self, key: int) -> str | None:
        if key in (ord("q"), 27):
            return RESULT_EXIT
        elif key == ord("m"):
            return RESULT_MENU
        elif key == ord("o"):
            return RESULT_LOAD
        elif key in (ord("d"), 83, 0x27):
            self._idx = (self._idx + 1) % self._total
            self._prev_xy = None
        elif key in (ord("a"), 81, 0x25):
            self._idx = (self._idx - 1) % self._total
            self._prev_xy = None
        elif key == ord("x"):
            self._annotations[self._idx] = np.zeros((H, W, 3), dtype=np.uint8)
        elif key == ord("c"):
            self._color_idx = (self._color_idx + 1) % len(COLORS)
            self._brush_col = COLORS[self._color_idx]
        elif key == ord("s"):
            fname = f"slide_{self._idx+1}_{int(time.time())}.png"
            slide = self._slides[self._idx].copy()
            ann = self._annotations[self._idx]
            gray = cv2.cvtColor(ann, cv2.COLOR_BGR2GRAY)
            _, mask = cv2.threshold(gray, 1, 255, cv2.THRESH_BINARY)
            mask_inv = cv2.bitwise_not(mask)
            out = cv2.add(
                cv2.bitwise_and(slide, slide, mask=mask_inv),
                cv2.bitwise_and(ann, ann, mask=mask),
            )
            cv2.imwrite(fname, out)
            print(f"💾 {fname}")
        elif key in (ord("+"), ord("=")):
            self._brush_sz = min(self._brush_sz + 2, 40)
        elif key in (ord("-"), ord("_")):
            self._brush_sz = max(self._brush_sz - 2, 1)
        return None
