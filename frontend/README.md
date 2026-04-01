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

Переменная окружения:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## Запуск с телефона по локальной сети

1. Узнайте LAN IP ноутбука, например `192.168.0.105`.
2. Укажите этот адрес в `frontend/.env`:

```bash
VITE_API_BASE_URL=http://<LAN-IP>:8000/api/v1
```

3. Запустите backend на всех интерфейсах:

```bash
cd ../backend
python manage.py runserver 0.0.0.0:8000
```

4. Откройте frontend с телефона:

```text
http://<LAN-IP>:5173
```

## Production build

```bash
npm run build
npm run preview
```
