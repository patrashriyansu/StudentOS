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


def test_chat_messages_persist_and_next_turn_uses_saved_history(monkeypatch) -> None:
    prompts = []

    async def fake_ask_gemini(prompt: str, system: str, thinking_level: str = "low") -> str:
        prompts.append(prompt)
        return "A breadth-first search explores neighbours level by level."

    monkeypatch.setattr("backend.ai.routes.ask_gemini", fake_ask_gemini)

    with TestClient(app) as client:
        wait_until_ready(client)
        owner = register_student(client)
        created = client.post("/api/v1/ai/conversations", headers=owner, json={"title": "New conversation"})
        assert created.status_code == 201, created.text
        conversation_id = created.json()["id"]

        first = client.post("/api/v1/ai/chat", headers=owner, json={
            "message": "What is BFS?",
            "conversation_id": conversation_id,
        })
        assert first.status_code == 200, first.text
        assert first.json()["conversation_id"] == conversation_id

        second = client.post("/api/v1/ai/chat", headers=owner, json={
            "message": "What is its time complexity?",
            "conversation_id": conversation_id,
        })
        assert second.status_code == 200, second.text
        assert "What is BFS?" in prompts[1]
        assert "level by level" in prompts[1]

        detail = client.get(f"/api/v1/ai/conversations/{conversation_id}", headers=owner)
        assert detail.status_code == 200
        assert [item["role"] for item in detail.json()["messages"]] == ["user", "assistant", "user", "assistant"]
        assert detail.json()["title"] == "What is BFS?"
        assert detail.json()["message_count"] == 4


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
