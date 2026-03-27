from django.contrib import admin

from .models import DeviceSession, Presentation


@admin.register(DeviceSession)
class DeviceSessionAdmin(admin.ModelAdmin):
    list_display = ("pin_code", "display_name", "is_active", "created_at")
    search_fields = ("pin_code",)
    list_filter = ("is_active", "created_at")


@admin.register(Presentation)
class PresentationAdmin(admin.ModelAdmin):
    list_display = ("title", "session", "status", "extension", "uploaded_at", "last_sent_at")
    search_fields = ("title", "session__pin_code")
    list_filter = ("status", "extension", "uploaded_at")
