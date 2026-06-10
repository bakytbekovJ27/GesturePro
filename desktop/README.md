# GesturePro Desktop

Новый desktop shell на `Tauri + React + Vite + TypeScript`.

Это первый GUI-only этап миграции: здесь уже перенесены основные desktop-экраны из Python/OpenCV в отдельный native shell, но жесты, камера и логика из `core/` пока подключаются только через mock bridge.

## Что уже есть

- отдельный `desktop/` mini-project;
- Tauri shell c `src-tauri/`;
- экраны `Menu`, `Settings`, `Load`, `Presentation`;
- typed `DesktopCoreBridge` и `MockDesktopCoreBridge`;
- локализация `ru/en`;
- mock PIN/session, mock file load, mock remote presentation, mock gesture state;
- viewer с HUD и клавиатурной навигацией.

## Локальный запуск

```bash
cd desktop
npm install
npm run tauri dev
```

Если нужен только frontend-слой:

```bash
cd desktop
npm install
npm run dev
```

## Горячие клавиши

- `1` — перейти из меню в экран загрузки
- `2` — открыть настройки
- `O` — выбрать файл
- `D` — загрузить demo deck
- `B` / `Esc` — назад
- `←` / `→` или `A` / `D` — листать слайды
- `M` — вернуться в меню из презентации
- `Q` — закрыть окно

## Интеграция с Сайдкаром и Настройки

Приложение взаимодействует с Python-сайдкаром через RPC-команды.

### Настройка задержки жестов (Gesture Cooldown)
В экране настроек (`SettingsScreen`) реализован слайдер, позволяющий регулировать задержку срабатывания жестов перелистывания от `0.5s` до `2.0s`. 
- Изменение задержки отправляет команду `presentation.set_delay` с новым значением в сайдкар `desktop/sidecar/runtime.py`.
- Это динамически управляет кулдауном `slide_cooldown` в состоянии распознавания жестов, исключая нежелательные двойные свайпы.

## Следующие шаги разработки
- Полноценная интеграция детекции жестов с веб-камеры через OpenCV в сайдкаре.
- Оптимизация производительности подготовки слайдов PDF/изображений.

