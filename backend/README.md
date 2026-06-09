# GesturePro Backend

Backend-часть проекта вынесена в отдельную папку для более чистого разделения frontend и server-side логики.

## Состав

- `manage.py` — Django entrypoint
- `api/` — REST API, модели, сериализаторы, views, services
- `api/admin_views.py` — Эндпоинты для управления панелью администратора (пользователи, сессии, статистика, презентации)
- `server/` — settings, urls, asgi, wsgi, celery
- `requirements.txt` — Python dependencies
- `.env.example` — пример backend-конфига


## Локальный запуск

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

Локальный сценарий:

- `http://localhost:8000` достаточно для pairing на этом же ноутбуке
- web-клиенты на `localhost:5173` и `localhost:1420` сами подхватят `localhost:8000`

Для телефона по локальной сети backend обязательно должен слушать все интерфейсы:

```bash
python manage.py runserver 0.0.0.0:8000
```

И проверьте, что LAN IP ноутбука добавлен в:

- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`
- `DJANGO_CORS_ALLOWED_ORIGINS`

Если backend слушает только `127.0.0.1:8000`, то PIN может существовать в базе, но pairing с телефона по `http://<LAN-IP>:8000` работать не будет.

## API Панели Администратора

Для обслуживания React-админки бэкенд предоставляет специализированные эндпоинты по пути `/api/v1/admin/`:
- `GET /admin/stats/` — агрегированные показатели системы.
- `GET / POST / PATCH / DELETE /admin/users/` — управление пользователями.
- `GET / DELETE /admin/sessions/` — мониторинг и принудительное отключение активных сессий сопряжения.
- `GET / DELETE /admin/presentations/` — просмотр и удаление презентаций.

**Важно**: Все запросы к административным API требуют авторизации через JWT-токены (`Authorization: Bearer <token>`) и проверяют, что пользователь является сотрудником (`is_staff=True`).

