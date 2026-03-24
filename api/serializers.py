from rest_framework import serializers
from rest_framework.reverse import reverse

from .models import DeviceSession, Presentation


class DeviceSessionSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    expires_at = serializers.DateTimeField(read_only=True)
    access_token = serializers.UUIDField(read_only=True)

    class Meta:
        model = DeviceSession
        fields = [
            "pin_code",
            "access_token",
            "display_name",
            "created_at",
            "expires_at",
            "is_active",
        ]


class PresentationSerializer(serializers.ModelSerializer):
    status_message = serializers.CharField(read_only=True)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Presentation
        fields = [
            "id",
            "title",
            "status",
            "status_message",
            "error_message",
            "file_size",
            "extension",
            "uploaded_at",
            "updated_at",
            "last_sent_at",
            "ready_at",
            "download_url",
        ]

    def get_download_url(self, obj):
        if not obj.pdf_file:
            return None
        request = self.context.get("request")
        return reverse(
            "presentation-download",
            kwargs={"presentation_id": obj.id},
            request=request,
        )
