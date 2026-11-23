import os
import sys
import time
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
DB_PATH = Path("test_studentos_auth.db").absolute()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{DB_PATH.as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-for-chat-tests"
os.environ["SEED_DEMO_DATA"] = "false"

from fastapi.testclient import TestClient
from backend.main import app


def wait_until_ready(client: TestClient) -> None:
    for _ in range(50):
        response = client.get("/ready")
        if response.status_code == 200:
            return
        time.sleep(0.1)
    raise AssertionError(client.get("/ready").text)


def register_student(client: TestClient) -> dict[str, str]:
    response = client.post("/api/v1/auth/register", json={
        "name": "Chat History Test Student",
        "email": f"chat-{uuid4().hex[:10]}@example.com",
        "password": "Password1!",
        "role": "student",
    })
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_conversation_history_is_private_and_deletable() -> None:
    with TestClient(app) as client:
        wait_until_ready(client)
        owner = register_student(client)
        other = register_student(client)

        created = client.post("/api/v1/ai/conversations", headers=owner, json={"title": "Graph algorithms"})
        assert created.status_code == 201, created.text
        conversation_id = created.json()["id"]

        listing = client.get("/api/v1/ai/conversations", headers=owner)
        assert listing.status_code == 200
        assert any(item["id"] == conversation_id for item in listing.json())

        detail = client.get(f"/api/v1/ai/conversations/{conversation_id}", headers=owner)
        assert detail.status_code == 200
        assert detail.json()["messages"] == []

        hidden = client.get(f"/api/v1/ai/conversations/{conversation_id}", headers=other)
        assert hidden.status_code == 404
        forbidden_delete = client.delete(f"/api/v1/ai/conversations/{conversation_id}", headers=other)
        assert forbidden_delete.status_code == 404

        deleted = client.delete(f"/api/v1/ai/conversations/{conversation_id}", headers=owner)
        assert deleted.status_code == 200
        missing = client.get(f"/api/v1/ai/conversations/{conversation_id}", headers=owner)
        assert missing.status_code == 404
