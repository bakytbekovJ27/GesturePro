# GesturePro Backend

Backend-часть проекта вынесена в отдельную папку для более чистого разделения frontend и server-side логики.

## Состав

- `manage.py` — Django entrypoint
- `api/` — REST API, модели, сериализаторы, views, services
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
