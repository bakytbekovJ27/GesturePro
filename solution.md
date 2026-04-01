# GesturePro — Solution Guide

Дата: 01.04.2026  
Симптомы: PIN mismatch, MOCK mode, телефон не достучится до backend

---

## Диагностика: что именно сломано и почему

### Проблема 1 — Tauri работает в MOCK режиме (корневая причина всего)

**Что видно:**
- Tauri показывает `MOCK` и `DEGRADED` в header
- В панели Mobile Sync: `"Mock bridge error: future Python core is not connected yet"`
- В панели Session: `"Backend is unavailable at http://127.0.0.1:8000/api/v1"`

**Что происходит на самом деле:**

```
desktop/src/bridge/index.ts
  if VITE_DESKTOP_MOCK=1 OR Tauri internals not found:
      → MockDesktopCoreBridge  ← ты сюда попал
  else:
      → TauriDesktopCoreBridge (реальный sidecar)
```

Когда sidecar не стартует или падает при импорте — Tauri автоматически падает
в Mock Bridge. Mock Bridge генерирует свои ФЕЙКОВЫЕ PIN-коды, которые не
зарегистрированы в backend. Поэтому:

```
backend PIN:  608184  (реальный, создан sidecar до падения)
Tauri PIN:    189 502 (фейковый, из Mock Bridge)
```

Любой PIN из двух → "Код недействителен" в frontend, потому что:
- `608184` — сессия уже протухла или sidecar мертв и не поллит
- `189 502` — никогда не регистрировался в backend

---

### Проблема 2 — Телефон не может зайти на backend

Backend запущен как:
```
python manage.py runserver
→ слушает на 127.0.0.1:8000 (только localhost)
```

Телефон в LAN пытается достучаться до `192.168.51.99:8000` — backend туда не
отвечает. Это отдельная проблема от MOCK mode.

---

## Решение: пошагово

### Шаг 1 — Диагностика sidecar (главное)

Открой новый терминал и запусти sidecar вручную:

```bash
cd desktop/sidecar
python3 runtime.py
```

Возможные ошибки и что с ними делать:

**Ошибка A — ModuleNotFoundError: mediapipe / cv2 / fitz**

```bash
# Нужно установить зависимости sidecar отдельно
# Они НЕ входят в backend/requirements.txt

pip3 install mediapipe opencv-python pymupdf requests
# или если есть requirements в desktop/sidecar/:
pip3 install -r desktop/sidecar/requirements.txt
```

**Ошибка B — No module named 'core'**

```bash
# sidecar импортирует core/, но нужно запускать из корня проекта
cd /путь/до/GesturePro
python3 desktop/sidecar/runtime.py
```

**Ошибка C — camera не открывается / cv2.error**

```bash
# На macOS нужно разрешение на камеру для Terminal
# Запусти из самого Terminal.app, не из IDE
# Или сначала проверь без камеры
```

**Если sidecar запустился нормально** — переходи к Шагу 2.  
**Если падает** — исправь импорты и повтори.

---

### Шаг 2 — Проверь конфиг Tauri для sidecar

Открой `desktop/src-tauri/tauri.conf.json` и найди секцию с sidecar:

```json
"bundle": {
  "externalBin": ["../sidecar/runtime"]
}
```

или аналогичное. Tauri v2 требует, чтобы sidecar был **скомпилированным бинарем**
или обернут в скрипт. Если у тебя просто `runtime.py`, то Tauri не может его
запустить напрямую.

**Быстрый fix — wrapper script:**

Создай файл `desktop/sidecar/runtime` (без расширения):

```bash
#!/bin/bash
cd "$(dirname "$0")/../.."
python3 desktop/sidecar/runtime.py "$@"
chmod +x desktop/sidecar/runtime
```

И в `tauri.conf.json` укажи путь на этот wrapper.

**Или через переменную окружения — временный MOCK bypass:**

Если хочешь проверить всё остальное пока sidecar сломан:

