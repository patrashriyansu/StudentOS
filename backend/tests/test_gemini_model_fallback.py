import asyncio
from types import SimpleNamespace

from backend.ai import gemini_service


class ModelNotAvailable(Exception):
    code = 404


class AsyncPager:
    def __init__(self, models):
        self.models = iter(models)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self.models)
        except StopIteration:
            raise StopAsyncIteration


class FakeTypes:
    @staticmethod
    def ThinkingConfig(**kwargs):
        return kwargs


class FakeModels:
    def __init__(self, listed_models):
        self.listed_models = listed_models
        self.generate_calls = []
        self.list_calls = 0

    async def list(self):
        self.list_calls += 1
        return AsyncPager(self.listed_models)

    async def generate_content(self, *, model, contents, config):
        self.generate_calls.append((model, contents, config))
        if model == "gemini-3.8-flash":
            raise ModelNotAvailable("404 model not found")
        return SimpleNamespace(text=f"generated with {model}")


class FakeClient:
    def __init__(self, listed_models):
        self.models = FakeModels(listed_models)


def test_uses_a_model_exposed_by_the_current_api_key_and_caches_it(monkeypatch):
    monkeypatch.setattr(gemini_service.settings, "GEMINI_MODEL", "gemini-3.8-flash")
    monkeypatch.setattr(gemini_service, "_active_gemini_model", None)
    client = FakeClient([
        SimpleNamespace(name="models/gemini-2.5-flash", supported_actions=["generateContent"]),
        SimpleNamespace(name="models/text-embedding-004", supported_actions=["embedContent"]),
    ])

    first = asyncio.run(gemini_service._generate_content_with_model_fallback(
        client, FakeTypes, "Explain binary search", "Be concise"
    ))
    second = asyncio.run(gemini_service._generate_content_with_model_fallback(
        client, FakeTypes, "Explain recursion", "Be concise"
    ))

    assert first.text == "generated with gemini-2.5-flash"
    assert second.text == "generated with gemini-2.5-flash"
    assert [call[0] for call in client.models.generate_calls] == [
        "gemini-3.8-flash",
        "gemini-2.5-flash",
        "gemini-2.5-flash",
    ]
    assert client.models.list_calls == 1
    assert client.models.generate_calls[1][2]["temperature"] == 0.35
    assert "thinking_config" not in client.models.generate_calls[1][2]


def test_does_not_select_a_model_without_generate_content_support():
    assert gemini_service._select_fallback_model(
        "gemini-3.8-flash",
        {"text-embedding-004"},
    ) is None
