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
