# -*- coding: utf-8 -*-
"""
screens/menu_screen.py
Главное игровое меню: СТАРТ / НАСТРОЙКИ / ВЫХОД
Управление: пинч (большой + указательный) → навести на кнопку и удержать.
"""

import cv2
import numpy as np
import math
import time

import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.localization import Lang
from core.gesture import GestureDetector, PinchButton, GESTURE_PINCH, GESTURE_NONE
from core.renderer import (
    fill_bg,
    draw_rect_rounded,
    put_text,
    draw_cursor,
    draw_pinch_progress,
    draw_gesture_badge,
    C_BG,
    C_PANEL,
    C_CARD,
    C_BORDER,
    C_ACCENT,
    C_ACCENT2,
    C_PURPLE,
    C_TEXT,
    C_TEXT_DIM,
    C_SUCCESS,
    C_DANGER,
)

# Возможные результаты экрана
RESULT_START = "START"
RESULT_SETTINGS = "SETTINGS"
RESULT_EXIT = "EXIT"
RESULT_NONE = None

W, H = 1280, 720


class MenuScreen:
    """
    Рендерит главное меню и обрабатывает ввод жестов.
    Возвращает результат через .run(cap, detector).
    """

    # Параметры кнопок (будут пересчитаны в _layout)
    BTN_W = 380
    BTN_H = 80
    BTN_GAP = 22
    BTN_HOLD = 0.7  # секунд удержания пинча

    BUTTONS = [
        ("menu_start", RESULT_START, C_ACCENT),
        ("menu_settings", RESULT_SETTINGS, C_ACCENT2),
        ("menu_exit", RESULT_EXIT, C_DANGER),
    ]

    def __init__(self):
        self._pinch_btns: list[PinchButton] = []
        self._btn_rects: list[tuple] = []
        self._build_layout()
        self._particles = self._init_particles()
        self._t0 = time.time()

    # ── Публичный метод ───────────────────────────────────────────────────────

    def run(self, cap, detector: GestureDetector) -> str:
        """Блокирующий цикл. Возвращает RESULT_*."""
        while True:
            ret, frame = cap.read()
            if not ret:
                return RESULT_EXIT
            frame = cv2.flip(frame, 1)

            result = detector.process(frame)
            gesture = result["gesture"]
            pinch = result["pinch_pos"]

            # Обновляем кнопки
            action = self._update_buttons(pinch)
            if action:
                return action

            # Рисуем
            canvas = self._render(frame, result)
            cv2.imshow("Gesture Suite", canvas)

            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                return RESULT_EXIT
            elif key == ord("1"):
                return RESULT_START
            elif key == ord("2"):
                return RESULT_SETTINGS

    # ── Построение Layout ─────────────────────────────────────────────────────

    def _build_layout(self):
        total_h = (
            len(self.BUTTONS) * self.BTN_H + (len(self.BUTTONS) - 1) * self.BTN_GAP
        )
        start_y = H // 2 - total_h // 2 + 40
        cx = W // 2

        self._btn_rects = []
        self._pinch_btns = []
        for i, (_, _, _) in enumerate(self.BUTTONS):
            x = cx - self.BTN_W // 2
            y = start_y + i * (self.BTN_H + self.BTN_GAP)
            self._btn_rects.append((x, y, self.BTN_W, self.BTN_H))
            self._pinch_btns.append(
                PinchButton(x, y, self.BTN_W, self.BTN_H, hold_time=self.BTN_HOLD)
            )

    def _update_buttons(self, pinch_pos) -> str | None:
        for btn, (_, result, _) in zip(self._pinch_btns, self.BUTTONS):
            if btn.update(pinch_pos):
                return result
        return None

    # ── Рендеринг ─────────────────────────────────────────────────────────────

    def _render(self, cam_frame: np.ndarray, det_result: dict) -> np.ndarray:
        canvas = np.zeros((H, W, 3), dtype=np.uint8)
        t = time.time() - self._t0

        # Тёмный фон с градиентом
        self._draw_bg(canvas)

        # Декоративные частицы
        self._draw_particles(canvas, t)

        # Камера в левом верхнем углу (PIP)
        self._draw_pip(canvas, det_result["annotated"])

        # Заголовок
        self._draw_title(canvas, t)

        # Кнопки
        pinch = det_result["pinch_pos"]
        self._draw_buttons(canvas, pinch)

        # Подсказка по жесту
        hint = Lang.t("gesture_hint")
        put_text(
            canvas, hint, (W // 2, H - 36), font_size=18, color=C_TEXT_DIM, anchor="ct"
        )

        # Курсор
        if pinch:
            draw_cursor(canvas, pinch, is_pinching=True)
            # Прогресс вокруг курсора
            for btn_obj, (_, _, _) in zip(self._pinch_btns, self.BUTTONS):
                if btn_obj.is_hovered(pinch):
                    draw_pinch_progress(canvas, pinch, btn_obj.progress(), C_ACCENT)

        elif det_result["index_pos"]:
            draw_cursor(canvas, det_result["index_pos"], is_pinching=False)

        # Жест-бейдж
        g = det_result["gesture"]
        if g != GESTURE_NONE:
            draw_gesture_badge(canvas, g, 20, H - 16)

        return canvas

    def _draw_bg(self, canvas):
        # Вертикальный градиент
        for y in range(H):
            ratio = y / H
            b = int(20 + ratio * 10)
            g = int(22 + ratio * 8)
            r = int(30 + ratio * 15)
            canvas[y, :] = (b, g, r)

        # Сетка
        for x in range(0, W, 80):
            cv2.line(canvas, (x, 0), (x, H), (40, 44, 60), 1)
        for y in range(0, H, 80):
            cv2.line(canvas, (0, y), (W, y), (40, 44, 60), 1)

    def _draw_particles(self, canvas, t):
        for p in self._particles:
            age = (t * p["speed"] + p["phase"]) % 1.0
            alpha = math.sin(age * math.pi)
            x = int(p["x"] * W)
            y = int((p["y"] + age * 0.3) % 1.0 * H)
            r = int(p["r"] * alpha)
            if r > 0:
                color = tuple(int(c * alpha * 0.6) for c in p["color"])
                cv2.circle(canvas, (x, y), r, color, -1)

    def _draw_pip(self, canvas, cam_frame):
        pw, ph = 240, 135
        pip = cv2.resize(cam_frame, (pw, ph))
        # Полупрозрачная рамка
        x0, y0 = W - pw - 16, H - ph - 16
        draw_rect_rounded(
            canvas, (x0 - 3, y0 - 3), (x0 + pw + 3, y0 + ph + 3), C_BORDER, radius=10
        )
        canvas[y0 : y0 + ph, x0 : x0 + pw] = pip

    def _draw_title(self, canvas, t):
        pulse = 0.85 + 0.15 * math.sin(t * 1.5)
        bright = tuple(int(c * pulse) for c in C_ACCENT)

        # Декоративная линия
        lx1 = W // 2 - 180
        lx2 = W // 2 + 180
        ly = 160
        cv2.line(canvas, (lx1, ly), (lx2, ly), C_BORDER, 1)

        put_text(
            canvas,
            Lang.t("menu_subtitle"),
            (W // 2, 120),
            font_size=22,
            color=C_TEXT_DIM,
            anchor="ct",
        )
        put_text(
            canvas,
            "GESTURE SUITE",
            (W // 2, 185),
            font_size=52,
            color=bright,
            bold=True,
            anchor="ct",
        )

        cv2.line(canvas, (lx1, 205), (lx2, 205), C_BORDER, 1)

    def _draw_buttons(self, canvas, pinch):
        for i, ((key, result, accent), (x, y, bw, bh)) in enumerate(
            zip(self.BUTTONS, self._btn_rects)
        ):
            btn_obj = self._pinch_btns[i]
            hovered = btn_obj.is_hovered(pinch)
            pct = btn_obj.progress()

            # Фон кнопки
            bg_color = tuple(int(c * 0.35) for c in accent) if hovered else C_CARD
            draw_rect_rounded(canvas, (x, y), (x + bw, y + bh), bg_color, radius=14)

            # Рамка
            border_col = accent if hovered else C_BORDER
            border_w = 2 if hovered else 1
            draw_rect_rounded(
                canvas,
                (x, y),
                (x + bw, y + bh),
                border_col,
                radius=14,
                thickness=border_w,
            )

            # Прогресс заполнения кнопки
            if hovered and pct > 0:
                fill_w = int(bw * pct)
                fill_color = tuple(int(c * 0.5) for c in accent)
                # Клипируем прямоугольник до кнопки
                overlay = canvas.copy()
                draw_rect_rounded(
                    overlay, (x, y), (x + fill_w, y + bh), fill_color, radius=14
                )
                cv2.addWeighted(overlay, 0.4, canvas, 0.6, 0, canvas)

            # Текст кнопки
            text_color = accent if hovered else C_TEXT
            put_text(
                canvas,
                Lang.t(key),
                (x + bw // 2, y + bh // 2),
                font_size=26,
                color=text_color,
                bold=True,
                anchor="cc",
            )

            # Клавишная подсказка (1/2/3)
            hint_key = str(i + 1)
            put_text(
                canvas,
                hint_key,
                (x + bw - 22, y + bh - 12),
                font_size=14,
                color=C_TEXT_DIM,
            )

    # ── Частицы ───────────────────────────────────────────────────────────────

    @staticmethod
    def _init_particles():
        import random

        rng = random.Random(42)
        palette = [C_ACCENT, C_ACCENT2, C_PURPLE]
        return [
            {
                "x": rng.random(),
                "y": rng.random(),
                "r": rng.randint(2, 5),
                "speed": rng.uniform(0.05, 0.15),
                "phase": rng.random(),
                "color": palette[rng.randint(0, 2)],
            }
            for _ in range(40)
        ]
