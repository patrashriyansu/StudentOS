import os
import sys
import time
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{Path('test_studentos_auth.db').absolute().as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-for-auth-tests"
os.environ["SEED_DEMO_DATA"] = "false"

from fastapi.testclient import TestClient
from backend.main import app
from backend.auth.routes import limiter as auth_limiter

auth_limiter.enabled = False


def wait_until_ready(client: TestClient) -> None:
    for _ in range(50):
        response = client.get("/ready")
        if response.status_code == 200:
            return
        time.sleep(0.1)
    raise AssertionError(client.get("/ready").text)


def test_wellness_history_uses_saved_logs_and_validates_ranges() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        email = f"wellness-{uuid4().hex[:10]}@example.com"
        registered = client.post(
            "/api/v1/auth/register",
            json={"name": "Wellness Test", "email": email, "password": "Password1!", "role": "student"},
        )
        assert registered.status_code == 201
        headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}

        invalid_mood = client.post("/api/v1/wellness/mood", headers=headers, json={"mood_score": 6})
        assert invalid_mood.status_code == 422

        assert client.post("/api/v1/wellness/mood", headers=headers, json={"mood_score": 5}).status_code == 200
        assert client.post("/api/v1/wellness/sleep", headers=headers, json={"hours": 8}).status_code == 200
        assert client.post("/api/v1/wellness/water", headers=headers, json={"glasses": 8, "goal": 8}).status_code == 200

        history = client.get("/api/v1/wellness/history?days=7", headers=headers)
        assert history.status_code == 200
        today = history.json()["history"][-1]
        assert today["mood_score"] == 5
        assert today["sleep_hours"] == 8
        assert today["water_glasses"] == 8
        assert today["score"] == 100
        assert today["tracked_metrics"] == 3

        score = client.get("/api/v1/wellness/score", headers=headers)
        assert score.status_code == 200
        assert score.json()["overall_score"] == 100
