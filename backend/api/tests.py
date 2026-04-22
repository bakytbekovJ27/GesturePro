from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DeviceSession, Presentation


User = get_user_model()


class MobileApiTests(APITestCase):
    def setUp(self):
        self.session = DeviceSession.objects.create(pin_code="123456")

    def register_user(
        self,
        username="demo",
        email="demo@example.com",
        password="secret123",
    ):
        response = self.client.post(
            reverse("auth-register"),
            {
                "username": username,
                "email": email,
                "password": password,
                "password_confirm": password,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data

    def login_user(self, username="demo", password="secret123"):
        response = self.client.post(
            reverse("auth-login"),
            {
                "username": username,
                "password": password,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    def auth_headers(self, access_token, session_token=None):
        headers = {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}
        if session_token:
            headers["HTTP_X_SESSION_TOKEN"] = session_token
        return headers

    def upload_pdf(self, access_token, session_token, filename):
        response = self.client.post(
            reverse("presentation-upload"),
            {"file": SimpleUploadedFile(filename, b"%PDF-1.4 fake pdf", content_type="application/pdf")},
            format="multipart",
            **self.auth_headers(access_token, session_token),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response

    def test_register_creates_user_and_returns_tokens(self):
        response_data = self.register_user()

        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(response_data["user"]["username"], "demo")
        self.assertTrue(response_data["tokens"]["access"])
        self.assertTrue(response_data["tokens"]["refresh"])

    def test_login_succeeds_and_invalid_credentials_fail(self):
        self.register_user()

        success = self.client.post(
            reverse("auth-login"),
            {"username": "demo", "password": "secret123"},
            format="json",
        )
        failure = self.client.post(
            reverse("auth-login"),
            {"username": "demo", "password": "wrong-password"},
            format="json",
        )

        self.assertEqual(success.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", success.data)
        self.assertEqual(failure.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(failure.data["detail"][0], "Неверный username или пароль.")

    def test_me_returns_authenticated_user(self):
        registered = self.register_user()
        response = self.client.get(
            reverse("auth-me"),
            **self.auth_headers(registered["tokens"]["access"]),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "demo")
        self.assertEqual(response.data["email"], "demo@example.com")

    def test_upload_requires_jwt_auth(self):
        response = self.client.post(
            reverse("presentation-upload"),
            {"file": SimpleUploadedFile("deck.pdf", b"%PDF", content_type="application/pdf")},
            format="multipart",
            HTTP_X_SESSION_TOKEN=str(self.session.access_token),
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_requires_valid_session_token(self):
        registered = self.register_user()
        response = self.client.post(
            reverse("presentation-upload"),
            {"file": SimpleUploadedFile("deck.pdf", b"%PDF", content_type="application/pdf")},
            format="multipart",
            **self.auth_headers(registered["tokens"]["access"]),
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["detail"], "Требуется активная desktop-сессия.")

    def test_history_returns_multiple_uploaded_presentations_for_current_user(self):
        registered = self.register_user()
        access_token = registered["tokens"]["access"]
        session_token = str(self.session.access_token)

        self.upload_pdf(access_token, session_token, "presentation-a.pdf")
        self.upload_pdf(access_token, session_token, "presentation-b.pdf")

        response = self.client.get(
            reverse("presentation-recent"),
            **self.auth_headers(access_token),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["title"], "presentation-b.pdf")
        self.assertEqual(response.data[1]["title"], "presentation-a.pdf")

    def test_other_user_cannot_view_or_reuse_foreign_presentation(self):
        first_user = self.register_user()
        presentation_response = self.upload_pdf(
            first_user["tokens"]["access"],
            str(self.session.access_token),
            "owner-only.pdf",
        )
        presentation_id = presentation_response.data["id"]

        second_session = DeviceSession.objects.create(pin_code="654321")
        self.register_user(username="other", email="other@example.com")
        login = self.login_user(username="other")

        detail_response = self.client.get(
            reverse("presentation-status", kwargs={"presentation_id": presentation_id}),
            **self.auth_headers(login["tokens"]["access"]),
        )
        reuse_response = self.client.post(
            reverse("presentation-reuse", kwargs={"presentation_id": presentation_id}),
            {},
            format="json",
            **self.auth_headers(login["tokens"]["access"], str(second_session.access_token)),
        )

        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(reuse_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reuse_requires_owner_and_active_session(self):
        registered = self.register_user()
        presentation_response = self.upload_pdf(
            registered["tokens"]["access"],
            str(self.session.access_token),
            "reusable.pdf",
        )
        presentation_id = presentation_response.data["id"]
        second_session = DeviceSession.objects.create(pin_code="112233")

        missing_session_response = self.client.post(
            reverse("presentation-reuse", kwargs={"presentation_id": presentation_id}),
            {},
            format="json",
            **self.auth_headers(registered["tokens"]["access"]),
        )
        success_response = self.client.post(
            reverse("presentation-reuse", kwargs={"presentation_id": presentation_id}),
            {},
            format="json",
            **self.auth_headers(registered["tokens"]["access"], str(second_session.access_token)),
        )

        self.assertEqual(missing_session_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(success_response.status_code, status.HTTP_200_OK)

        presentation = Presentation.objects.get(id=presentation_id)
        self.assertEqual(presentation.uploaded_by.username, "demo")
        self.assertEqual(presentation.session_id, second_session.id)
        self.assertEqual(success_response.data["status"], Presentation.STATUS_READY)

    def test_desktop_ready_event_returns_presented_presentation_to_ready(self):
        registered = self.register_user()
        presentation_response = self.upload_pdf(
            registered["tokens"]["access"],
            str(self.session.access_token),
            "live-deck.pdf",
        )
        presentation_id = presentation_response.data["id"]
        presentation = Presentation.objects.get(id=presentation_id)
        presentation.status = Presentation.STATUS_PRESENTING
        presentation.save(update_fields=["status", "updated_at"])

        response = self.client.post(
            reverse("presentation-desktop-event", kwargs={"presentation_id": presentation_id}),
            {
                "pin_code": self.session.pin_code,
                "event": "ready",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        presentation.refresh_from_db()
        self.assertEqual(presentation.status, Presentation.STATUS_READY)
        self.assertEqual(response.data["status"], Presentation.STATUS_READY)

    def test_reuse_same_presentation_refreshes_last_sent_at_and_latest_order(self):
        registered = self.register_user()
        access_token = registered["tokens"]["access"]
        session_token = str(self.session.access_token)

        first_response = self.upload_pdf(access_token, session_token, "first.pdf")
        second_response = self.upload_pdf(access_token, session_token, "second.pdf")
        first_id = first_response.data["id"]
        second_id = second_response.data["id"]

        first_presentation = Presentation.objects.get(id=first_id)
        previous_last_sent_at = first_presentation.last_sent_at
        first_presentation.status = Presentation.STATUS_PRESENTING
        first_presentation.save(update_fields=["status", "updated_at"])

        ready_response = self.client.post(
            reverse("presentation-desktop-event", kwargs={"presentation_id": first_id}),
            {
                "pin_code": self.session.pin_code,
                "event": "ready",
            },
            format="json",
        )
        self.assertEqual(ready_response.status_code, status.HTTP_200_OK)

        reuse_response = self.client.post(
            reverse("presentation-reuse", kwargs={"presentation_id": first_id}),
            {},
            format="json",
            **self.auth_headers(access_token, session_token),
        )

        self.assertEqual(reuse_response.status_code, status.HTTP_200_OK)

        first_presentation.refresh_from_db()
        second_presentation = Presentation.objects.get(id=second_id)

        self.assertEqual(first_presentation.status, Presentation.STATUS_READY)
        self.assertGreater(first_presentation.last_sent_at, previous_last_sent_at)
        self.assertLessEqual(second_presentation.last_sent_at, timezone.now())

        latest_response = self.client.get(
            reverse("presentation-latest"),
            {"pin": self.session.pin_code},
        )
        self.assertEqual(latest_response.status_code, status.HTTP_200_OK)
        self.assertEqual(latest_response.data["id"], first_id)
