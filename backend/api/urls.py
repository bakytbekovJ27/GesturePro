from django.urls import path

from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AuthLoginView,
    AuthMeView,
    AuthRegisterView,
    PresentationDesktopEventView,
    PresentationDownloadView,
    PresentationLatestView,
    PresentationRecentView,
    PresentationReuseView,
    PresentationStatusView,
    PresentationUploadView,
    SessionCreateView,
    SessionDeactivateView,
    SessionDetailView,
    SessionPairView,
    SessionRenewView,
)
from .admin_views import (
    AdminStatsView,
    AdminUserListView,
    AdminUserDetailView,
    AdminSessionListView,
    AdminSessionDetailView,
    AdminPresentationListView,
    AdminPresentationDetailView,
)

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path("auth/register/", AuthRegisterView.as_view(), name="auth-register"),
    path("auth/login/", AuthLoginView.as_view(), name="auth-login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", AuthMeView.as_view(), name="auth-me"),
    # ── Sessions ──────────────────────────────────────────────────────────────
    path("session/create/", SessionCreateView.as_view(), name="session-create"),
    path("session/pair/", SessionPairView.as_view(), name="session-pair"),
    path("session/me/", SessionDetailView.as_view(), name="session-detail"),
    path("session/renew/", SessionRenewView.as_view(), name="session-renew"),
    path("session/close/", SessionDeactivateView.as_view(), name="session-close"),
    # ── Presentations ─────────────────────────────────────────────────────────
    path("presentations/upload/", PresentationUploadView.as_view(), name="presentation-upload"),
    path("presentations/recent/", PresentationRecentView.as_view(), name="presentation-recent"),
    path(
        "presentations/status/<uuid:presentation_id>/",
        PresentationStatusView.as_view(),
        name="presentation-status",
    ),
    path(
        "presentations/<uuid:presentation_id>/reuse/",
        PresentationReuseView.as_view(),
        name="presentation-reuse",
    ),
    path(
        "presentations/<uuid:presentation_id>/desktop-event/",
        PresentationDesktopEventView.as_view(),
        name="presentation-desktop-event",
    ),
    path("presentations/latest/", PresentationLatestView.as_view(), name="presentation-latest"),
    path(
        "presentations/<uuid:presentation_id>/download/",
        PresentationDownloadView.as_view(),
        name="presentation-download",
    ),
    # ── Admin Panel API (is_staff required) ───────────────────────────────────
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("admin/users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("admin/sessions/", AdminSessionListView.as_view(), name="admin-session-list"),
    path("admin/sessions/<int:pk>/", AdminSessionDetailView.as_view(), name="admin-session-detail"),
    path("admin/presentations/", AdminPresentationListView.as_view(), name="admin-presentation-list"),
    path(
        "admin/presentations/<uuid:pk>/",
        AdminPresentationDetailView.as_view(),
        name="admin-presentation-detail",
    ),
]
