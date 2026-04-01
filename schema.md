# GesturePro: схема проекта и карта для дебага

## 1. Кратко

`GesturePro` сейчас состоит не из одной, а из двух параллельных desktop-веток:

1. `legacy desktop` на Python + OpenCV:
   `main.py` + `screens/` + `core/`
2. `new desktop` на Tauri + React:
   `desktop/` + Python sidecar `desktop/sidecar/runtime.py`

Общий сервер и мобильный клиент:

- `backend/` — Django API для PIN pairing, загрузки файлов и выдачи PDF
- `frontend/` — React/Vite PWA для телефона

Это важно для дебага, потому что часть логики уже мигрировала в `desktop/`, а часть все еще живет в `core/` и `screens/`.

---

## 2. Общая схема системы

```text
                         +----------------------+
                         |   Phone / Frontend   |
                         |  React + Vite PWA    |
                         +----------+-----------+
                                    |
                                    | HTTP / JSON / multipart
                                    v
                        +-----------+------------+
                        |      backend/          |
                        | Django REST API        |
                        | SQLite + media files   |
                        +-----------+------------+
                                    |
                 poll latest PIN    | download PDF / post desktop events
                                    v
                    +---------------+----------------+
                    | desktop/sidecar/runtime.py     |
                    | Python sidecar                 |
                    | requests + OpenCV + MediaPipe  |
                    +---------------+----------------+
                                    |
                              JSONL over stdin/stdout
                                    |
                                    v
                    +---------------+----------------+
                    | desktop/src-tauri (Rust)       |
                    | Tauri shell + process manager  |
                    +---------------+----------------+
                                    |
                              Tauri events / invoke
                                    |
                                    v
                    +---------------+----------------+
                    | desktop/src (React UI)         |
                    | Menu / Load / Settings / View  |
                    +--------------------------------+


Legacy path (отдельно, без Tauri):

main.py
  -> screens/menu_screen.py
  -> screens/load_screen.py
  -> screens/settings_screen.py
  -> screens/presentation_screen.py
  -> core/gesture.py + core/slide_loader.py + core/renderer.py
```

---

## 3. Верхнеуровневая структура репозитория

```text
GesturePro/
├── backend/                 # Django API, media, settings, requirements
├── frontend/                # мобильный PWA-клиент
├── desktop/                 # новый desktop shell на Tauri + React
│   ├── src/                 # React UI
│   ├── src-tauri/           # Rust host
│   └── sidecar/runtime.py   # Python bridge/runtime
├── core/                    # общая Python логика: жесты, PDF, рендер
├── screens/                 # legacy OpenCV-экраны
├── main.py                  # legacy desktop entrypoint
├── start.txt                # краткий запуск проекта
├── README.md                # обзор проекта
└── schema.md                # этот документ
```

---

## 4. Что за что отвечает

### `backend/`

Назначение:

- создает desktop-сессии с 6-значным PIN
- отдает `access_token` мобильному клиенту
- принимает `PDF` / `PPTX`
- конвертирует `PPTX -> PDF`
- хранит историю отправок
- отдает desktop-у готовый PDF
- принимает status callbacks от desktop-а

Ключевые файлы:

- `backend/manage.py` — вход в Django
- `backend/server/settings.py` — настройки, CORS, media, SQLite, session lifetime
- `backend/server/urls.py` — корневой роутинг `/api/v1/`
- `backend/api/models.py` — `DeviceSession`, `Presentation`
- `backend/api/views.py` — REST endpoints
- `backend/api/services.py` — генерация PIN и конвертация PPTX
- `backend/api/serializers.py` — ответы API

### `frontend/`

Назначение:

- пользователь на телефоне вводит PIN
- frontend получает `access_token`
- frontend загружает файл на backend
- frontend показывает прогресс, конвертацию и статус отправки на desktop
- frontend хранит локальную историю последних файлов

Ключевые файлы:

