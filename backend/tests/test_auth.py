import os
import sys
import time
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{Path('test_studentos_auth.db').absolute().as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-for-auth-tests"
os.environ["SEED_DEMO_DATA"] = "false"

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from jose import jwt

from backend.core.config import settings
from backend.main import app
from backend.auth.routes import limiter as auth_limiter

auth_limiter.enabled = False


def unique_email() -> str:
    return f"student-{uuid4().hex[:10]}@example.com"


def wait_until_ready(client: TestClient) -> None:
    for _ in range(50):
        response = client.get("/ready")
        if response.status_code == 200:
            return
        time.sleep(0.1)
    raise AssertionError(client.get("/ready").text)


def register_user(client: TestClient, email: str | None = None, password: str = "Password1!") -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Test Student",
            "email": email or unique_email(),
            "password": password,
            "role": "student",
        },
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "password" not in data
    return data


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_login_refresh_and_protected_route() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        email = unique_email()
        tokens = register_user(client, email=email)

        me = client.get("/api/v1/auth/me", headers=auth_headers(tokens["access_token"]))
        assert me.status_code == 200
        assert me.json()["email"] == email

        login = client.post("/api/v1/auth/login", json={"email": email, "password": "Password1!"})
        assert login.status_code == 200

        refresh = client.post("/api/v1/auth/refresh", headers=auth_headers(login.json()["refresh_token"]))
        assert refresh.status_code == 200

        profile = client.get("/api/v1/users/profile", headers=auth_headers(refresh.json()["access_token"]))
        assert profile.status_code == 200


def test_duplicate_registration_returns_conflict() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        email = unique_email()
        register_user(client, email=email)
        duplicate = client.post(
            "/api/v1/auth/register",
            json={"name": "Test Student", "email": email, "password": "Password1!", "role": "student"},
        )
        assert duplicate.status_code == 409
        assert duplicate.json()["detail"] == "Email already registered"


def test_registration_validation_errors() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        invalid_email = client.post(
            "/api/v1/auth/register",
            json={"name": "Test Student", "email": "not-an-email", "password": "Password1!", "role": "student"},
        )
        assert invalid_email.status_code == 422

        weak_password = client.post(
            "/api/v1/auth/register",
            json={"name": "Test Student", "email": unique_email(), "password": "password", "role": "student"},
        )
        assert weak_password.status_code == 422

        empty_name = client.post(
            "/api/v1/auth/register",
            json={"name": " ", "email": unique_email(), "password": "Password1!", "role": "student"},
        )
        assert empty_name.status_code == 422


def test_login_errors() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        email = unique_email()
        register_user(client, email=email)

        wrong_password = client.post("/api/v1/auth/login", json={"email": email, "password": "Wrong1!"})
        assert wrong_password.status_code == 401
        assert wrong_password.json()["detail"] == "Invalid email or password"

        unknown_email = client.post("/api/v1/auth/login", json={"email": unique_email(), "password": "Password1!"})
        assert unknown_email.status_code == 401

        empty_fields = client.post("/api/v1/auth/login", json={"email": "", "password": ""})
        assert empty_fields.status_code == 422


