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
