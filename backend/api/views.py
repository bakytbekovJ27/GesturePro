import uuid
from pathlib import Path

from django.http import FileResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import DeviceSession, Presentation
from .serializers import (
    DeviceSessionSerializer,
    LoginSerializer,
    PresentationSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .services import generate_pin_code, schedule_conversion


def get_active_session_by_pin(pin_code):
    session = DeviceSession.objects.filter(pin_code=pin_code, is_active=True).first()
    if not session:
        return None
    if session.is_expired:
        session.is_active = False
        session.save(update_fields=["is_active"])
        return None
    return session


def get_authorized_session(request):
    token = str(request.headers.get("X-Session-Token", "")).strip()
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header.split(" ", 1)[1].strip()
    if not token:
        return None
    try:
        token_uuid = uuid.UUID(token)
    except (ValueError, TypeError):
        return None

    session = DeviceSession.objects.filter(access_token=token_uuid, is_active=True).first()
    if not session:
        return None
    if session.is_expired:
        session.is_active = False
        session.save(update_fields=["is_active"])
        return None
    return session


def build_auth_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        "user": UserSerializer(user).data,
        "tokens": {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        },
    }


class AuthRegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(build_auth_response(user), status=status.HTTP_201_CREATED)


class AuthLoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return Response(build_auth_response(user))


class AuthMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class SessionCreateView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        session = DeviceSession.objects.create(pin_code=generate_pin_code())
        serializer = DeviceSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SessionPairView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        pin_code = str(request.data.get("pin_code", "")).strip()
        session = get_active_session_by_pin(pin_code)
        if not session:
            return Response(
                {"detail": "Код недействителен или экран отключен."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = DeviceSessionSerializer(session)
        return Response(serializer.data)


class PresentationUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session = get_authorized_session(request)
        if not session:
            return Response(
                {"detail": "Требуется активная desktop-сессия."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"detail": "Файл не передан."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        extension = Path(uploaded_file.name).suffix.lower()
        if extension not in {".pdf", ".pptx"}:
            return Response(
                {"detail": "Поддерживаются только PDF и PPTX."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        presentation = Presentation.objects.create(
            session=session,
            uploaded_by=request.user,
            title=uploaded_file.name,
            original_file=uploaded_file,
            status=Presentation.STATUS_UPLOADING,
            file_size=getattr(uploaded_file, "size", 0),
            extension=extension,
        )

        if extension == ".pdf":
            now = timezone.now()
            presentation.pdf_file.name = presentation.original_file.name
            presentation.status = Presentation.STATUS_READY
            presentation.ready_at = now
            presentation.last_sent_at = now
            presentation.save(
                update_fields=["pdf_file", "status", "ready_at", "last_sent_at", "updated_at"]
            )
        else:
            presentation.status = Presentation.STATUS_CONVERTING
            presentation.save(update_fields=["status", "updated_at"])
            schedule_conversion(str(presentation.id))

        serializer = PresentationSerializer(presentation, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PresentationRecentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        presentations = Presentation.objects.filter(uploaded_by=request.user).order_by(
            "-uploaded_at",
            "-updated_at",
        )
        serializer = PresentationSerializer(
            presentations,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)


class PresentationStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, presentation_id):
        presentation = Presentation.objects.filter(uploaded_by=request.user, id=presentation_id).first()
        if not presentation:
            return Response(
                {"detail": "Презентация не найдена."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PresentationSerializer(presentation, context={"request": request})
        return Response(serializer.data)


class PresentationReuseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, presentation_id):
        session = get_authorized_session(request)
        if not session:
            return Response(
                {"detail": "Требуется активная desktop-сессия."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        presentation = Presentation.objects.filter(uploaded_by=request.user, id=presentation_id).first()
        if not presentation:
            return Response(
                {"detail": "Презентация не найдена."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not presentation.pdf_file:
            return Response(
                {"detail": "Эту презентацию пока нельзя отправить повторно."},
                status=status.HTTP_409_CONFLICT,
            )

        presentation.session = session
        presentation.status = Presentation.STATUS_READY
        presentation.error_message = ""
        presentation.last_sent_at = timezone.now()
        presentation.save(
            update_fields=["session", "status", "error_message", "last_sent_at", "updated_at"]
        )

        serializer = PresentationSerializer(presentation, context={"request": request})
        return Response(serializer.data)


class PresentationDesktopEventView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, presentation_id):
        pin_code = str(request.data.get("pin_code", "") or request.query_params.get("pin", "")).strip()
        event_name = str(request.data.get("event", "")).strip()
        message = str(request.data.get("message", "")).strip()

        session = get_active_session_by_pin(pin_code)
        if not session:
            return Response(
                {"detail": "Сессия не найдена."},
                status=status.HTTP_404_NOT_FOUND,
            )

        presentation = session.presentations.filter(id=presentation_id).first()
        if not presentation:
            return Response(
                {"detail": "Презентация не найдена."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if event_name == "downloading":
            presentation.status = Presentation.STATUS_DOWNLOADING
            presentation.error_message = ""
            presentation.save(update_fields=["status", "error_message", "updated_at"])
        elif event_name == "ready":
            presentation.status = Presentation.STATUS_READY
            presentation.error_message = ""
            presentation.save(update_fields=["status", "error_message", "updated_at"])
        elif event_name == "presenting":
            presentation.status = Presentation.STATUS_PRESENTING
            presentation.error_message = ""
            presentation.save(update_fields=["status", "error_message", "updated_at"])
        elif event_name == "error":
            presentation.status = Presentation.STATUS_ERROR
            presentation.error_message = message or "Desktop не смог открыть презентацию."
            presentation.save(update_fields=["status", "error_message", "updated_at"])
        else:
            return Response(
                {"detail": "Неизвестное desktop-событие."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PresentationSerializer(presentation, context={"request": request})
        return Response(serializer.data)


class PresentationLatestView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        pin_code = str(request.query_params.get("pin", "")).strip()
        session = get_active_session_by_pin(pin_code)
        if not session:
            return Response(
                {"detail": "Сессия не найдена."},
                status=status.HTTP_404_NOT_FOUND,
            )

        presentation = (
            session.presentations.filter(status=Presentation.STATUS_READY, pdf_file__isnull=False)
            .order_by("-last_sent_at", "-uploaded_at")
            .first()
        )
        if not presentation:
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = PresentationSerializer(presentation, context={"request": request})
        return Response(serializer.data)


class PresentationDownloadView(APIView):
    permission_classes = []

    def get(self, request, presentation_id):
        presentation = None
        if request.user.is_authenticated:
            presentation = Presentation.objects.filter(
                uploaded_by=request.user,
                id=presentation_id,
            ).first()

        if not presentation:
            session = get_authorized_session(request)
            pin_code = str(request.query_params.get("pin", "")).strip()
            if not session and pin_code:
                session = get_active_session_by_pin(pin_code)
            if not session:
                return Response(
                    {"detail": "Требуется авторизация или активная desktop-сессия."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            presentation = session.presentations.filter(id=presentation_id).first()

        if not presentation or not presentation.pdf_file:
            return Response(
                {"detail": "PDF-файл не найден."},
                status=status.HTTP_404_NOT_FOUND,
            )

        filename = f"{Path(presentation.title).stem}.pdf"
        return FileResponse(
            presentation.pdf_file.open("rb"),
            as_attachment=True,
            filename=filename,
        )