def test_token_errors_and_refresh_token_type() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        tokens = register_user(client)

        missing = client.get("/api/v1/auth/me")
        assert missing.status_code == 401

        invalid = client.get("/api/v1/auth/me", headers=auth_headers("not-a-token"))
        assert invalid.status_code == 401

        expired_token = jwt.encode(
            {"sub": "1", "type": "access", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
        expired = client.get("/api/v1/auth/me", headers=auth_headers(expired_token))
        assert expired.status_code == 401

        access_token_as_refresh = client.post("/api/v1/auth/refresh", headers=auth_headers(tokens["access_token"]))
        assert access_token_as_refresh.status_code == 401



def test_password_reset_after_otp_verification(monkeypatch) -> None:
    from backend.auth import routes as auth_routes

    sent_codes: list[str] = []

    async def fake_send_otp_email(email: str, code: str, purpose) -> None:
        sent_codes.append(code)

    monkeypatch.setattr(auth_routes, "email_delivery_configured", lambda: True)
    monkeypatch.setattr(auth_routes, "send_otp_email", fake_send_otp_email)

    with TestClient(app) as client:
        wait_until_ready(client)
        email = unique_email()
        register_user(client, email=email)

        sent = client.post("/api/v1/auth/send-otp", json={"email": email, "purpose": "password_reset"})
        assert sent.status_code == 200
        assert len(sent_codes) == 1

        code = sent_codes[0]
        verified = client.post(
            "/api/v1/auth/verify-otp",
            json={"email": email, "code": code, "purpose": "password_reset"},
        )
        assert verified.status_code == 200

        reset = client.post(
            "/api/v1/auth/reset-password",
            json={"email": email, "code": code, "new_password": "NewPassword2!"},
        )
        assert reset.status_code == 200

        login = client.post("/api/v1/auth/login", json={"email": email, "password": "NewPassword2!"})
        assert login.status_code == 200

        reused = client.post(
            "/api/v1/auth/reset-password",
            json={"email": email, "code": code, "new_password": "AnotherPassword3!"},
        )
        assert reused.status_code == 400


def test_avatar_upload_is_validated_and_persisted() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        tokens = register_user(client)
        headers = auth_headers(tokens["access_token"])

        invalid = client.post(
            "/api/v1/users/upload-avatar",
            headers=headers,
            files={"file": ("avatar.txt", b"not an image", "text/plain")},
        )
        assert invalid.status_code == 415

        uploaded = client.post(
            "/api/v1/users/upload-avatar",
            headers=headers,
            files={"file": ("avatar.jpg", bytes([255, 216, 255, 217]), "image/jpeg")},
        )
        assert uploaded.status_code == 200
        profile = client.get("/api/v1/auth/me", headers=headers)
        assert profile.status_code == 200
        assert profile.json()["avatar"].startswith("data:image/jpeg;base64,")



def test_google_login_creates_account_and_returns_studentos_tokens(monkeypatch) -> None:
    from backend.auth import routes as auth_routes

    monkeypatch.setattr(auth_routes.settings, "GOOGLE_CLIENT_ID", "test-google-client-id")

    async def fake_verify_google_id_token(id_token: str, client_id: str) -> dict:
        assert id_token == "g" * 100
        assert client_id == "test-google-client-id"
        return {
            "email": unique_email(),
            "email_verified": True,
            "name": "Google Student",
            "sub": f"google-{uuid4().hex}",
        }

    monkeypatch.setattr(auth_routes, "verify_google_id_token", fake_verify_google_id_token)

    with TestClient(app) as client:
        wait_until_ready(client)
        email = unique_email()
        async def identity(id_token: str, client_id: str) -> dict:
            return {"email": email, "email_verified": True, "name": "Google Student", "sub": "google-test-subject"}
        monkeypatch.setattr(auth_routes, "verify_google_id_token", identity)

        response = client.post("/api/v1/auth/google", json={"id_token": "g" * 100})
        assert response.status_code == 200, response.text
        tokens = response.json()
        assert tokens["access_token"]
        assert tokens["refresh_token"]

        me = client.get("/api/v1/auth/me", headers=auth_headers(tokens["access_token"]))
        assert me.status_code == 200
        assert me.json()["email"] == email
        assert me.json()["name"] == "Google Student"


def test_google_login_rejects_unverified_email(monkeypatch) -> None:
    from backend.auth import routes as auth_routes

    monkeypatch.setattr(auth_routes.settings, "GOOGLE_CLIENT_ID", "test-google-client-id")

    async def fake_verify_google_id_token(id_token: str, client_id: str) -> dict:
        return {
            "email": unique_email(),
            "email_verified": False,
            "name": "Unverified Student",
            "sub": "unverified-google-subject",
        }

    monkeypatch.setattr(auth_routes, "verify_google_id_token", fake_verify_google_id_token)

    with TestClient(app) as client:
        wait_until_ready(client)
        response = client.post("/api/v1/auth/google", json={"id_token": "g" * 100})
        assert response.status_code == 403
        assert "verified" in response.json()["detail"].lower()
