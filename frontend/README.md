# GesturePro Frontend

Мобильный PWA-клиент для pairing с desktop-экраном GesturePro и отправки презентаций на backend.

## Возможности

- pairing по 6-значному PIN-коду;
- загрузка `PDF` и `PPTX`;
- отображение прогресса загрузки;
- ожидание завершения конвертации `PPTX -> PDF`;
- локальная история последних отправленных файлов.

## Локальный запуск

```bash
cp .env.example .env
npm install
npm run dev
```

По умолчанию frontend сам вычисляет backend URL от hostname страницы:

```bash
http://localhost:5173 -> http://localhost:8000/api/v1
http://192.168.51.99:5173 -> http://192.168.51.99:8000/api/v1
```

Если нужен ручной override:

```bash
VITE_API_URL=http://localhost:8000
# или legacy:
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

После изменения `.env`/`.env.local` перезапустите Vite dev server.

## Локальный ноутбук

- Достаточно обычного backend на `localhost:8000`
- PIN pairing на `localhost:5173` будет работать без отдельной LAN-настройки

## Телефон / локальная сеть

1. Узнайте LAN IP ноутбука, например `192.168.51.99`.
2. Запустите backend на всех интерфейсах:

```bash
cd ../backend
python manage.py runserver 0.0.0.0:8000
```

3. Откройте frontend с телефона:

```text
http://<LAN-IP>:5173
```

4. Если нужен явный override, укажите его в `frontend/.env.local`:

```bash
VITE_API_URL=http://<LAN-IP>:8000
```

## Production build

```bash
npm run build
npm run preview
```
