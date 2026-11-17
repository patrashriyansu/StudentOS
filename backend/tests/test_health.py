import asyncio

import pytest
from fastapi import HTTPException

from backend import main


def test_health_reports_unavailable_when_database_is_not_ready(monkeypatch) -> None:
    monkeypatch.setattr(main.app.state, "db_ready", False, raising=False)
    monkeypatch.setattr(main.app.state, "db_error", "database connection failed", raising=False)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.health())

    assert exc.value.status_code == 503
    assert exc.value.detail == "database connection failed"


def test_health_reports_healthy_only_after_database_is_ready(monkeypatch) -> None:
    monkeypatch.setattr(main.app.state, "db_ready", True, raising=False)
    monkeypatch.setattr(main.app.state, "db_error", None, raising=False)

    response = asyncio.run(main.health())

    assert response["status"] == "healthy"
    assert response["database_ready"] is True
    assert response["database_error"] is None
