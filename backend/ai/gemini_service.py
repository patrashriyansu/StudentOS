"""Reliable server-side AI provider abstraction for StudentOS."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from fastapi import HTTPException
from backend.core.config import settings

logger = logging.getLogger("studentos.ai")
_gemini_client: Any | None = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


async def _generate_with_gemini(prompt: str, system_hint: str, json_response: bool) -> str:
    from google.genai import types

    config_args: dict[str, Any] = {
        "system_instruction": system_hint or None,
        "temperature": 0.35,
        "max_output_tokens": 4096,
    }
    if json_response:
        config_args["response_mime_type"] = "application/json"

    response = await _get_gemini_client().aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(**config_args),
    )
    text = response.text
    if not text or not text.strip():
        raise RuntimeError("The Gemini provider returned an empty response.")
    return text.strip()


async def _generate_with_openai(prompt: str, system_hint: str, json_response: bool) -> str:
    from openai import AsyncOpenAI

    messages = []
    if system_hint:
        messages.append({"role": "system", "content": system_hint})
    messages.append({"role": "user", "content": prompt})

    async with AsyncOpenAI(api_key=settings.OPENAI_API_KEY) as client:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.35,
            max_tokens=4096,
            response_format={"type": "json_object"} if json_response else None,
        )
    text = response.choices[0].message.content
    if not text or not text.strip():
        raise RuntimeError("The OpenAI provider returned an empty response.")
    return text.strip()


async def ask_gemini(prompt: str, system_hint: str = "", *, json_response: bool = False) -> str:
    """Generate a real response, trying Gemini first and OpenAI as an optional fallback."""
    providers = []
    if settings.GEMINI_API_KEY:
        providers.append(("Gemini", _generate_with_gemini))
    if settings.OPENAI_API_KEY:
        providers.append(("OpenAI", _generate_with_openai))

    if not providers:
        raise HTTPException(
            status_code=503,
            detail="AI is not configured yet. Add GEMINI_API_KEY (recommended) or OPENAI_API_KEY to the backend environment.",
        )

    errors: list[str] = []
    for name, generate in providers:
        try:
            return await generate(prompt, system_hint, json_response)
        except Exception as exc:
            logger.warning("%s request failed (%s).", name, type(exc).__name__)
            errors.append(name)

    logger.error("All configured AI providers failed: %s", ", ".join(errors))
    raise HTTPException(
        status_code=502,
        detail="The AI provider is temporarily unavailable. Check the configured API key, model access and provider quota, then try again.",
    )


async def ask_gemini_json(prompt: str, system_hint: str = "") -> dict | list:
    """Request and parse JSON; never substitute fabricated content."""
    raw = await ask_gemini(prompt, system_hint, json_response=True)
    cleaned = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", raw.strip(), flags=re.IGNORECASE)
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError:
        starts = [pos for pos in (cleaned.find("{"), cleaned.find("[")) if pos >= 0]
        if not starts:
            raise HTTPException(status_code=502, detail="The AI returned invalid structured data. Please try again.")
        try:
            value, _ = json.JSONDecoder().raw_decode(cleaned[min(starts):])
        except json.JSONDecodeError:
            raise HTTPException(status_code=502, detail="The AI returned invalid structured data. Please try again.")
    if not isinstance(value, (dict, list)):
        raise HTTPException(status_code=502, detail="The AI returned an unexpected response format. Please try again.")
    return value
