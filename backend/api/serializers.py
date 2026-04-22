from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework.reverse import reverse

from .models import DeviceSession, Presentation


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError("Введите username.")
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Пользователь с таким username уже существует.")
        return username

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует.")
        return email

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Пароли не совпадают."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm", None)
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs.get("username", "").strip(),
            password=attrs.get("password"),
        )
        if not user or not user.is_active:
            raise serializers.ValidationError({"detail": "Неверный username или пароль."})
        attrs["user"] = user
        return attrs


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
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = Presentation
        fields = [
            "id",
            "uploaded_by",
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
