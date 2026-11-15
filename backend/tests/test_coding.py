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
from backend.coding import routes as coding_routes

auth_limiter.enabled = False


def wait_until_ready(client: TestClient) -> None:
    for _ in range(50):
        response = client.get("/ready")
        if response.status_code == 200:
            return
        time.sleep(0.1)
    raise AssertionError(client.get("/ready").text)


def test_leetcode_profile_url_is_normalized_and_public_stats_are_synced(monkeypatch) -> None:
    requested_handles: list[str] = []

    async def fake_fetch_stats(username: str) -> dict:
        requested_handles.append(username)
        return {
            "username": username,
            "total_problems_solved": 184,
            "easy_solved": 62,
            "medium_solved": 101,
            "hard_solved": 21,
            "total_contests": 8,
            "current_streak": 4,
            "rating": 1512,
            "ranking": 123456,
        }

    monkeypatch.setattr(coding_routes, "fetch_leetcode_public_stats", fake_fetch_stats)

    with TestClient(app) as client:
        wait_until_ready(client)
        email = f"leetcode-{uuid4().hex[:10]}@example.com"
        registered = client.post(
            "/api/v1/auth/register",
            json={"name": "Coding Test", "email": email, "password": "Password1!", "role": "student"},
        )
        assert registered.status_code == 201
        headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}

        connected = client.put(
            "/api/v1/coding/profile",
            headers=headers,
            json={
                "platform": "leetcode",
                "username": "https://leetcode.com/u/shriyansupatra/",
            },
        )
        assert connected.status_code == 200
        assert connected.json()["username"] == "shriyansupatra"

        synced = client.post("/api/v1/coding/leetcode/sync", headers=headers)
        assert synced.status_code == 200
        assert requested_handles == ["shriyansupatra"]
        assert synced.json()["profile"]["total_problems_solved"] == 184
        assert synced.json()["profile"]["easy_solved"] == 62
        assert synced.json()["profile"]["medium_solved"] == 101
        assert synced.json()["profile"]["hard_solved"] == 21
        assert synced.json()["profile"]["total_contests"] == 8
        assert synced.json()["profile"]["current_streak"] == 4
        assert synced.json()["profile"]["rating"] == 1512

        profile = client.get("/api/v1/coding/profile", headers=headers)
        assert profile.status_code == 200
        assert profile.json()["leetcode_username"] == "shriyansupatra"
        assert profile.json()["total_problems_solved"] == 184

        analytics = client.get("/api/v1/coding/analytics", headers=headers)
        assert analytics.status_code == 200
        assert analytics.json()["difficulty_breakdown"] == {"easy": 62, "medium": 101, "hard": 21}


def test_leetcode_rejects_profile_urls_from_other_domains() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        email = f"leetcode-invalid-{uuid4().hex[:10]}@example.com"
        registered = client.post(
            "/api/v1/auth/register",
            json={"name": "Coding Test", "email": email, "password": "Password1!", "role": "student"},
        )
        assert registered.status_code == 201
        headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}

        response = client.put(
            "/api/v1/coding/profile",
            headers=headers,
            json={"platform": "leetcode", "username": "https://example.com/u/shriyansupatra/"},
        )
        assert response.status_code == 422



def test_leetcode_graphql_response_maps_difficulty_counts() -> None:
    payload = {
        "data": {
            "matchedUser": {
                "username": "shriyansupatra",
                "profile": {"ranking": 123456},
                "submitStats": {
                    "acSubmissionNum": [
                        {"difficulty": "All", "count": 184, "submissions": 260},
                        {"difficulty": "Easy", "count": 62, "submissions": 80},
                        {"difficulty": "Medium", "count": 101, "submissions": 150},
                        {"difficulty": "Hard", "count": 21, "submissions": 30},
                    ]
                },
                "userCalendar": {"streak": 4, "totalActiveDays": 48},
            },
            "userContestRanking": {
                "attendedContestsCount": 8,
                "rating": 1512.4,
                "globalRanking": 12345,
            },
        }
    }

    stats = coding_routes.parse_leetcode_public_stats(payload, "shriyansupatra")

    assert stats["username"] == "shriyansupatra"
    assert stats["total_problems_solved"] == 184
    assert stats["easy_solved"] == 62
    assert stats["medium_solved"] == 101
    assert stats["hard_solved"] == 21
    assert stats["total_contests"] == 8
    assert stats["current_streak"] == 4
    assert stats["rating"] == 1512
    assert stats["ranking"] == 123456
