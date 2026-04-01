#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
desktop/sidecar/runtime.py
Python sidecar for the Tauri desktop shell.

Responsibilities:
- backend pairing / PIN session polling
- local PDF loading and rasterization into temporary PNG assets
- demo deck generation
- camera / gesture runtime
- JSONL IPC over stdin/stdout
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import threading
import time
import uuid
from pathlib import Path
from typing import Any

import cv2
import requests

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.slide_loader import create_demo_slides, load_folder, load_pdf  # noqa: E402

BACKEND_API_URL = os.getenv("GESTUREPRO_API_URL", "http://127.0.0.1:8000/api/v1")
SYNC_POLL_INTERVAL = 2.5
SYNC_REQUEST_TIMEOUT = 5
SYNC_DOWNLOAD_TIMEOUT = (5, 90)
ASSETS_ROOT = Path(tempfile.gettempdir()) / "gesturepro-desktop-assets"
REMOTE_TEMP_ROOT = Path(tempfile.gettempdir()) / "gesturepro-desktop-sync"
FIST_HOLD = 1.0
SWIPE_THRESH = 0.14
SWIPE_MAX_TIME = 1.2
SLIDE_COOLDOWN = 0.8
CAMERA_WIDTH = 1280
CAMERA_HEIGHT = 720
CAMERA_FPS = 30
GESTURE_NONE = "NONE"
GESTURE_FIST = "FIST"
GESTURE_POINT = "POINT"
GESTURE_THUMB = "THUMB"
GESTURE_PALM = "PALM"
GESTURE_PEACE = "PEACE"
SESSION_CREATING = "creating"
SESSION_READY = "ready"
SESSION_FAILED = "failed"
SESSION_STOPPED = "stopped"


class EventWriter:
    def __init__(self) -> None:
        self._lock = threading.Lock()

    def emit(self, payload: dict[str, Any]) -> None:
        line = json.dumps(payload, ensure_ascii=False)
        with self._lock:
            sys.stdout.write(line + "\n")
            sys.stdout.flush()


class GestureRuntimeState:
    def __init__(self) -> None:
        self.system_active = False
        self.fist_started_at: float | None = None
        self.fist_fired = False
        self.swipe_origin_x: float | None = None
        self.swipe_started_at: float | None = None
        self.last_slide_at = 0.0
        self.last_event: tuple[str, str, bool, str] | None = None

    def reset_runtime(self) -> None:
        self.fist_started_at = None
        self.fist_fired = False
        self.swipe_origin_x = None
        self.swipe_started_at = None
        self.last_event = None


