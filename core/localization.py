# -*- coding: utf-8 -*-
"""
core/localization.py
Строки интерфейса на русском и английском языках.
"""

STRINGS = {
    "ru": {
        # Главное меню
        "menu_start": "СТАРТ",
        "menu_settings": "НАСТРОЙКИ",
        "menu_exit": "ВЫХОД",
        "menu_subtitle": "Управление жестами",
        # Экран загрузки файла
        "load_title": "Загрузить презентацию",
        "load_hint": "Нажмите, чтобы выбрать PDF",
        "load_or": "или перетащите файл сюда",
        "load_back": "← Назад",
        "load_demo": "Демо-слайды",
        "loading": "Загрузка...",
        # Экран настроек
        "settings_title": "Настройки",
        "settings_language": "Язык",
        "settings_lang_ru": "Русский",
        "settings_lang_en": "English",
        "settings_back": "← Назад",
        # Презентация HUD
        "hud_active": "● АКТИВНО",
        "hud_paused": "● ПАУЗА",
        "hud_slide": "Слайд",
        "hud_of": "из",
        "hud_draw": "Рисование",
        "hud_erase": "Ластик",
        "hud_swipe": "Листание",
        "hud_clear": "Очистка",
        "hud_idle": "Ожидание",
        "hud_hint": (
            "кулак=Вкл/Выкл  указат.=Рисовать  большой=Ластик  "
            "ладонь=Очистить  2пальца=Листать  ←→=слайды  Q=выход"
        ),
        "hud_back_menu": "M → Меню",
        # Жесты меню
        "gesture_hint": "Соедините большой и указательный, чтобы нажать",
        # Диалог выхода
        "exit_confirm": "Выйти из приложения?",
    },
    "en": {
        # Main menu
        "menu_start": "START",
        "menu_settings": "SETTINGS",
        "menu_exit": "EXIT",
        "menu_subtitle": "Gesture Control",
        # File load screen
        "load_title": "Load Presentation",
        "load_hint": "Click to choose a PDF",
        "load_or": "or drag and drop here",
        "load_back": "← Back",
        "load_demo": "Demo Slides",
        "loading": "Loading...",
        # Settings screen
        "settings_title": "Settings",
        "settings_language": "Language",
        "settings_lang_ru": "Русский",
        "settings_lang_en": "English",
        "settings_back": "← Back",
        # Presentation HUD
        "hud_active": "● ACTIVE",
        "hud_paused": "● PAUSED",
        "hud_slide": "Slide",
        "hud_of": "of",
        "hud_draw": "Draw",
        "hud_erase": "Erase",
        "hud_swipe": "Swipe",
        "hud_clear": "Clearing",
        "hud_idle": "Idle",
        "hud_hint": (
            "fist=On/Off  index=Draw  thumb=Erase  "
            "palm=Clear  2fingers=Swipe  ←→=slides  Q=quit"
        ),
        "hud_back_menu": "M → Menu",
        # Menu gestures
        "gesture_hint": "Pinch thumb + index finger to press a button",
        # Exit dialog
        "exit_confirm": "Exit the application?",
    },
}


class Lang:
    """Простой менеджер локализации. Используйте Lang.t('key')."""

    _current = "ru"

    @classmethod
    def set(cls, code: str):
        if code in STRINGS:
            cls._current = code

    @classmethod
    def get(cls) -> str:
        return cls._current

    @classmethod
    def t(cls, key: str) -> str:
        return STRINGS[cls._current].get(key, key)