- `frontend/src/App.tsx` — основной state machine UI
- `frontend/src/api/client.ts` — `axios` client + base URL
- `frontend/src/api/presentations.ts` — запросы к backend
- `frontend/src/lib/storage.ts` — `localStorage` для сессии и истории
- `frontend/src/components/*` — статус подключения, progress ring, история

### `desktop/`

Назначение:

- новый desktop UI
- окно приложения и native shell через Tauri
- bridge между React UI и Python runtime
- локальное открытие PDF / demo deck
- прием удаленной презентации с backend
- запуск камеры и gesture runtime

Ключевые файлы:

- `desktop/src/App.tsx` — основной desktop state machine
- `desktop/src/bridge/index.ts` — выбор `mock` или `sidecar`
- `desktop/src/bridge/mockDesktopCoreBridge.ts` — полностью фейковый runtime
- `desktop/src/bridge/tauriDesktopCoreBridge.ts` — работа через Tauri + sidecar
- `desktop/src-tauri/src/lib.rs` — запуск и управление Python sidecar
- `desktop/sidecar/runtime.py` — Python runtime для backend sync + camera + PDF

### `core/`

Назначение:

- общая Python логика, используемая legacy desktop и sidecar

Ключевые файлы:

- `core/gesture.py` — MediaPipe Hands, классификация жестов, `PinchButton`
- `core/slide_loader.py` — загрузка PDF / папки слайдов / demo deck
- `core/renderer.py` — OpenCV/Pillow drawing utils
- `core/localization.py` — строки интерфейса `ru/en`

### `screens/` + `main.py`

Назначение:

- старый desktop UI на OpenCV
- отдельный runtime, который пока не удален

Ключевые файлы:

- `main.py` — root state machine: `MENU -> SETTINGS -> LOAD -> PRESENTATION`
- `screens/menu_screen.py` — меню с pinch-нажатием
- `screens/settings_screen.py` — язык
- `screens/load_screen.py` — локальная загрузка PDF и remote sync через backend
- `screens/presentation_screen.py` — показ слайдов, рисование, ластик, свайп

---

## 5. Два desktop-режима, которые нужно не путать

### Режим A. Legacy desktop

Запуск:

```bash
python main.py
```

Поток:

```text
Camera -> GestureDetector -> OpenCV screens -> local rendering
                                     |
                                     +-> LoadScreen может сам ходить в backend
```

Особенность:

- весь UI и логика в Python
- `screens/load_screen.py` уже умеет создавать PIN и забирать файл с backend

### Режим B. New desktop

Запуск:

```bash
cd desktop
npm run tauri dev
```

Поток:

```text
React UI -> Tauri Rust -> Python sidecar -> backend/core/camera
```

Особенность:

- UI на React
- реальная backend/camera логика живет не в React, а в `desktop/sidecar/runtime.py`

---

## 6. Backend: внутренняя схема

### 6.1. Модели

```text
DeviceSession
  - pin_code: str(6), unique
  - access_token: UUID
  - created_at
  - is_active
  - expires_at (property)
  - is_expired (property)

Presentation
  - id: UUID
  - session -> DeviceSession (FK)
  - title
  - original_file
  - pdf_file
  - status
  - error_message
  - file_size
  - extension
  - uploaded_at / updated_at / last_sent_at / ready_at
```

### 6.2. Статусы презентации

```text
uploading
  -> converting
  -> ready
  -> downloading
  -> presenting

любой этап может уйти в:
  -> error
```

Смысл:

- `uploading` — файл пришел на backend
- `converting` — backend конвертирует PPTX через LibreOffice
- `ready` — PDF готов, desktop может его забрать
- `downloading` — desktop начал скачивание
- `presenting` — desktop открыл PDF
- `error` — ошибка на backend или desktop

### 6.3. REST endpoints

