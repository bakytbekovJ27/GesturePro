import secrets
import shutil
import subprocess
import threading
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.utils import timezone

from .models import DeviceSession, Presentation


def generate_pin_code():
    while True:
        pin_code = f"{secrets.randbelow(1_000_000):06d}"
        if not DeviceSession.objects.filter(pin_code=pin_code).exists():
            return pin_code


def resolve_office_binary():
    return shutil.which("libreoffice") or shutil.which("soffice")


def schedule_conversion(presentation_id):
    worker = threading.Thread(
        target=convert_presentation_to_pdf,
        args=(presentation_id,),
        daemon=True,
    )
    worker.start()


def convert_presentation_to_pdf(presentation_id):
    try:
        presentation = Presentation.objects.select_related("session").get(id=presentation_id)
    except Presentation.DoesNotExist:
        return

    office_binary = resolve_office_binary()
    if not office_binary:
        presentation.status = Presentation.STATUS_ERROR
        presentation.error_message = (
            "LibreOffice не найден на сервере. Установите libreoffice/soffice для PPTX."
        )
        presentation.save(update_fields=["status", "error_message", "updated_at"])
        return

    temp_dir = Path(settings.MEDIA_ROOT) / "tmp" / str(presentation.id)
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        result = subprocess.run(
            [
                office_binary,
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                str(temp_dir),
                presentation.original_file.path,
            ],
            capture_output=True,
            text=True,
            timeout=180,
            check=False,
        )
        generated_pdf = temp_dir / f"{Path(presentation.original_file.path).stem}.pdf"
        if result.returncode != 0 or not generated_pdf.exists():
            stderr = (result.stderr or "").strip()
            presentation.status = Presentation.STATUS_ERROR
            presentation.error_message = stderr or "Сервер не смог сконвертировать PPTX в PDF."
            presentation.save(update_fields=["status", "error_message", "updated_at"])
            return

        with generated_pdf.open("rb") as pdf_handle:
            presentation.pdf_file.save(f"{presentation.id}.pdf", File(pdf_handle), save=False)

        now = timezone.now()
        presentation.status = Presentation.STATUS_READY
        presentation.error_message = ""
        presentation.ready_at = now
        presentation.last_sent_at = now
        presentation.save(
            update_fields=[
                "pdf_file",
                "status",
                "error_message",
                "ready_at",
                "last_sent_at",
                "updated_at",
            ]
        )
    except subprocess.TimeoutExpired:
        presentation.status = Presentation.STATUS_ERROR
        presentation.error_message = "Конвертация PPTX превысила лимит времени."
        presentation.save(update_fields=["status", "error_message", "updated_at"])
    except Exception as exc:
        presentation.status = Presentation.STATUS_ERROR
        presentation.error_message = f"Ошибка конвертации: {exc}"
        presentation.save(update_fields=["status", "error_message", "updated_at"])
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
