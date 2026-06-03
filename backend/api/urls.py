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

urlpatterns = [
    path("auth/register/", AuthRegisterView.as_view(), name="auth-register"),
    path("auth/login/", AuthLoginView.as_view(), name="auth-login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", AuthMeView.as_view(), name="auth-me"),
    path("session/create/", SessionCreateView.as_view(), name="session-create"),
    path("session/pair/", SessionPairView.as_view(), name="session-pair"),
    path("session/me/", SessionDetailView.as_view(), name="session-detail"),
    path("session/renew/", SessionRenewView.as_view(), name="session-renew"),
    path("session/close/", SessionDeactivateView.as_view(), name="session-close"),
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
]
