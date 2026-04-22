# GesturePro

GesturePro объединяет три части:

- Django API для pairing по PIN-коду, загрузки файлов и выдачи PDF;
- Tauri desktop shell на React/Vite для десктопного клиента;
- Expo/React Native мобильное приложение для отправки презентаций с телефона.

## Структура

```text
GesturePro/
├── backend/             # Django API, server config, env, requirements
├── desktop/             # Tauri desktop GUI shell
├── mobile/              # Expo/React Native мобильное приложение
├── core/                # жесты, рендеринг, загрузка слайдов
└── README.md
```

## Что умеет проект

- Управление слайдами жестами через камеру.
- Аннотации поверх слайдов, ластик, очистка и сохранение скриншота.
- Загрузка `PDF` и `PPTX` с телефона через web-интерфейс.
- Pairing desktop-экрана и мобильного устройства по 6-значному PIN-коду.
- Автоконвертация `PPTX -> PDF` через LibreOffice.

## Быстрый старт

### 1. Запуск backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### 2. Запуск desktop

```bash
cd desktop
npm install
npm run tauri dev
```

### 3. Запуск мобильного клиента

```bash
cd mobile
npm install
npm run start
```

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
