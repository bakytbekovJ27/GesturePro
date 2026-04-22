import uuid
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone

import api.models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="DeviceSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("pin_code", models.CharField(db_index=True, max_length=6, unique=True)),
                ("access_token", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Presentation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("original_file", models.FileField(upload_to=api.models.presentation_original_path)),
                ("pdf_file", models.FileField(blank=True, null=True, upload_to=api.models.presentation_pdf_path)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("uploading", "Загружается"),
                            ("converting", "Конвертируется"),
                            ("ready", "Готово"),
                            ("error", "Ошибка"),
                        ],
                        default="uploading",
                        max_length=20,
                    ),
                ),
                ("error_message", models.TextField(blank=True)),
                ("file_size", models.BigIntegerField(default=0)),
                ("extension", models.CharField(max_length=10)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("last_sent_at", models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ("ready_at", models.DateTimeField(blank=True, null=True)),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="presentations",
                        to="api.devicesession",
                    ),
                ),
            ],
            options={"ordering": ["-last_sent_at", "-uploaded_at"]},
        ),
    ]