```text
POST /api/v1/session/create/
  desktop/sidecar или legacy LoadScreen создают PIN-сессию

POST /api/v1/session/pair/
  frontend вводит PIN и получает access_token

POST /api/v1/presentations/upload/
  frontend загружает PDF/PPTX

GET /api/v1/presentations/recent/
  frontend читает последние 5 файлов

GET /api/v1/presentations/status/<presentation_id>/
  frontend поллит текущий статус

POST /api/v1/presentations/<presentation_id>/reuse/
  frontend повторно отправляет старый файл

GET /api/v1/presentations/latest/?pin=123456
  desktop ищет последнюю готовую презентацию по PIN

GET /api/v1/presentations/<presentation_id>/download/
  desktop скачивает PDF

POST /api/v1/presentations/<presentation_id>/desktop-event/
  desktop сообщает: downloading / presenting / error
```

### 6.4. Важный технический факт

В `backend/server/settings.py` есть настройка Celery, но в текущем коде конвертация `PPTX -> PDF` делается не через Celery, а через обычный `threading.Thread` в `backend/api/services.py`.

Это значит:

- Redis/Celery сейчас не обязательны для основного потока
- если `PPTX` не конвертируется, сначала проверять `LibreOffice/soffice`, а не worker

---

## 7. Frontend: схема логики

### 7.1. Экранные состояния

```text
pairing
  -> dashboard
  -> progress
  -> dashboard
```

Расшифровка:

- `pairing` — ввод PIN
- `dashboard` — загрузка файла и история
- `progress` — upload / converting / syncing / ready / error

### 7.2. Поток работы пользователя

```text
User enters PIN
  -> POST /session/pair/
  -> save access_token in localStorage
  -> GET /presentations/recent/
  -> choose file
  -> POST /presentations/upload/
  -> poll /presentations/status/<id>/
  -> wait until status becomes presenting or error
```

### 7.3. Локальное хранилище

```text
gesturepro.session
gesturepro.history
```

### 7.4. Ключевые frontend-модули

```text
App.tsx
  pairing logic
  upload logic
  polling status
  recent history

api/client.ts
  axios instance
  Bearer auth
  LAN misconfiguration detection

api/presentations.ts
  pairSession
  fetchRecentPresentations
  uploadPresentation
  getPresentationStatus
  reusePresentation
```

---

## 8. New desktop: схема Tauri + sidecar

### 8.1. Слои

```text
desktop/src/App.tsx
  UI state machine
      |
      v
desktop/src/bridge/*.ts
  bridge abstraction
      |
      v
desktop/src-tauri/src/lib.rs
  process manager for sidecar
      |
      v
desktop/sidecar/runtime.py
  real Python runtime
```

### 8.2. Как выбирается bridge

```text
if VITE_DESKTOP_MOCK=1 or Tauri internals not found:
    use MockDesktopCoreBridge
else:
    use TauriDesktopCoreBridge
```

### 8.3. Что делает `desktop/src/App.tsx`

Основные состояния:

```text
screen:
  menu | settings | load | presentation

sessionState:
  creating | ready | failed | stopped

runtimeState:
  starting | ready | degraded | stopped | error

loadState:
  idle | loading | ready | error
```

UI подписывается на `CoreEvent` и реагирует на события:

- `session_status`
- `presentation_status`
- `gesture_state`
- `core_error`
- `runtime_status`
- `presentation_command`
- `camera_frame`

### 8.4. Что делает Rust слой `desktop/src-tauri/src/lib.rs`

Функции:

- стартует sidecar как отдельный Python process
- пишет JSON-команды в stdin sidecar
- читает JSON-события из stdout sidecar
- пробрасывает события в React через Tauri event bus
- гасит process при закрытии окна

Команды Tauri:

```text
start_sidecar
send_sidecar_command
stop_sidecar
```

### 8.5. Что делает Python sidecar `desktop/sidecar/runtime.py`

Ответственности:

