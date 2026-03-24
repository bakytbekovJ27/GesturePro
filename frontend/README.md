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

## Production build

```bash
npm run build
npm run preview
```
