# -*- coding: utf-8 -*-
"""
main.py — Точка входа Gesture Suite
Запуск:  python main.py
"""

import sys
import os
import cv2

# Убеждаемся, что корень проекта в пути импорта
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.gesture import GestureDetector
from core.localization import Lang
from screens.menu_screen import MenuScreen, RESULT_START, RESULT_SETTINGS, RESULT_EXIT
from screens.settings_screen import SettingsScreen
from screens.load_screen import LoadScreen
from screens.presentation_screen import PresentationScreen, RESULT_MENU, RESULT_LOAD

STATE_MENU = "MENU"
STATE_SETTINGS = "SETTINGS"
STATE_LOAD = "LOAD"
STATE_PRESENTATION = "PRESENTATION"
STATE_EXIT = "EXIT"


def main():
    print("=" * 60)
    print("  GESTURE SUITE — Запуск")
    print("=" * 60)

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 30)

    ret, frame = cap.read()
    if not ret:
        print("Камера недоступна. Подключите веб-камеру и перезапустите.")
        sys.exit(1)

    print("Камера инициализирована")

    detector = GestureDetector()
    print("GestureDetector готов")

    cv2.namedWindow("Gesture Suite", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Gesture Suite", 1280, 810)

    state = STATE_MENU
    slides = None

    print("Открываю главное меню...")

    try:
        while state != STATE_EXIT:
            if state == STATE_MENU:
                result = MenuScreen().run(cap, detector)
                if result == RESULT_START:
                    state = STATE_LOAD
                elif result == RESULT_SETTINGS:
                    state = STATE_SETTINGS
                else:
                    state = STATE_EXIT

            elif state == STATE_SETTINGS:
                SettingsScreen().run(cap, detector)
                state = STATE_MENU

            elif state == STATE_LOAD:
                result = LoadScreen().run(cap, detector)
                if result == "BACK":
                    state = STATE_MENU
                elif isinstance(result, list) and result:
                    slides = result
                    state = STATE_PRESENTATION
                else:
                    state = STATE_MENU

            elif state == STATE_PRESENTATION:
                if not slides:
                    state = STATE_LOAD
                    continue
                result = PresentationScreen(slides).run(cap, detector)
                if result == RESULT_MENU:
                    state = STATE_MENU
                elif result == RESULT_LOAD:
                    state = STATE_LOAD
                else:
                    state = STATE_EXIT

    finally:
        print("\nЗавершение работы...")
        detector.close()
        cap.release()
        cv2.destroyAllWindows()
        print("Готово.")


if __name__ == "__main__":
    main()