```bash
# frontend/.env.local или desktop/.env.local
VITE_DESKTOP_MOCK=0  # убедиться что mock выключен
```

---

### Шаг 3 — Запусти backend на 0.0.0.0 (для телефона)

Вместо обычного `runserver` используй:

```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

Это заставит Django слушать все интерфейсы, включая LAN.

Потом открой `backend/server/settings.py` и добавь свой LAN IP:

```python
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '192.168.51.99',   # ← твой LAN IP
    '*',               # только для разработки, убрать в проде
]
```

Проверка:

```bash
# С другого устройства или с телефона через браузер:
curl http://192.168.51.99:8000/api/v1/session/create/ -X POST
# Должен вернуть JSON с pin_code
```

---

### Шаг 4 — Укажи frontend правильный backend URL

Сейчас frontend скорее всего ходит на `http://localhost:8000` — с телефона это
не работает. Создай файл `frontend/.env.local`:

```env
VITE_API_URL=http://192.168.51.99:8000
```

Проверь `frontend/src/api/client.ts` — там должно быть примерно:

```typescript
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
```

Если там захардкожен `localhost` — замени на `import.meta.env.VITE_API_URL`.

После этого перезапусти frontend:

```bash
cd frontend
npm run dev
```

Телефон должен открыть `http://192.168.51.99:5173` (Network URL из вывода Vite).

---

### Шаг 5 — CORS для LAN

Открой `backend/server/settings.py` и добавь LAN origin:

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:1420',
    'http://127.0.0.1:5173',
    'http://192.168.51.99:5173',   # ← frontend с телефона
    'http://192.168.51.99:1420',   # ← desktop web
]

# Или для разработки (менее безопасно):
CORS_ALLOW_ALL_ORIGINS = True
```

---

## Правильный порядок запуска (после всех фиксов)

```
Терминал 1 — Backend (обязательно 0.0.0.0):
  cd backend
  source .venv/bin/activate
  python manage.py runserver 0.0.0.0:8000

Терминал 2 — Desktop (Tauri с реальным sidecar):
  cd desktop
  npm run tauri dev

Терминал 3 — Frontend (если нужен браузер/телефон):
  cd frontend
  npm run dev
```

Порядок важен: backend должен быть запущен ДО desktop, иначе sidecar не сможет
создать сессию и упадёт в MOCK.

---

## Финальная проверка

| Проверка | Ожидаемый результат |
|---|---|
| `curl http://127.0.0.1:8000/api/v1/session/create/ -X POST` | JSON с `pin_code` |
| `curl http://192.168.51.99:8000/api/v1/session/create/ -X POST` | Тот же JSON (LAN) |
| Tauri desktop запущен | Header показывает реальный 6-значный PIN, не `MOCK` |
| Телефон открывает `http://192.168.51.99:5173` | Видна страница ввода PIN |
| Вводишь PIN с Tauri → телефон | "Подключено", можно грузить файл |
| Sidecar в терминале вручную | Запускается без ошибок импорта |

---

## Если быстро хочется потестировать без Tauri

Используй **legacy desktop** — он работает полностью через Python, без sidecar и Rust:

```bash
# В корне проекта (backend должен быть запущен):
python3 main.py
```

Legacy desktop сам создаёт PIN через `screens/load_screen.py`, показывает его
через OpenCV окно. Можно зайти с телефона и отправить файл — проверить что
backend и frontend вообще работают вместе.

---

## TL;DR — три команды которые скорее всего всё починят

```bash
# 1. Диагностика sidecar
cd desktop/sidecar && python3 runtime.py

# 2. Backend на LAN
cd backend && python manage.py runserver 0.0.0.0:8000

# 3. Frontend с LAN URL
echo "VITE_API_URL=http://192.168.51.99:8000" > frontend/.env.local
cd frontend && npm run dev
```

После этого телефон открывает `http://192.168.51.99:5173`, backend доступен,
и если sidecar починен — Tauri покажет реальный PIN.