- создает backend session через `/session/create/`
- поллит `/presentations/latest/?pin=...`
- скачивает PDF по `download_url`
- отправляет `desktop-event`
- загружает PDF локально через `core.slide_loader.load_pdf`
- создает demo slides
- запускает OpenCV camera + MediaPipe detector
- отправляет gesture events и camera preview обратно в Tauri UI

### 8.6. Поток удаленной синхронизации

```text
startSession()
  -> sidecar starts sync thread
  -> POST /session/create/
  -> receives pin_code
  -> UI shows PIN

phone uploads file
  -> backend marks presentation ready

sidecar poll loop
  -> GET /presentations/latest/?pin=...
  -> GET /presentations/<id>/download/?pin=...
  -> load_pdf(...)
  -> POST /desktop-event/ downloading
  -> POST /desktop-event/ presenting
  -> emit presentation_status ready with slide assets
```

### 8.7. Поток gesture runtime

```text
enter presentation mode
  -> sidecar opens camera
  -> GestureDetector.process(frame)
  -> classify gesture
  -> emit gesture_state
  -> emit presentation_command for left/right swipe
  -> emit camera_frame preview
```

### 8.8. Важное ограничение нового desktop

`sidecar/runtime.py` уже умеет эмитить такие события:

```text
cursor_move
draw_command (undo / clear)
```

Но `desktop/src/types/desktop.ts` и `desktop/src/App.tsx` их сейчас не обрабатывают.

То есть:

- свайп слайдов уже подключен
- preview камеры уже подключен
- полноценное рисование поверх слайдов в новом Tauri UI еще не доведено до конца

---

## 9. Legacy desktop: схема Python/OpenCV

### 9.1. Главная машина состояний

```text
main.py
  MENU
    -> SETTINGS
    -> LOAD
    -> EXIT

  LOAD
    -> MENU
    -> PRESENTATION

  PRESENTATION
    -> MENU
    -> LOAD
    -> EXIT
```

### 9.2. Ответственность экранов

```text
menu_screen.py
  главное меню
  pinch-нажатие по кнопкам

settings_screen.py
  выбор языка ru/en

load_screen.py
  выбор локального PDF
  demo slides
  backend sync по PIN
  скачивание remote PDF

presentation_screen.py
  показ слайдов
  аннотации
  ластик
  очистка
  свайп между слайдами
```

### 9.3. Важный факт для дебага

Логика remote sync продублирована в двух местах:

1. `screens/load_screen.py`
2. `desktop/sidecar/runtime.py`

Это значит, что баги синхронизации могут существовать:

- только в legacy desktop
- только в new Tauri desktop
- в обоих местах одновременно

---

## 10. Shared core: схема Python-модулей

### `core/gesture.py`

Что делает:

- инициализирует MediaPipe Hands
- классифицирует жесты:
  `FIST`, `POINT`, `THUMB`, `PALM`, `PEACE`, `PINCH`
- возвращает:
  `gesture`, `landmarks`, `pinch_pos`, `index_pos`, `annotated`
- содержит `PinchButton` для hover + hold-click

### `core/slide_loader.py`

Что делает:

- `load_pdf(pdf_path)` -> list of slide images
- `load_folder(folder)` -> list of images from directory
- `create_demo_slides()` -> сгенерированные демо-слайды

### `core/renderer.py`

Что делает:

- базовые drawing helpers для OpenCV UI
- rounded rects, text, cursor, pinch progress, badges
- если установлен Pillow, умеет Unicode text

### `core/localization.py`

Что делает:

- хранит словари `ru` и `en`
- `Lang.set()` / `Lang.get()` / `Lang.t()`

---

## 11. Ключевые сценарии end-to-end

### Сценарий 1. Телефон отправляет файл на desktop

```text
frontend
  -> POST /session/pair/
  -> POST /presentations/upload/

backend
  -> creates Presentation
  -> if PDF: ready
  -> if PPTX: converting -> ready

desktop sidecar
  -> polls latest presentation by PIN
  -> downloads PDF
  -> loads slides
  -> shows presentation
```

