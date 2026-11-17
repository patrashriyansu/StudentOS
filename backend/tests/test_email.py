import asyncio

from backend.core import email as email_service


def test_missing_email_settings_lists_resend_requirements(monkeypatch) -> None:
    monkeypatch.setattr(email_service.settings, "RESEND_API_KEY", "")
    monkeypatch.setattr(email_service.settings, "EMAIL_FROM", "")

    assert email_service.missing_email_settings() == ["RESEND_API_KEY", "EMAIL_FROM"]
    assert email_service.email_delivery_configured() is False


def test_send_email_uses_resend_https_api(monkeypatch) -> None:
    captured: dict = {}

    class FakeResponse:
        is_error = False

    class FakeAsyncClient:
        def __init__(self, *, timeout):
            captured["timeout"] = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, *, headers, json):
            captured["url"] = url
            captured["headers"] = headers
            captured["payload"] = json
            return FakeResponse()

    monkeypatch.setattr(email_service.settings, "RESEND_API_KEY", "re_test_key")
    monkeypatch.setattr(email_service.settings, "EMAIL_FROM", "StudentOS <noreply@example.com>")
    monkeypatch.setattr(email_service.httpx, "AsyncClient", FakeAsyncClient)

    asyncio.run(email_service.send_email("student@example.com", "Test subject", "Test body"))

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["headers"]["Authorization"] == "Bearer re_test_key"
    assert captured["headers"]["User-Agent"] == "StudentOS/1.0"
    assert captured["payload"] == {
        "from": "StudentOS <noreply@example.com>",
        "to": ["student@example.com"],
        "subject": "Test subject",
        "text": "Test body",
    }


def test_send_email_reports_provider_http_errors_without_leaking_key(monkeypatch) -> None:
    class FakeResponse:
        is_error = True
        status_code = 401

    class FakeAsyncClient:
        def __init__(self, *, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, *, headers, json):
            return FakeResponse()

    monkeypatch.setattr(email_service.settings, "RESEND_API_KEY", "re_test_secret")
    monkeypatch.setattr(email_service.settings, "EMAIL_FROM", "StudentOS <noreply@example.com>")
    monkeypatch.setattr(email_service.httpx, "AsyncClient", FakeAsyncClient)

    try:
        asyncio.run(email_service.send_email("student@example.com", "Test", "Body"))
    except RuntimeError as exc:
        assert "HTTP 401" in str(exc)
        assert "re_test_secret" not in str(exc)
    else:
        raise AssertionError("Expected a provider failure to be reported")
