import uuid
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone


User = get_user_model()


def presentation_original_path(instance, filename):
    extension = Path(filename).suffix.lower() or ".bin"
    return f"presentations/originals/{instance.session.pin_code}/{instance.id}{extension}"


def presentation_pdf_path(instance, filename):
    return f"presentations/pdfs/{instance.session.pin_code}/{instance.id}.pdf"


class DeviceSession(models.Model):
    pin_code = models.CharField(max_length=6, unique=True, db_index=True)
    access_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Session {self.pin_code}"

    @property
    def expires_at(self):
        return self.created_at + timedelta(hours=settings.SESSION_LIFETIME_HOURS)

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @property
    def display_name(self):
        return f"Экран {self.pin_code[-2:]}"


class Presentation(models.Model):
    STATUS_UPLOADING = "uploading"
    STATUS_CONVERTING = "converting"
    STATUS_READY = "ready"
    STATUS_DOWNLOADING = "downloading"
    STATUS_PRESENTING = "presenting"
    STATUS_ERROR = "error"

    STATUS_CHOICES = (
        (STATUS_UPLOADING, "Загружается"),
        (STATUS_CONVERTING, "Конвертируется"),
        (STATUS_READY, "Готово к экрану"),
        (STATUS_DOWNLOADING, "Загружается на компьютер"),
        (STATUS_PRESENTING, "Транслируется"),
        (STATUS_ERROR, "Ошибка"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        DeviceSession,
        on_delete=models.CASCADE,
        related_name="presentations",
    )
    uploaded_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="uploaded_presentations",
    )
    title = models.CharField(max_length=255)
    original_file = models.FileField(upload_to=presentation_original_path)
    pdf_file = models.FileField(upload_to=presentation_pdf_path, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_UPLOADING)
    error_message = models.TextField(blank=True)
    file_size = models.BigIntegerField(default=0)
    extension = models.CharField(max_length=10)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_sent_at = models.DateTimeField(default=timezone.now, db_index=True)
    ready_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_sent_at", "-uploaded_at"]

    def __str__(self):
        return self.title

    @property
    def status_message(self):
        if self.status == self.STATUS_UPLOADING:
            return "Файл загружается на сервер."
        if self.status == self.STATUS_CONVERTING:
            return "Обработка и конвертация в PDF..."
        if self.status == self.STATUS_READY:
            return "Файл готов. Ожидаем экран GesturePro."
        if self.status == self.STATUS_DOWNLOADING:
            return "Компьютер загружает презентацию..."
        if self.status == self.STATUS_PRESENTING:
            return "Трансляция начата на экране."
        if self.error_message:
            return self.error_message
        return "Не удалось обработать файл."
