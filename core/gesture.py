# -*- coding: utf-8 -*-
"""
core/gesture.py
Распознавание жестов руки через MediaPipe.
Экспортирует:
  - GestureDetector  — основной класс
  - GESTURE_*        — константы жестов
"""

import math
import time
import cv2
import mediapipe as mp
import numpy as np

# ── Константы жестов ──────────────────────────────────────────────────────────
GESTURE_NONE = "NONE"
GESTURE_FIST = "FIST"
GESTURE_POINT = "POINT"  # только указательный
GESTURE_THUMB = "THUMB"  # только большой
GESTURE_PALM = "PALM"  # все пальцы
GESTURE_PEACE = "PEACE"  # указательный + средний
GESTURE_PINCH = "PINCH"  # большой + указательный соприкасаются


class GestureDetector:
    """
    Инициализирует MediaPipe Hands и обрабатывает кадры.
    Использование:
        detector = GestureDetector()
        result = detector.process(frame)  # BGR numpy array
        gesture  = result['gesture']
        landmarks = result['landmarks']  # или None
        pinch_pos = result['pinch_pos']  # (x, y) в пикселях или None
    """

    PINCH_THRESHOLD = 0.06  # нормализованное расстояние для пинча

    def __init__(
        self,
        max_hands: int = 1,
        detection_conf: float = 0.75,
        tracking_conf: float = 0.75,
    ):
        self._mp_hands = mp.solutions.hands
        self._mp_drawing = mp.solutions.drawing_utils
        self._hands = self._mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=max_hands,
            min_detection_confidence=detection_conf,
            min_tracking_confidence=tracking_conf,
        )

    # ── Публичный метод ───────────────────────────────────────────────────────

    def process(self, frame: np.ndarray) -> dict:
        """
        Обрабатывает один BGR-кадр.
        Возвращает dict:
          gesture    : str (GESTURE_*)
          landmarks  : mp.framework.formats.landmark_pb2.NormalizedLandmarkList | None
          pinch_pos  : (int, int) | None  — пиксельные координаты пинча
          index_pos  : (int, int) | None  — кончик указательного пальца
          annotated  : np.ndarray         — кадр с нарисованными landmarks
        """
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = self._hands.process(rgb)

        out = {
            "gesture": GESTURE_NONE,
            "landmarks": None,
            "pinch_pos": None,
            "index_pos": None,
            "annotated": frame.copy(),
        }

        if not res.multi_hand_landmarks:
            return out

        lm = res.multi_hand_landmarks[0]
        out["landmarks"] = lm

        # Рисуем landmarks
        self._mp_drawing.draw_landmarks(
            out["annotated"],
            lm,
            self._mp_hands.HAND_CONNECTIONS,
            self._mp_drawing.DrawingSpec(
                color=(0, 230, 100), thickness=1, circle_radius=2
            ),
            self._mp_drawing.DrawingSpec(color=(180, 0, 0), thickness=1),
        )

        gesture = self._classify(lm)
        out["gesture"] = gesture

        # Позиция кончика указательного
        idx_tip = lm.landmark[self._mp_hands.HandLandmark.INDEX_FINGER_TIP]
        out["index_pos"] = (int(idx_tip.x * w), int(idx_tip.y * h))

        # Позиция пинча — середина между большим и указательным
        if gesture == GESTURE_PINCH:
            th_tip = lm.landmark[self._mp_hands.HandLandmark.THUMB_TIP]
            px = int((th_tip.x + idx_tip.x) / 2 * w)
            py = int((th_tip.y + idx_tip.y) / 2 * h)
            out["pinch_pos"] = (px, py)

        return out

    def close(self):
        self._hands.close()

    # ── Классификация жестов ──────────────────────────────────────────────────

    def _classify(self, lm) -> str:
        f = self._fingers_up(lm)
        n = sum(f.values())

        # Пинч: большой + указательный близко
        if self._is_pinch(lm):
            return GESTURE_PINCH

        if n == 0:
            return GESTURE_FIST
        if n == 5:
            return GESTURE_PALM
        if f["index"] and f["middle"] and not f["ring"] and not f["pinky"]:
            return GESTURE_PEACE
        if f["index"] and n == 1:
            return GESTURE_POINT
        if f["thumb"] and n == 1:
            return GESTURE_THUMB
        return GESTURE_NONE

    def _fingers_up(self, lm) -> dict:
        H = self._mp_hands.HandLandmark

        def up(tip, pip):
            return lm.landmark[tip].y < lm.landmark[pip].y

        tt = lm.landmark[H.THUMB_TIP]
        ti = lm.landmark[H.THUMB_IP]
        return {
            "thumb": abs(tt.x - ti.x) > 0.03,
            "index": up(H.INDEX_FINGER_TIP, H.INDEX_FINGER_PIP),
            "middle": up(H.MIDDLE_FINGER_TIP, H.MIDDLE_FINGER_PIP),
            "ring": up(H.RING_FINGER_TIP, H.RING_FINGER_PIP),
            "pinky": up(H.PINKY_TIP, H.PINKY_PIP),
        }

    def _is_pinch(self, lm) -> bool:
        H = self._mp_hands.HandLandmark
        th = lm.landmark[H.THUMB_TIP]
        idx = lm.landmark[H.INDEX_FINGER_TIP]
        dist = math.hypot(th.x - idx.x, th.y - idx.y)
        return dist < self.PINCH_THRESHOLD


# ── Вспомогательный класс: отслеживание удержания кнопки через пинч ──────────


class PinchButton:
    """
    Отслеживает, навёл ли пользователь пинч на прямоугольную зону кнопки.
    Кнопка «нажимается» после удержания HOLD_TIME секунд.

    Использование:
        btn = PinchButton(x, y, w, h, hold_time=0.8)
        clicked = btn.update(pinch_pos)   # True при первом срабатывании
        btn.draw(frame)                   # рисует прогресс
    """

    HOLD_TIME = 0.8  # секунд до нажатия

    def __init__(self, x: int, y: int, w: int, h: int, hold_time: float = None):
        self.rect = (x, y, w, h)
        self.hold_time = hold_time or self.HOLD_TIME
        self._start = None
        self._fired = False

    def update(self, pinch_pos) -> bool:
        """Возвращает True в момент первого нажатия."""
        if pinch_pos and self._inside(pinch_pos):
            if self._start is None:
                self._start = time.time()
                self._fired = False
            elapsed = time.time() - self._start
            if elapsed >= self.hold_time and not self._fired:
                self._fired = True
                return True
        else:
            self._start = None
            self._fired = False
        return False

    def progress(self) -> float:
        """0.0 … 1.0 — прогресс удержания."""
        if self._start is None:
            return 0.0
        return min((time.time() - self._start) / self.hold_time, 1.0)

    def is_hovered(self, pinch_pos) -> bool:
        return pinch_pos is not None and self._inside(pinch_pos)

    def draw_progress(self, frame: np.ndarray, color=(79, 142, 247), bg=(40, 40, 40)):
        """Рисует индикатор прогресса под кнопкой."""
        x, y, w, h = self.rect
        pct = self.progress()
        if pct <= 0:
            return
        bar_h = 4
        bar_y = y + h + 4
        cv2.rectangle(frame, (x, bar_y), (x + w, bar_y + bar_h), bg, -1)
        cv2.rectangle(frame, (x, bar_y), (x + int(w * pct), bar_y + bar_h), color, -1)

    def _inside(self, pos) -> bool:
        x, y, w, h = self.rect
        px, py = pos
        return x <= px <= x + w and y <= py <= y + h
