from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="presentation",
            name="status",
            field=models.CharField(
                choices=[
                    ("uploading", "Загружается"),
                    ("converting", "Конвертируется"),
                    ("ready", "Готово к экрану"),
                    ("downloading", "Загружается на компьютер"),
                    ("presenting", "Транслируется"),
                    ("error", "Ошибка"),
                ],
                default="uploading",
                max_length=20,
            ),
        ),
    ]
