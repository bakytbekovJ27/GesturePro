# GesturePro

GesturePro объединяет три части:

- desktop-приложение на Python/OpenCV для управления презентацией жестами;
- Django API для pairing по PIN-коду, загрузки файлов и выдачи PDF на desktop;
- PWA frontend на React/Vite для отправки презентаций с телефона.

## Структура

```text
GesturePro/
├── backend/             # Django API, server config, env, requirements
├── desktop/             # Tauri desktop GUI shell (new)
├── frontend/            # React + Vite PWA
├── core/                # жесты, рендеринг, загрузка слайдов
├── screens/             # экраны desktop-приложения
├── main.py              # desktop entrypoint
└── README.md
```

## Что умеет проект

- Управление слайдами жестами через камеру.
- Аннотации поверх слайдов, ластик, очистка и сохранение скриншота.
- Загрузка `PDF` и `PPTX` с телефона через web-интерфейс.
- Pairing desktop-экрана и мобильного устройства по 6-значному PIN-коду.
- Автоконвертация `PPTX -> PDF` через LibreOffice.

## Быстрый старт

### 1. Python desktop + backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
python backend/manage.py migrate
python backend/manage.py runserver 0.0.0.0:8000
```

Desktop-приложение запускается отдельно:

```bash
python main.py
```

### 1.1. Новый Tauri desktop shell

```bash
cd desktop
npm install
npm run tauri dev
```

Старый Python desktop остаётся в проекте и пока не удаляется. Новый `desktop/` сейчас реализует GUI-first слой для следующей интеграции с `core/`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

По умолчанию web-клиенты сами вычисляют backend URL от hostname страницы:

```bash
http://localhost:5173 -> http://localhost:8000/api/v1
http://localhost:1420 -> http://localhost:8000/api/v1
http://<LAN-IP>:5173 -> http://<LAN-IP>:8000/api/v1
http://<LAN-IP>:1420 -> http://<LAN-IP>:8000/api/v1
```

Если нужен ручной override, используйте:

```bash
VITE_API_URL=http://<LAN-IP>:8000
# или legacy:
VITE_API_BASE_URL=http://<LAN-IP>:8000/api/v1
```

После изменения `.env`/`.env.local` перезапустите Vite dev server.

Для телефона по локальной сети backend должен быть запущен именно так:

```bash
python backend/manage.py runserver 0.0.0.0:8000
```

И тот же `<LAN-IP>` должен быть разрешён в `backend/.env`:

```bash
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,<LAN-IP>
DJANGO_CSRF_TRUSTED_ORIGINS=http://127.0.0.1:8000,http://localhost:8000,http://<LAN-IP>:8000
DJANGO_CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,http://<LAN-IP>:5173
```

После этого frontend будет доступен с телефона по адресу `http://<LAN-IP>:5173`, а browser desktop при желании можно открыть по `http://<LAN-IP>:1420`.

## Переменные окружения backend

Основные переменные описаны в `backend/.env.example`:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`
- `DJANGO_CORS_ALLOW_ALL_ORIGINS`
- `DJANGO_CORS_ALLOWED_ORIGINS`
- `DJANGO_TIME_ZONE`
- `SESSION_LIFETIME_HOURS`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`

## Backend layout

Теперь вся серверная часть собрана в `backend/`:

- `backend/manage.py` — Django entrypoint;
- `backend/api/` — REST API, модели, сериализаторы, бизнес-логика;
- `backend/server/` — settings, urls, asgi, wsgi, celery;
- `backend/requirements.txt` — Python-зависимости backend;
- `backend/.env.example` — шаблон переменных окружения backend.

## Системные зависимости

- Python 3.9+
- Node.js 20+ для frontend
- веб-камера для desktop-режима
- LibreOffice или `soffice` для конвертации `PPTX`

## Управление в desktop-режиме

- Указательный палец: перемещение курсора.
- Пинч: нажатие на кнопку интерфейса.
- Кулак: пауза/активация управления.
- Указательный палец в режиме презентации: рисование.
- Большой палец: ластик.
- Открытая ладонь: очистка аннотаций на текущем слайде.
- Жест `victory` + свайп: переключение слайдов.

Клавиши:

- `1` старт
- `2` настройки
- `B` назад
- `O` выбор файла
- `D` демо или загрузка из папки
- `C` смена цвета кисти
- `X` очистка текущего слайда
- `S` сохранение скриншота
- `M` возврат в меню
- `Q` / `Esc` выход
