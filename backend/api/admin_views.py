"""admin_views.py — Admin-only REST API views for GesturePro admin panel.

All views require the requesting user to be authenticated AND is_staff=True.
"""
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeviceSession, Presentation
from .serializers import DeviceSessionSerializer, PresentationSerializer, UserSerializer

User = get_user_model()


# ── Shared admin serializer for full user detail ──────────────────────────────

class AdminUserDetailSerializer(UserSerializer):
    """Extends the basic UserSerializer with admin-relevant fields."""
    from rest_framework import serializers

    class Meta(UserSerializer.Meta):
        fields = ["id", "username", "email", "is_staff", "is_active", "date_joined", "last_login"]


# ── Dashboard Stats ────────────────────────────────────────────────────────────

class AdminStatsView(APIView):
    """GET /api/v1/admin/stats/ — High-level dashboard metrics."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        active_sessions = DeviceSession.objects.filter(is_active=True).count()
        total_sessions = DeviceSession.objects.count()
        total_presentations = Presentation.objects.count()

        status_counts = {}
        for choice_key, _ in Presentation.STATUS_CHOICES:
            status_counts[choice_key] = Presentation.objects.filter(status=choice_key).count()

        # Recent activity: last 10 presentations
        recent = Presentation.objects.select_related("uploaded_by", "session").order_by("-uploaded_at")[:10]
        recent_data = PresentationSerializer(recent, many=True, context={"request": request}).data

        return Response(
            {
                "total_users": total_users,
                "active_sessions": active_sessions,
                "total_sessions": total_sessions,
                "total_presentations": total_presentations,
                "presentation_status_counts": status_counts,
                "recent_presentations": recent_data,
            }
        )


# ── User Management ────────────────────────────────────────────────────────────

class AdminUserListView(APIView):
    """GET /api/v1/admin/users/  — list all users.
    POST /api/v1/admin/users/ — create a new user."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        users = User.objects.all().order_by("-date_joined")
        if search:
            users = users.filter(username__icontains=search) | users.filter(email__icontains=search)
            users = users.distinct()

        data = []
        for u in users:
            data.append(
                {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "is_staff": u.is_staff,
                    "is_active": u.is_active,
                    "date_joined": u.date_joined,
                    "last_login": u.last_login,
                }
            )
        return Response(data)

    def post(self, request):
        username = request.data.get("username", "").strip()
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")
        is_staff = bool(request.data.get("is_staff", False))

        if not username or not email or not password:
            return Response(
                {"detail": "username, email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username__iexact=username).exists():
            return Response(
                {"detail": f"User '{username}' already exists."},
                status=status.HTTP_409_CONFLICT,
            )
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"detail": f"Email '{email}' is already in use."},
                status=status.HTTP_409_CONFLICT,
            )

        user = User.objects.create_user(username=username, email=email, password=password)
        user.is_staff = is_staff
        user.save(update_fields=["is_staff"])

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
                "is_active": user.is_active,
                "date_joined": user.date_joined,
                "last_login": user.last_login,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminUserDetailView(APIView):
    """GET/PATCH/DELETE /api/v1/admin/users/<pk>/"""
    permission_classes = [IsAdminUser]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
                "is_active": user.is_active,
                "date_joined": user.date_joined,
                "last_login": user.last_login,
            }
        )

    def patch(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        # Prevent demoting yourself
        if user == request.user and "is_staff" in request.data and not request.data["is_staff"]:
            return Response(
                {"detail": "You cannot remove your own admin privileges."},
                status=status.HTTP_403_FORBIDDEN,
            )

        fields_updated = []
        if "username" in request.data:
            new_username = str(request.data["username"]).strip()
            if new_username and new_username != user.username:
                if User.objects.filter(username__iexact=new_username).exclude(pk=pk).exists():
                    return Response(
                        {"detail": f"Username '{new_username}' is already taken."},
                        status=status.HTTP_409_CONFLICT,
                    )
                user.username = new_username
                fields_updated.append("username")
        if "email" in request.data:
            new_email = str(request.data["email"]).strip().lower()
            if new_email and new_email != user.email:
                if User.objects.filter(email__iexact=new_email).exclude(pk=pk).exists():
                    return Response(
                        {"detail": f"Email '{new_email}' is already taken."},
                        status=status.HTTP_409_CONFLICT,
                    )
                user.email = new_email
                fields_updated.append("email")
        if "is_staff" in request.data:
            user.is_staff = bool(request.data["is_staff"])
            fields_updated.append("is_staff")
        if "is_active" in request.data:
            user.is_active = bool(request.data["is_active"])
            fields_updated.append("is_active")
        if "password" in request.data and request.data["password"]:
            user.set_password(str(request.data["password"]))
            fields_updated.append("password")

        if fields_updated:
            user.save()

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
                "is_active": user.is_active,
                "date_joined": user.date_joined,
                "last_login": user.last_login,
            }
        )

    def delete(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        if user == request.user:
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_403_FORBIDDEN,
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Session Management ─────────────────────────────────────────────────────────

class AdminSessionListView(APIView):
    """GET /api/v1/admin/sessions/ — list all device sessions."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        active_only = request.query_params.get("active") == "true"
        sessions = DeviceSession.objects.all().order_by("-created_at")
        if active_only:
            sessions = sessions.filter(is_active=True)
        serializer = DeviceSessionSerializer(sessions, many=True)
        return Response(serializer.data)


class AdminSessionDetailView(APIView):
    """GET/DELETE /api/v1/admin/sessions/<pk>/ — inspect or deactivate a session."""
    permission_classes = [IsAdminUser]

    def _get_session(self, pk):
        try:
            return DeviceSession.objects.get(pk=pk)
        except DeviceSession.DoesNotExist:
            return None

    def get(self, request, pk):
        session = self._get_session(pk)
        if not session:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(DeviceSessionSerializer(session).data)

    def delete(self, request, pk):
        session = self._get_session(pk)
        if not session:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
        session.is_active = False
        session.save(update_fields=["is_active"])
        return Response({"detail": "Session deactivated."}, status=status.HTTP_200_OK)


# ── Presentation Management ────────────────────────────────────────────────────

class AdminPresentationListView(APIView):
    """GET /api/v1/admin/presentations/ — list all presentations."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get("status", "").strip()
        search = request.query_params.get("search", "").strip()
        presentations = Presentation.objects.select_related("uploaded_by", "session").order_by(
            "-uploaded_at"
        )
        if status_filter:
            presentations = presentations.filter(status=status_filter)
        if search:
            presentations = presentations.filter(title__icontains=search)
        serializer = PresentationSerializer(presentations, many=True, context={"request": request})
        return Response(serializer.data)


class AdminPresentationDetailView(APIView):
    """GET/DELETE /api/v1/admin/presentations/<uuid:pk>/"""
    permission_classes = [IsAdminUser]

    def _get_presentation(self, pk):
        try:
            return Presentation.objects.get(pk=pk)
        except Presentation.DoesNotExist:
            return None

    def get(self, request, pk):
        presentation = self._get_presentation(pk)
        if not presentation:
            return Response({"detail": "Presentation not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = PresentationSerializer(presentation, context={"request": request})
        return Response(serializer.data)

    def delete(self, request, pk):
        presentation = self._get_presentation(pk)
        if not presentation:
            return Response({"detail": "Presentation not found."}, status=status.HTTP_404_NOT_FOUND)
        presentation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