### Сценарий 2. Локальная загрузка презентации на desktop

```text
desktop UI
  -> open file dialog
  -> choose PDF
  -> load_pdf()
  -> prepare slide assets
  -> open presentation screen
```

### Сценарий 3. Жесты управляют презентацией

```text
camera
  -> GestureDetector
  -> gesture runtime state
  -> gesture_state / presentation_command
  -> UI changes slide or mode
```

---

## 12. Карта зависимостей

```text
backend
  Django
  DRF
  django-cors-headers
  requests
  celery[redis]   # сейчас почти не задействован в runtime flow
  libreoffice     # внешняя системная зависимость для PPTX

shared python/core
  numpy
  opencv-python
  mediapipe
  PyMuPDF
  Pillow

frontend
  react
  axios
  vite

desktop
  react
  tauri v2
  @tauri-apps/plugin-dialog
  rust sidecar host
```

---

## 13. Главные точки отказа при дебаге

### 13.1. PIN не появляется на desktop

Проверять:

1. запущен ли backend
2. правильный ли `GESTUREPRO_API_URL`
3. sidecar вообще стартовал или нет
4. нет ли ошибки Python import в sidecar

Симптомы:

- `session_status = failed`
- `runtime_status = degraded`
- окно Tauri есть, но PIN не меняется с `••• •••`

### 13.2. Телефон не подключается по PIN

Проверять:

1. истекла ли `DeviceSession`
2. совпадает ли PIN
3. backend доступен ли с телефона по LAN
4. CORS / allowed hosts / trusted origins

### 13.3. Загрузка файла зависла на `converting`

Проверять:

1. установлен ли `libreoffice` или `soffice`
2. есть ли stderr из subprocess в `backend/api/services.py`
3. не слишком ли большой / битый `PPTX`

### 13.4. На телефоне статус `ready`, но desktop файл не подхватывает

Проверять:

1. desktop действительно поллит `/presentations/latest/`
2. тот ли PIN привязан к сессии
3. доступен ли `/download/`
4. может ли `load_pdf()` открыть скачанный PDF
5. дошел ли `desktop-event = downloading/presenting`

### 13.5. Камера работает, но жесты не влияют на новый Tauri UI

Проверять:

1. входит ли UI в `presentation` screen
2. вызван ли `presentation.enter`
3. шлются ли `gesture_state` и `presentation_command`
4. не ожидаете ли вы рисование, которое еще не подключено

Важно:

- новый Tauri UI пока реагирует на свайп-команды
- события курсора/рисования уже рождаются в sidecar, но в React еще не подключены

### 13.6. Legacy desktop и new desktop ведут себя по-разному

Причина часто в том, что:

- в `screens/load_screen.py` и `desktop/sidecar/runtime.py` похожая, но не одна и та же логика
- баг мог быть исправлен только в одной ветке

---

## 14. Быстрые команды для диагностики

```bash
# backend
cd backend
python manage.py runserver

# frontend
cd frontend
npm run dev

# new desktop
cd desktop
npm run tauri dev

# legacy desktop
python main.py
```

Полезно отдельно смотреть:

```bash
# есть ли sidecar ошибки импорта
cd desktop
npm run tauri dev

# доступен ли backend вручную
curl http://127.0.0.1:8000/api/v1/session/create/ -X POST
```

---

## 15. Самая важная мысль про архитектуру

Проект сейчас в переходном состоянии:

- `backend/` и `frontend/` уже работают как отдельная web-связка
- `desktop/` — новый UI-слой
- `core/` — старый, но все еще реальный engine
- `main.py` + `screens/` — legacy desktop, который пока не удален

Если нужно дебажить поведение, всегда сначала уточняй, о каком desktop-пути идет речь:

1. `python main.py`
2. `desktop + tauri + sidecar`

Без этого очень легко чинить не ту ветку.
