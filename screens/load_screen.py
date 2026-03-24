# -*- coding: utf-8 -*-
"""
screens/load_screen.py
Экран выбора файла презентации (PDF / демо-слайды).
Не использует tkinter — открывает нативный диалог macOS через osascript,
на Windows/Linux — ввод пути через клавиатуру прямо в окне OpenCV.

Все блокирующие операции (osascript, load_pdf) выполняются в фоновом потоке,
чтобы главный цикл OpenCV никогда не зависал.
"""

import cv2
import numpy as np
import os
import sys
import time
import threading
import subprocess
import platform
import math
from pathlib import Path

import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.localization import Lang
from core.gesture import GestureDetector, PinchButton, GESTURE_NONE
from core.slide_loader import load_pdf, create_demo_slides, load_folder
from core.renderer import (
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

RESULT_BACK = "BACK"
W, H = 1280, 720
BTN_HOLD = 0.7
BACKEND_API_URL = os.getenv("GESTUREPRO_API_URL", "http://127.0.0.1:8000/api/v1")
SYNC_POLL_INTERVAL = 2.5
SYNC_REQUEST_TIMEOUT = 5
SYNC_DOWNLOAD_TIMEOUT = (5, 90)
SYNC_TEMP_FILE = Path(__file__).resolve().parent.parent / "temp" / "current_sync.pdf"


def _open_file_dialog_native() -> str | None:
    """
    Открывает диалог выбора файла используя tkinter (согласно union.md).
    Запускается в отдельном процессе, чтобы не конфликтовать с циклом OpenCV и macOS.
    """
    script = """
import sys
try:
    import tkinter as tk
    from tkinter import filedialog
    import platform
    import os

    root = tk.Tk()
    root.withdraw()
    
    if platform.system() == "Darwin":
        os.system("/usr/bin/osascript -e 'tell app \\"Finder\\" to set frontmost of process \\"Python\\" to true'")
        
    path = filedialog.askopenfilename(
        title="Выберите PDF-презентацию",
        filetypes=[("PDF files", "*.pdf"), ("All files", "*.*")]
    )
    root.update()
    root.destroy()
    if path:
        print(path)
except Exception:
    pass
"""
    try:
        result = subprocess.run(
            [sys.executable, "-c", script], capture_output=True, text=True, timeout=60
        )
        path = result.stdout.strip()
        return path if path else None
    except Exception:
        return None


class LoadScreen:
    # Режимы экрана
    MODE_BUTTONS = "buttons"  # обычный выбор кнопками
    MODE_TYPING = "typing"  # ввод пути вручную (фоллбэк)
    MODE_LOADING = "loading"  # фоновая загрузка / диалог

    def __init__(self):
        self._build_layout()
        self._t0 = time.time()
        self._status = ""
        self._sync_status = "Создаю PIN для мобильного подключения..."
        self._mode = self.MODE_BUTTONS
        self._typed = ""  # буфер ввода пути

        # ── Состояние фонового потока ──────────────────────────────────────────
        self._lock = threading.Lock()
        self._thread = None  # текущий фоновый поток
        self._cancel_evt = threading.Event()  # сигнал отмены
        self._thread_result = None  # list[np.ndarray] when done
        self._thread_error = None  # str when error
        self._thread_done = False  # поток завершился
        self._thread_source = None  # local | remote

        # ── Состояние backend sync ────────────────────────────────────────────
        self._sync_thread = None
        self._sync_stop_evt = threading.Event()
        self._session_pin = None
        self._session_display = "••• •••"
        self._last_remote_presentation_id = None

    # ── Главный цикл ──────────────────────────────────────────────────────────

    def run(self, cap, detector: GestureDetector):
        """
        Возвращает список слайдов (np.ndarray[]) или RESULT_BACK.
        """
        self._ensure_sync_thread()

        while True:
            ret, frame = cap.read()
            if not ret:
                return self._finish(RESULT_BACK)
            frame = cv2.flip(frame, 1)

            result = detector.process(frame)
            pinch = result["pinch_pos"]

            done, slides, error = self._poll_thread()
            if done:
                self._mode = self.MODE_BUTTONS
                if slides:
                    return self._finish(slides)
                if error:
                    self._status = error

            # ── Режим ввода пути ──────────────────────────────────────────────
            if self._mode == self.MODE_TYPING:
                canvas = self._render_typing(result)
                cv2.imshow("Gesture Suite", canvas)
                key = cv2.waitKey(1) & 0xFF
                if key == 27:  # ESC — отмена
                    self._mode = self.MODE_BUTTONS
                    self._typed = ""
                    self._status = ""
                elif key == 13:  # Enter — подтвердить
                    path = self._typed.strip()
                    if os.path.isfile(path) and path.lower().endswith(".pdf"):
                        self._start_load_thread(path)
                    else:
                        self._status = "Файл не найден или не PDF"
                elif key == 8:  # Backspace
                    self._typed = self._typed[:-1]
                elif 32 <= key <= 126:  # Печатаемые символы
                    self._typed += chr(key)
                continue

            # ── Режим ожидания фонового потока ───────────────────────────────
            if self._mode == self.MODE_LOADING:
                canvas = self._render_loading(result)
                cv2.imshow("Gesture Suite", canvas)
                key = cv2.waitKey(1) & 0xFF
                if key in (27, ord("b")):
                    if self._thread_source == "local":
                        self._cancel_evt.set()
                        if self._thread:
                            self._thread.join(timeout=0.5)
                    self._mode = self.MODE_BUTTONS
                    self._status = (
                        "Отменено" if self._thread_source == "local" else "Синхронизация продолжается..."
                    )
                continue

            # ── Обычный режим ─────────────────────────────────────────────────
            action = self._update(pinch)
            if action is not None:
                return self._finish(action)

            canvas = self._render(result)
            cv2.imshow("Gesture Suite", canvas)

            key = cv2.waitKey(1) & 0xFF
            if key in (27, ord("b")):
                return self._finish(RESULT_BACK)
            elif key == ord("o"):
                self._start_dialog_thread()
            elif key == ord("d"):
                self._start_demo_thread()
            elif key == ord("t"):  # T = ввести путь вручную
                self._mode = self.MODE_TYPING
                self._typed = ""
                self._status = ""

    # ── Layout ────────────────────────────────────────────────────────────────

    def _build_layout(self):
        cx = W // 2

        bw, bh = 460, 90
        bx = cx - bw // 2
        by = H // 2 - bh - 30
        self._btn_open = PinchButton(bx, by, bw, bh, BTN_HOLD)
        self._open_rect = (bx, by, bw, bh)

        dw, dh = 220, 60
        dx = cx - dw // 2
        dy = by + bh + 20
        self._btn_demo = PinchButton(dx, dy, dw, dh, BTN_HOLD)
        self._demo_rect = (dx, dy, dw, dh)

        nw, nh = 200, 56
        nx = cx - nw // 2
        ny = H - 108
        self._btn_back = PinchButton(nx, ny, nw, nh, BTN_HOLD)
        self._back_rect = (nx, ny, nw, nh)

    def _update(self, pinch):
        if self._mode == self.MODE_LOADING:
            return None
        if self._btn_open.update(pinch):
            self._start_dialog_thread()
            return None
        if self._btn_demo.update(pinch):
            self._start_demo_thread()
            return None
        if self._btn_back.update(pinch):
            return RESULT_BACK
        return None

    # ── Фоновые потоки ────────────────────────────────────────────────────────

    def _start_dialog_thread(self):
        """Запускает диалог + загрузку PDF в фоне."""
        self._reset_thread_state()
        self._thread_source = "local"
        self._status = "Открываю диалог..."
        self._mode = self.MODE_LOADING

        def worker():
            try:
                path = _open_file_dialog_native()
                if self._cancel_evt.is_set():
                    return
                if not path:
                    with self._lock:
                        self._thread_error = "Файл не выбран. T → ввести путь вручную"
                        self._thread_done = True
                    return
                with self._lock:
                    self._status = "Загружаю PDF..."
                slides = load_pdf(path)
                if self._cancel_evt.is_set():
                    return
                with self._lock:
                    if slides:
                        self._thread_result = slides
                    else:
                        self._thread_error = "Ошибка загрузки PDF"
                    self._thread_done = True
            except Exception as e:
                with self._lock:
                    self._thread_error = f"Ошибка: {e}"
                    self._thread_done = True

        self._thread = threading.Thread(target=worker, daemon=True)
        self._thread.start()

    def _start_load_thread(self, path: str):
        """Загружает PDF из готового пути."""
        self._reset_thread_state()
        self._thread_source = "local"
        self._status = "Загружаю PDF..."
        self._mode = self.MODE_LOADING

        def worker():
            try:
                slides = load_pdf(path)
                if self._cancel_evt.is_set():
                    return
                with self._lock:
                    if slides:
                        self._thread_result = slides
                    else:
                        self._thread_error = "Ошибка загрузки PDF"
                    self._thread_done = True
            except Exception as e:
                with self._lock:
                    self._thread_error = f"Ошибка: {e}"
                    self._thread_done = True

        self._thread = threading.Thread(target=worker, daemon=True)
        self._thread.start()

    def _start_demo_thread(self):
        """Загрузка разделенных слайдов из папки slides/ или создание демо-слайдов."""
        self._reset_thread_state()
        self._thread_source = "local"
        self._status = "Ищу папку slides/..."
        self._mode = self.MODE_LOADING

        def worker():
            try:
                # Логика разделения слайдов по файлам в папке
                if os.path.isdir("slides"):
                    slides = load_folder("slides")
                else:
                    slides = []

                if not slides:
                    with self._lock:
                        self._status = "Создаю демо-слайды..."
                    slides = create_demo_slides()

                with self._lock:
                    self._thread_result = slides
                    self._thread_done = True
            except Exception as e:
                with self._lock:
                    self._thread_error = f"Ошибка: {e}"
                    self._thread_done = True

        self._thread = threading.Thread(target=worker, daemon=True)
        self._thread.start()

    def _reset_thread_state(self):
        self._cancel_evt = threading.Event()
        self._thread_result = None
        self._thread_error = None
        self._thread_done = False
        self._thread_source = None

    def _poll_thread(self):
        """
        Возвращает (done, slides, error).
        Только читает разделяемое состояние через локер.
        """
        with self._lock:
            if not self._thread_done:
                return False, None, None
            slides = self._thread_result
            error = self._thread_error
            self._thread_result = None
            self._thread_error = None
            self._thread_done = False
            self._thread_source = None
        return True, slides, error

    def _ensure_sync_thread(self):
        if self._sync_thread and self._sync_thread.is_alive():
            return
        self._sync_stop_evt.clear()
        self._sync_thread = threading.Thread(target=self._sync_loop, daemon=True)
        self._sync_thread.start()

    def _sync_loop(self):
        client = requests.Session()

        while not self._sync_stop_evt.is_set():
            try:
                if not self._session_pin:
                    self._create_remote_session(client)
                elif self._mode == self.MODE_BUTTONS and not self._thread_done:
                    response = client.get(
                        f"{BACKEND_API_URL}/presentations/latest/",
                        params={"pin": self._session_pin},
                        timeout=SYNC_REQUEST_TIMEOUT,
                    )
                    if response.status_code == 200:
                        payload = response.json()
                        presentation_id = payload.get("id")
                        if presentation_id and presentation_id != self._last_remote_presentation_id:
                            self._last_remote_presentation_id = presentation_id
                            self._sync_remote_presentation(client, payload)
                    elif response.status_code == 204:
                        self._set_sync_status("PIN активен. Ждём файл с телефона.")
                    elif response.status_code == 404:
                        with self._lock:
                            self._session_pin = None
                            self._session_display = "••• •••"
                        self._set_sync_status("Сессия истекла. Создаю новый PIN...")
            except requests.RequestException:
                self._set_sync_status("Backend недоступен. Повторяю подключение...")

            self._sync_stop_evt.wait(SYNC_POLL_INTERVAL)

    def _create_remote_session(self, client: requests.Session):
        response = client.post(
            f"{BACKEND_API_URL}/session/create/",
            timeout=SYNC_REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
        pin_code = str(payload.get("pin_code", "")).strip()
        if not pin_code:
            raise requests.RequestException("Backend не вернул PIN")

        with self._lock:
            self._session_pin = pin_code
            self._session_display = self._format_pin(pin_code)
        self._set_sync_status("Введите этот PIN в мобильном приложении.")

    def _sync_remote_presentation(self, client: requests.Session, payload: dict):
        if not self._session_pin:
            return

        presentation_id = payload.get("id")
        download_url = payload.get("download_url") or (
            f"{BACKEND_API_URL}/presentations/{presentation_id}/download/"
        )
        title = payload.get("title") or "presentation.pdf"

        with self._lock:
            self._reset_thread_state()
            self._thread_source = "remote"
            self._mode = self.MODE_LOADING
            self._status = "Скачивание презентации с сервера..."
            self._sync_status = f"Получен файл: {title}"

        try:
            self._notify_desktop_event(client, presentation_id, "downloading")
            SYNC_TEMP_FILE.parent.mkdir(parents=True, exist_ok=True)

            with client.get(
                download_url,
                params={"pin": self._session_pin},
                timeout=SYNC_DOWNLOAD_TIMEOUT,
                stream=True,
            ) as response:
                response.raise_for_status()
                with SYNC_TEMP_FILE.open("wb") as file_handle:
                    for chunk in response.iter_content(chunk_size=1024 * 64):
                        if self._sync_stop_evt.is_set():
                            return
                        if chunk:
                            file_handle.write(chunk)

            with self._lock:
                self._status = "Открываю презентацию..."

            slides = load_pdf(str(SYNC_TEMP_FILE))
            if not slides:
                raise RuntimeError("Desktop не смог открыть PDF")

            self._notify_desktop_event(client, presentation_id, "presenting")
            with self._lock:
                self._thread_result = slides
                self._thread_done = True
                self._sync_status = "Презентация загружена на экран."
        except Exception as exc:
            self._notify_desktop_event(client, presentation_id, "error", str(exc))
            with self._lock:
                self._thread_error = f"Ошибка синхронизации: {exc}"
                self._thread_done = True
                self._sync_status = "Не удалось синхронизировать презентацию."

    def _notify_desktop_event(
        self,
        client: requests.Session,
        presentation_id: str,
        event_name: str,
        message: str = "",
    ):
        if not self._session_pin:
            return
        try:
            client.post(
                f"{BACKEND_API_URL}/presentations/{presentation_id}/desktop-event/",
                json={
                    "pin_code": self._session_pin,
                    "event": event_name,
                    "message": message,
                },
                timeout=SYNC_REQUEST_TIMEOUT,
            )
        except requests.RequestException:
            pass

    def _set_sync_status(self, message: str):
        with self._lock:
            self._sync_status = message

    def _finish(self, result):
        self._sync_stop_evt.set()
        if self._thread and self._thread.is_alive():
            self._cancel_evt.set()
            self._thread.join(timeout=0.3)
        if self._sync_thread and self._sync_thread.is_alive():
            self._sync_thread.join(timeout=0.3)
        return result

    # ── Рендеринг — режим загрузки ───────────────────────────────────────────

    def _render_loading(self, det_result: dict) -> np.ndarray:
        canvas = np.zeros((H, W, 3), dtype=np.uint8)
        t = time.time() - self._t0
        self._draw_bg(canvas)

        # Заголовок
        put_text(
            canvas,
            Lang.t("load_title"),
            (W // 2, 100),
            font_size=46,
            color=C_ACCENT,
            bold=True,
            anchor="ct",
        )
        cv2.line(canvas, (W // 2 - 200, 142), (W // 2 + 200, 142), C_BORDER, 1)
        self._draw_session_panel(canvas)
        self._draw_remote_status_card(canvas)

        # Анимированный спиннер
        cx, cy = W // 2, H // 2 - 20
        draw_rect_rounded(
            canvas,
            (W // 2 - 220, H // 2 - 120),
            (W // 2 + 220, H // 2 + 140),
            (30, 36, 52),
            radius=22,
        )
        draw_rect_rounded(
            canvas,
            (W // 2 - 220, H // 2 - 120),
            (W // 2 + 220, H // 2 + 140),
            C_BORDER,
            radius=22,
            thickness=1,
        )
        r_outer = 46
        segments = 12
        for i in range(segments):
            angle_start = math.radians(i * 360 / segments + t * 220)
            angle_end = math.radians(i * 360 / segments + t * 220 + 22)
            alpha = (i + 1) / segments
            color = tuple(int(c * alpha) for c in C_ACCENT)
            pts = []
            for a in np.linspace(angle_start, angle_end, 6):
                pts.append(
                    (int(cx + r_outer * math.cos(a)), int(cy + r_outer * math.sin(a)))
                )
            for j in range(len(pts) - 1):
                cv2.line(canvas, pts[j], pts[j + 1], color, 3, cv2.LINE_AA)

        # Текущий статус
        with self._lock:
            status_text = self._status
        if not status_text:
            status_text = "Загружаю..."
        put_text(
            canvas,
            status_text,
            (W // 2, cy + 80),
            font_size=22,
            color=C_TEXT,
            anchor="ct",
        )

        put_text(
            canvas,
            "ESC / B → отмена",
            (W // 2, H - 50),
            font_size=16,
            color=C_TEXT_DIM,
            anchor="ct",
        )

        self._draw_pip(canvas, det_result["annotated"])
        return canvas

    # ── Рендеринг — обычный режим ────────────────────────────────────────────

    def _render(self, det_result: dict) -> np.ndarray:
        canvas = np.zeros((H, W, 3), dtype=np.uint8)
        t = time.time() - self._t0
        pinch = det_result["pinch_pos"]

        self._draw_bg(canvas)

        put_text(
            canvas,
            Lang.t("load_title"),
            (W // 2, 100),
            font_size=46,
            color=C_ACCENT,
            bold=True,
            anchor="ct",
        )
        cv2.line(canvas, (W // 2 - 200, 142), (W // 2 + 200, 142), C_BORDER, 1)
        self._draw_session_panel(canvas)
        self._draw_remote_status_card(canvas)

        self._draw_file_icon(canvas, W // 2, 220, t)

        self._draw_btn(
            canvas,
            self._open_rect,
            Lang.t("load_hint"),
            C_ACCENT,
            self._btn_open,
            pinch,
            font_size=24,
        )
        self._draw_btn(
            canvas,
            self._demo_rect,
            "Load Folder / Demo",
            C_ACCENT2,
            self._btn_demo,
            pinch,
            font_size=20,
        )

        if self._status:
            is_err = any(w in self._status.lower() for w in ("ошибка", "не найден"))
            col = C_DANGER if is_err else C_TEXT_DIM
            draw_rect_rounded(
                canvas,
                (W // 2 - 290, H // 2 + 96),
                (W // 2 + 290, H // 2 + 160),
                (29, 34, 48),
                radius=18,
            )
            put_text(
                canvas,
                self._status,
                (W // 2, H // 2 + 130),
                font_size=19,
                color=col,
                anchor="ct",
            )

        put_text(
            canvas,
            "O → PDF    D → Папка/Демо    T → путь вручную    B → Назад",
            (W // 2, H - 62),
            font_size=16,
            color=C_TEXT_DIM,
            anchor="ct",
        )
        put_text(
            canvas,
            Lang.t("gesture_hint"),
            (W // 2, H - 38),
            font_size=16,
            color=C_TEXT_DIM,
            anchor="ct",
        )

        self._draw_btn(
            canvas,
            self._back_rect,
            Lang.t("load_back"),
            C_PANEL,
            self._btn_back,
            pinch,
            font_size=20,
            text_col=C_TEXT_DIM,
        )

        self._draw_pip(canvas, det_result["annotated"])

        if pinch:
            draw_cursor(canvas, pinch, is_pinching=True)
            for btn_obj in [self._btn_open, self._btn_demo, self._btn_back]:
                if btn_obj.is_hovered(pinch):
                    draw_pinch_progress(canvas, pinch, btn_obj.progress())
        elif det_result["index_pos"]:
            draw_cursor(canvas, det_result["index_pos"])

        g = det_result["gesture"]
        if g != GESTURE_NONE:
            draw_gesture_badge(canvas, g, 20, H - 16)

        return canvas

    # ── Рендеринг — режим ввода пути ─────────────────────────────────────────

    def _render_typing(self, det_result: dict) -> np.ndarray:
        canvas = np.zeros((H, W, 3), dtype=np.uint8)
        self._draw_bg(canvas)

        put_text(
            canvas,
            "Введите путь к PDF файлу",
            (W // 2, 160),
            font_size=34,
            color=C_ACCENT,
            bold=True,
            anchor="ct",
        )
        self._draw_session_panel(canvas)
        self._draw_remote_status_card(canvas)

        # Поле ввода
        fx, fy, fw, fh = W // 2 - 420, H // 2 - 36, 840, 70
        draw_rect_rounded(canvas, (fx, fy), (fx + fw, fy + fh), C_CARD, radius=12)
        draw_rect_rounded(
            canvas, (fx, fy), (fx + fw, fy + fh), C_ACCENT, radius=12, thickness=2
        )

        display_text = self._typed[-62:] if len(self._typed) > 62 else self._typed
        # Мигающий курсор
        cursor = "|" if int(time.time() * 2) % 2 == 0 else " "
        put_text(
            canvas,
            display_text + cursor,
            (fx + 18, fy + fh // 2),
            font_size=22,
            color=C_TEXT,
            anchor="lc",
        )

        if self._status:
            is_err = (
                "не найден" in self._status.lower() or "не pdf" in self._status.lower()
            )
            put_text(
                canvas,
                self._status,
                (W // 2, H // 2 + 60),
                font_size=20,
                color=C_DANGER if is_err else C_TEXT_DIM,
                anchor="ct",
            )

        put_text(
            canvas,
            "Enter → подтвердить    ESC → отмена",
            (W // 2, H - 60),
            font_size=18,
            color=C_TEXT_DIM,
            anchor="ct",
        )

        self._draw_pip(canvas, det_result["annotated"])
        return canvas

    # ── Вспомогательные методы ────────────────────────────────────────────────

    def _draw_bg(self, canvas):
        for y in range(H):
            r = y / H
            canvas[y, :] = (int(22 + r * 8), int(28 + r * 10), int(40 + r * 14))
        glow = canvas.copy()
        cv2.circle(glow, (190, 140), 180, (60, 85, 135), -1)
        cv2.circle(glow, (W - 180, 180), 170, (35, 72, 125), -1)
        cv2.circle(glow, (W // 2, H - 120), 220, (48, 58, 92), -1)
        cv2.addWeighted(glow, 0.18, canvas, 0.82, 0, canvas)
        for x in range(0, W, 80):
            cv2.line(canvas, (x, 0), (x, H), (40, 45, 62), 1)
        for y in range(0, H, 80):
            cv2.line(canvas, (0, y), (W, y), (40, 45, 62), 1)

    def _draw_pip(self, canvas, cam_frame):
        pw, ph = 200, 112
        pip = cv2.resize(cam_frame, (pw, ph))
        x0, y0 = W - pw - 16, H - ph - 16
        draw_rect_rounded(
            canvas,
            (x0 - 10, y0 - 10),
            (x0 + pw + 10, y0 + ph + 10),
            (24, 30, 43),
            radius=14,
        )
        draw_rect_rounded(
            canvas, (x0 - 2, y0 - 2), (x0 + pw + 2, y0 + ph + 2), C_BORDER, radius=8
        )
        canvas[y0 : y0 + ph, x0 : x0 + pw] = pip

    def _draw_session_panel(self, canvas):
        panel_w, panel_h = 338, 114
        x0, y0 = W - panel_w - 24, 22
        draw_rect_rounded(
            canvas,
            (x0, y0),
            (x0 + panel_w, y0 + panel_h),
            (27, 33, 47),
            radius=18,
        )
        draw_rect_rounded(
            canvas,
            (x0, y0),
            (x0 + panel_w, y0 + panel_h),
            C_BORDER,
            radius=18,
            thickness=1,
        )

        with self._lock:
            pin_display = self._session_display
            sync_status = self._sync_status

        put_text(
            canvas,
            "REMOTE LINK",
            (x0 + 18, y0 + 16),
            font_size=13,
            color=C_TEXT_DIM,
            anchor="lt",
        )
        put_text(
            canvas,
            "MOBILE PIN",
            (x0 + 18, y0 + 40),
            font_size=15,
            color=C_ACCENT,
            anchor="lt",
        )
        put_text(
            canvas,
            pin_display,
            (x0 + 18, y0 + 66),
            font_size=30,
            color=C_SUCCESS if self._session_pin else C_TEXT,
            bold=True,
            anchor="lt",
        )
        put_text(
            canvas,
            sync_status,
            (x0 + 18, y0 + 92),
            font_size=15,
            color=C_TEXT_DIM,
            anchor="lt",
        )
        cv2.circle(canvas, (x0 + panel_w - 26, y0 + 26), 6, C_SUCCESS if self._session_pin else C_DANGER, -1)

    def _draw_remote_status_card(self, canvas):
        card_w, card_h = 330, 108
        x0, y0 = 24, 22
        draw_rect_rounded(
            canvas,
            (x0, y0),
            (x0 + card_w, y0 + card_h),
            (27, 33, 47),
            radius=18,
        )
        draw_rect_rounded(
            canvas,
            (x0, y0),
            (x0 + card_w, y0 + card_h),
            C_BORDER,
            radius=18,
            thickness=1,
        )

        with self._lock:
            status_text = self._status or "PIN активен. Ждём презентацию."
            mode = self._mode
            source = self._thread_source

        phase = "AUTO SYNC"
        accent = C_SUCCESS
        if source == "remote" or "сервера" in status_text.lower():
            phase = "REMOTE PUSH"
            accent = C_ACCENT
        elif mode == self.MODE_LOADING:
            phase = "LOCAL LOAD"
            accent = C_ACCENT2
        elif "ошибка" in status_text.lower():
            phase = "ATTENTION"
            accent = C_DANGER

        put_text(
            canvas,
            phase,
            (x0 + 18, y0 + 18),
            font_size=14,
            color=accent,
            bold=True,
            anchor="lt",
        )
        put_text(
            canvas,
            "GesturePro может принять файл с телефона автоматически.",
            (x0 + 18, y0 + 46),
            font_size=16,
            color=C_TEXT,
            anchor="lt",
        )
        put_text(
            canvas,
            status_text,
            (x0 + 18, y0 + 74),
            font_size=16,
            color=C_TEXT_DIM,
            anchor="lt",
        )
        draw_rect_rounded(
            canvas,
            (x0 + card_w - 114, y0 + 66),
            (x0 + card_w - 18, y0 + 92),
            tuple(int(c * 0.3) for c in accent),
            radius=12,
        )
        put_text(
            canvas,
            "LIVE",
            (x0 + card_w - 66, y0 + 79),
            font_size=14,
            color=C_TEXT,
            bold=True,
            anchor="cc",
        )

    def _draw_btn(
        self, canvas, rect, label, accent, btn_obj, pinch, font_size=24, text_col=None
    ):
        x, y, bw, bh = rect
        hov = btn_obj.is_hovered(pinch)
        pct = btn_obj.progress()
        bg = tuple(int(c * 0.3) for c in accent) if hov else C_CARD
        draw_rect_rounded(canvas, (x, y), (x + bw, y + bh), bg, radius=14)
        draw_rect_rounded(
            canvas,
            (x, y),
            (x + bw, y + bh),
            accent if hov else C_BORDER,
            radius=14,
            thickness=2 if hov else 1,
        )
        if hov and pct > 0:
            fw = int(bw * pct)
            ov = canvas.copy()
            draw_rect_rounded(
                ov,
                (x, y),
                (x + fw, y + bh),
                tuple(int(c * 0.4) for c in accent),
                radius=14,
            )
            cv2.addWeighted(ov, 0.4, canvas, 0.6, 0, canvas)
        col = text_col or (accent if hov else C_TEXT)
        put_text(
            canvas,
            label,
            (x + bw // 2, y + bh // 2),
            font_size=font_size,
            color=col,
            bold=hov,
            anchor="cc",
        )

    @staticmethod
    def _draw_file_icon(canvas, cx, cy, t):
        pulse = 0.9 + 0.1 * math.sin(t * 2)
        r = int(34 * pulse)
        color = tuple(int(c * pulse) for c in C_ACCENT)
        halo = np.zeros_like(canvas)
        cv2.circle(halo, (cx, cy), 54, tuple(int(c * 0.25) for c in color), -1)
        cv2.addWeighted(halo, 0.25, canvas, 0.75, 0, canvas)
        draw_rect_rounded(
            canvas,
            (cx - r, cy - r),
            (cx + r, cy + r),
            tuple(int(c * 0.15) for c in color),
            radius=10,
        )
        draw_rect_rounded(
            canvas, (cx - r, cy - r), (cx + r, cy + r), color, radius=10, thickness=2
        )
        put_text(
            canvas, "PDF", (cx, cy), font_size=20, color=color, bold=True, anchor="cc"
        )

    @staticmethod
    def _format_pin(pin_code: str) -> str:
        pin_code = str(pin_code).strip()
        if len(pin_code) <= 3:
            return pin_code
        return f"{pin_code[:3]} {pin_code[3:]}"