class SidecarRuntime:
    def __init__(self) -> None:
        self._writer = EventWriter()
        self._running = True
        self._lock = threading.Lock()

        self._session_pin: str | None = None
        self._session_display = "••• •••"
        self._last_remote_presentation_id: str | None = None
        self._sync_thread: threading.Thread | None = None
        self._sync_stop_evt = threading.Event()
        self._remote_waiting_announced = False
        self._session_failure_announced = False

        self._gesture_thread: threading.Thread | None = None
        self._gesture_stop_evt = threading.Event()
        self._gesture_state = GestureRuntimeState()

        self._presentation_counter = 0
        self._current_assets_dir: Path | None = None
        self._current_source = "demo"
        self._presentation_active = False

    def run(self) -> None:
        self.emit_runtime_status("ready", "Python sidecar booted. Waiting for desktop commands.")

        for raw_line in sys.stdin:
            line = raw_line.strip()
            if not line:
                continue

            try:
                payload = json.loads(line)
            except json.JSONDecodeError as exc:
                self.emit_core_error(f"Invalid IPC payload: {exc}")
                continue

            command = str(payload.get("command", "")).strip()
            args = payload.get("args") or {}

            try:
                if command == "session.start":
                    self.start_session()
                elif command == "session.stop":
                    self.stop_session()
                elif command == "presentation.open_file":
                    self.open_presentation_file(str(args.get("path", "")).strip())
                elif command == "presentation.load_demo":
                    self.load_demo_presentation()
                elif command == "presentation.enter":
                    self.enter_presentation()
                elif command == "presentation.leave":
                    self.leave_presentation()
                elif command == "app.shutdown":
                    self.shutdown()
                    break
                else:
                    self.emit_core_error(f"Unknown sidecar command: {command}")
            except Exception as exc:  # pragma: no cover - defensive runtime guard
                self.emit_core_error(f"Sidecar command failed: {exc}")

        self.shutdown()

    def start_session(self) -> None:
        self.emit_session_status(
            status=SESSION_CREATING,
            message="Creating a desktop pairing session...",
            pin_code=None,
            display_name=self._session_display,
        )

        if self._sync_thread and self._sync_thread.is_alive():
            return

        self._sync_stop_evt.clear()
        self._sync_thread = threading.Thread(target=self._sync_loop, daemon=True)
        self._sync_thread.start()
        self.emit_runtime_status("ready", f"Backend sync loop started for {BACKEND_API_URL}.")

    def stop_session(self) -> None:
        self._sync_stop_evt.set()
        if self._sync_thread and self._sync_thread.is_alive():
            self._sync_thread.join(timeout=0.5)

        with self._lock:
            self._session_pin = None
            self._session_display = "••• •••"
            self._last_remote_presentation_id = None
            self._remote_waiting_announced = False
            self._session_failure_announced = False

        self.emit_session_status(
            status=SESSION_STOPPED,
            message="Desktop session stopped.",
            pin_code=None,
            display_name="••• •••",
        )

    def open_presentation_file(self, file_path: str) -> None:
        if not file_path:
            self.emit_presentation_error("No file path received from the desktop shell.")
            return

        suffix = Path(file_path).suffix.lower()
        if suffix in {".ppt", ".pptx"}:
            self.emit_presentation_error("Local PPT/PPTX import is not supported yet. Please use PDF for now.")
            return
        if suffix != ".pdf":
            self.emit_presentation_error("Only local PDF files are supported in this milestone.")
            return

        file_name = Path(file_path).name
        self.emit(
            {
                "type": "presentation_status",
                "status": "loading",
                "message": f"Preparing {file_name}...",
                "fileName": file_name,
                "source": "file",
            }
        )

        slides = load_pdf(file_path)
        if not slides:
            self.emit_presentation_error(f"Failed to open {file_name}.")
            return

        self._finalize_loaded_slides(
            slides=slides,
            file_name=file_name,
            source="file",
            ready_message=f"{file_name} is ready. Opening presentation mode.",
        )

    def load_demo_presentation(self) -> None:
        self.emit(
            {
                "type": "presentation_status",
                "status": "loading",
                "message": "Preparing the demo presentation...",
                "fileName": "Demo Deck",
                "source": "demo",
            }
        )

        slides_dir = PROJECT_ROOT / "slides"
        slides = load_folder(str(slides_dir)) if slides_dir.is_dir() else []
        if not slides:
            slides = create_demo_slides()

        self._finalize_loaded_slides(
            slides=slides,
            file_name="Demo Deck",
            source="demo",
            ready_message="Demo deck is ready. Opening presentation mode.",
        )

    def enter_presentation(self) -> None:
        self._presentation_active = True
        self.start_gesture_runtime()

    def leave_presentation(self) -> None:
        self._presentation_active = False
        self.stop_gesture_runtime()

    def shutdown(self) -> None:
        if not self._running:
            return

        self._running = False
        self.leave_presentation()
        self.stop_session()
        self.emit_runtime_status("stopped", "Python sidecar stopped.")

    def start_gesture_runtime(self) -> None:
        if self._gesture_thread and self._gesture_thread.is_alive():
            return

        self._gesture_stop_evt.clear()
        self._gesture_thread = threading.Thread(target=self._gesture_loop, daemon=True)
        self._gesture_thread.start()

    def stop_gesture_runtime(self) -> None:
        self._gesture_stop_evt.set()
        if self._gesture_thread and self._gesture_thread.is_alive():
            self._gesture_thread.join(timeout=0.8)
        self._gesture_thread = None
        self._gesture_state.reset_runtime()
        self.emit_gesture_state(GESTURE_NONE, "idle", False, "Gesture core paused.")

    def _sync_loop(self) -> None:
        client = requests.Session()

        while not self._sync_stop_evt.is_set():
            try:
                if not self._session_pin:
                    self._create_remote_session(client)
                else:
                    self._poll_remote_presentation(client)
            except requests.RequestException:
                if not self._session_pin and not self._session_failure_announced:
                    self.emit_session_status(
                        status=SESSION_FAILED,
                        message=f"Backend is unavailable at {BACKEND_API_URL}. Retrying PIN creation...",
                        pin_code=None,
                        display_name="••• •••",
                    )
                    self._session_failure_announced = True
                self.emit_runtime_status("degraded", f"Backend is unavailable at {BACKEND_API_URL}. Retrying desktop pairing...")
            except Exception as exc:  # pragma: no cover - runtime guard
                if not self._session_pin and not self._session_failure_announced:
                    self.emit_session_status(
                        status=SESSION_FAILED,
                        message=f"Desktop pairing failed before a PIN was created: {exc}",
                        pin_code=None,
                        display_name="••• •••",
                    )
                    self._session_failure_announced = True
                self.emit_runtime_status("degraded", f"Desktop sync degraded: {exc}")

            self._sync_stop_evt.wait(SYNC_POLL_INTERVAL)

    def _create_remote_session(self, client: requests.Session) -> None:
        response = client.post(f"{BACKEND_API_URL}/session/create/", timeout=SYNC_REQUEST_TIMEOUT)
        response.raise_for_status()
        payload = response.json()
        pin_code = str(payload.get("pin_code", "")).strip()
        if not pin_code:
            raise requests.RequestException("Backend did not return a PIN code.")

        with self._lock:
            self._session_pin = pin_code
            self._session_display = self._format_pin(pin_code)
            self._remote_waiting_announced = False
            self._session_failure_announced = False

        self.emit_session_status(
            status=SESSION_READY,
            message=f"PIN is active. Enter {self._session_display} in the mobile app.",
            pin_code=pin_code,
            display_name=self._session_display,
        )
        self.emit_runtime_status("ready", f"Desktop pairing session is active via {BACKEND_API_URL}.")

    def _poll_remote_presentation(self, client: requests.Session) -> None:
        response = client.get(
            f"{BACKEND_API_URL}/presentations/latest/",
            params={"pin": self._session_pin},
            timeout=SYNC_REQUEST_TIMEOUT,
        )

        if response.status_code == 200:
            payload = response.json()
            presentation_id = str(payload.get("id", "")).strip()
            if presentation_id and presentation_id != self._last_remote_presentation_id:
                self._last_remote_presentation_id = presentation_id
                self._sync_remote_presentation(client, payload)
            return

        if response.status_code == 204:
            if not self._remote_waiting_announced:
                self._remote_waiting_announced = True
                self.emit(
                    {
                        "type": "presentation_status",
                        "status": "idle",
                        "message": "PIN is active. Waiting for a presentation from the phone.",
                        "source": "remote",
                    }
                )
            return

        if response.status_code == 404:
            with self._lock:
                self._session_pin = None
                self._session_display = "••• •••"
                self._remote_waiting_announced = False
                self._session_failure_announced = False
            self.emit_session_status(
                status=SESSION_CREATING,
                message="Session expired. Creating a new PIN...",
                pin_code=None,
                display_name="••• •••",
            )
            return

        response.raise_for_status()

    def _sync_remote_presentation(self, client: requests.Session, payload: dict[str, Any]) -> None:
        presentation_id = str(payload.get("id", "")).strip()
        if not presentation_id or not self._session_pin:
            return

        title = str(payload.get("title") or "presentation.pdf")
        download_url = payload.get("download_url") or f"{BACKEND_API_URL}/presentations/{presentation_id}/download/"
        local_pdf = REMOTE_TEMP_ROOT / f"{presentation_id}.pdf"

        self.emit(
            {
                "type": "presentation_status",
                "status": "loading",
                "message": f"Downloading {title} from the backend...",
                "fileName": title,
                "source": "remote",
            }
        )

        try:
            self._notify_desktop_event(client, presentation_id, "downloading")
            REMOTE_TEMP_ROOT.mkdir(parents=True, exist_ok=True)
            with client.get(
                download_url,
                params={"pin": self._session_pin},
                timeout=SYNC_DOWNLOAD_TIMEOUT,
                stream=True,
            ) as response:
                response.raise_for_status()
                with local_pdf.open("wb") as file_handle:
                    for chunk in response.iter_content(chunk_size=1024 * 64):
                        if self._sync_stop_evt.is_set():
                            return
                        if chunk:
                            file_handle.write(chunk)

            slides = load_pdf(str(local_pdf))
            if not slides:
                raise RuntimeError("Desktop could not open the downloaded PDF.")

            self._notify_desktop_event(client, presentation_id, "presenting")
            self._finalize_loaded_slides(
                slides=slides,
                file_name=title,
                source="remote",
                ready_message=f"{title} is ready on the desktop.",
            )
            self.emit_runtime_status("ready", "Remote presentation synced to the desktop.")
        except Exception as exc:
            self._notify_desktop_event(client, presentation_id, "error", str(exc))
            self.emit_presentation_error(f"Remote sync failed: {exc}", file_name=title, source="remote")

    def _notify_desktop_event(
        self,
        client: requests.Session,
        presentation_id: str,
        event_name: str,
        message: str = "",
    ) -> None:
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
            self.emit_runtime_status("degraded", "Failed to update desktop event status in the backend.")

    def _gesture_loop(self) -> None:
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)
        cap.set(cv2.CAP_PROP_FPS, CAMERA_FPS)

        detector = None

        try:
            if not cap.isOpened():
                self.emit_runtime_status("error", "Camera is unavailable.")
                self.emit_core_error("Camera is unavailable. Connect a webcam and reopen presentation mode.")
                return

            from core.gesture import GestureDetector  # noqa: WPS433

            detector = GestureDetector()
            self.emit_runtime_status("ready", "Camera connected. Gesture core is running.")

            while not self._gesture_stop_evt.is_set():
                ret, frame = cap.read()
                if not ret:
                    self.emit_runtime_status("error", "Failed to read a frame from the camera.")
                    self.emit_core_error("Gesture runtime lost access to the camera.")
                    return

                frame = cv2.flip(frame, 1)
                result = detector.process(frame)
                self._process_gesture_result(result, detector)
                time.sleep(0.03)
        finally:
            if detector is not None:
                detector.close()
            cap.release()

    def _process_gesture_result(self, result: dict[str, Any], detector: GestureDetector) -> None:
        state = self._gesture_state
        gesture = result.get("gesture") or GESTURE_NONE
        landmarks = result.get("landmarks")

        if landmarks is None:
            state.fist_started_at = None
            state.fist_fired = False
            state.swipe_origin_x = None
            state.swipe_started_at = None
            message = "System armed. Waiting for a hand..." if state.system_active else "Hold a fist to activate gesture control."
            self.emit_gesture_state(GESTURE_NONE, "idle", state.system_active, message)
            return

        if gesture == GESTURE_FIST:
            if state.fist_started_at is None:
                state.fist_started_at = time.time()
                state.fist_fired = False
            if time.time() - state.fist_started_at >= FIST_HOLD and not state.fist_fired:
                state.system_active = not state.system_active
                state.fist_fired = True
                state.swipe_origin_x = None
                state.swipe_started_at = None
                message = "Gesture control activated." if state.system_active else "Gesture control paused."
                self.emit_gesture_state(GESTURE_FIST, "idle", state.system_active, message)
                return
        else:
            state.fist_started_at = None
            state.fist_fired = False

        if not state.system_active:
            message = "Hold a fist for one second to activate gesture control."
            self.emit_gesture_state(gesture, "idle", False, message)
            return

        if gesture == GESTURE_PEACE:
            idx_tip = landmarks.landmark[detector._mp_hands.HandLandmark.INDEX_FINGER_TIP]
            now = time.time()
            if state.swipe_origin_x is None:
                state.swipe_origin_x = idx_tip.x
                state.swipe_started_at = now
            else:
                delta = idx_tip.x - state.swipe_origin_x
                dt = now - (state.swipe_started_at or now)
                if dt < SWIPE_MAX_TIME and now - state.last_slide_at > SLIDE_COOLDOWN:
                    if delta > SWIPE_THRESH:
                        state.last_slide_at = now
                        state.swipe_origin_x = idx_tip.x
                        self.emit({"type": "presentation_command", "action": "prev_slide"})
                        self.emit_gesture_state(GESTURE_PEACE, "swipe", True, "Swipe detected. Moving to the previous slide.")
                        return
                    if delta < -SWIPE_THRESH:
                        state.last_slide_at = now
                        state.swipe_origin_x = idx_tip.x
                        self.emit({"type": "presentation_command", "action": "next_slide"})
                        self.emit_gesture_state(GESTURE_PEACE, "swipe", True, "Swipe detected. Moving to the next slide.")
                        return
                elif dt >= SWIPE_MAX_TIME:
                    state.swipe_origin_x = idx_tip.x
                    state.swipe_started_at = now

            self.emit_gesture_state(GESTURE_PEACE, "swipe", True, "Ready to swipe slides.")
            return

        state.swipe_origin_x = None
        state.swipe_started_at = None

        if gesture == GESTURE_POINT:
            self.emit_gesture_state(GESTURE_POINT, "draw", True, "Draw mode gesture detected.")
            return
        if gesture == GESTURE_THUMB:
            self.emit_gesture_state(GESTURE_THUMB, "erase", True, "Eraser gesture detected.")
            return
        if gesture == GESTURE_PALM:
            self.emit_gesture_state(GESTURE_PALM, "clear", True, "Clear gesture detected.")
            return

        self.emit_gesture_state(gesture, "idle", True, "System armed.")

    def _finalize_loaded_slides(
        self,
        *,
        slides: list[Any],
        file_name: str,
        source: str,
        ready_message: str,
    ) -> None:
        slide_payload = self._write_slide_assets(slides, file_name)
        self._current_source = source
        self.emit(
            {
                "type": "presentation_status",
                "status": "ready",
                "message": ready_message,
                "slides": slide_payload,
                "fileName": file_name,
                "source": source,
            }
        )

    def _write_slide_assets(self, slides: list[Any], title: str) -> list[dict[str, str]]:
        with self._lock:
            self._presentation_counter += 1
            presentation_id = f"{self._presentation_counter:04d}-{uuid.uuid4().hex[:8]}"
            assets_dir = ASSETS_ROOT / presentation_id

            if self._current_assets_dir and self._current_assets_dir.exists():
                shutil.rmtree(self._current_assets_dir, ignore_errors=True)

            assets_dir.mkdir(parents=True, exist_ok=True)
            self._current_assets_dir = assets_dir

        slide_payload: list[dict[str, str]] = []
        stem = Path(title).stem or "Slide"

        for index, slide in enumerate(slides, start=1):
            image_path = assets_dir / f"slide-{index:03d}.png"
            cv2.imwrite(str(image_path), slide)
            slide_payload.append(
                {
                    "id": f"slide-{index}",
                    "title": f"{stem} · {index}",
                    "imageUrl": str(image_path),
                }
            )

        return slide_payload

    def emit_gesture_state(self, gesture: str, mode: str, system_active: bool, message: str) -> None:
        event_key = (gesture, mode, system_active, message)
        if self._gesture_state.last_event == event_key:
            return
        self._gesture_state.last_event = event_key
        self.emit(
            {
                "type": "gesture_state",
                "gesture": gesture,
                "mode": mode,
                "systemActive": system_active,
                "message": message,
            }
        )

    def emit_presentation_error(
        self,
        message: str,
        *,
        file_name: str | None = None,
        source: str | None = None,
    ) -> None:
        self.emit(
            {
                "type": "presentation_status",
                "status": "error",
                "message": message,
                "fileName": file_name,
                "source": source,
            }
        )
        self.emit_core_error(message)

    def emit_core_error(self, message: str) -> None:
        self.emit({"type": "core_error", "message": message})

    def emit_runtime_status(self, status: str, message: str) -> None:
        self.emit({"type": "runtime_status", "status": status, "message": message})

    def emit_session_status(
        self,
        *,
        status: str,
        message: str,
        pin_code: str | None,
        display_name: str,
    ) -> None:
        self.emit(
            {
                "type": "session_status",
                "status": status,
                "pinCode": pin_code,
                "displayName": display_name,
                "message": message,
            }
        )

    def emit(self, payload: dict[str, Any]) -> None:
        self._writer.emit(payload)

    @staticmethod
    def _format_pin(pin_code: str) -> str:
        return pin_code[:3] + " " + pin_code[3:]


def main() -> None:
    runtime = SidecarRuntime()
    runtime.run()


if __name__ == "__main__":
    main()
