FROM python:3.10-slim

# Установка системных зависимостей (включая LibreOffice для конвертации)
RUN apt-get update && apt-get install -y \
    libreoffice \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Запуск сервера через gunicorn (добавьте его в requirements.txt)
CMD ["gunicorn", "server.wsgi:application", "--bind", "0.0.0.0:8000"]
