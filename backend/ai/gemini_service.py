"""Google Gen AI service used by StudentOS's academic assistant."""
import asyncio
import json
import logging
import re
from typing import Any

from fastapi import HTTPException

from backend.core.config import settings

logger = logging.getLogger(__name__)
GEMINI_REQUEST_TIMEOUT_SECONDS = 45.0
GEMINI_MAX_CONCURRENT_REQUESTS = 5
GEMINI_QUEUE_TIMEOUT_SECONDS = 20.0
# Bound simultaneous provider calls per worker without sharing student request state.
_gemini_semaphore = asyncio.Semaphore(GEMINI_MAX_CONCURRENT_REQUESTS)


def gemini_is_configured() -> bool:
    return bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())


async def _generate_text(
    prompt: str,
    system_hint: str = "",
    *,
    json_response: bool = False,
    thinking_level: str = "low",
) -> str:
    if not gemini_is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI is not configured yet. Add GEMINI_API_KEY to the backend environment and redeploy.",
        )

    try:
        from google import genai
        from google.genai import types

        config: dict[str, Any] = {"max_output_tokens": 8192}
        if not settings.GEMINI_MODEL.startswith("gemini-3"):
            config["temperature"] = 0.35
        if system_hint:
            config["system_instruction"] = system_hint
        if json_response:
            config["response_mime_type"] = "application/json"
        # Gemini 3 models default to medium thinking. Use low for routine
        # study tasks and let the chat route request more reasoning when needed.
        if settings.GEMINI_MODEL.startswith("gemini-3"):
            config["thinking_config"] = types.ThinkingConfig(thinking_level=thinking_level)

        try:
            await asyncio.wait_for(_gemini_semaphore.acquire(), timeout=GEMINI_QUEUE_TIMEOUT_SECONDS)
        except asyncio.TimeoutError as exc:
            raise HTTPException(
                status_code=503,
                detail="StudentOS AI is busy serving other students. Please retry in a few seconds.",
                headers={"Retry-After": "10"},
            ) from exc
        try:
            async with genai.Client(api_key=settings.GEMINI_API_KEY).aio as client:
                response = await asyncio.wait_for(
                    client.models.generate_content(
                        model=settings.GEMINI_MODEL,
                        contents=prompt,
                        config=config,
                    ),
                    timeout=GEMINI_REQUEST_TIMEOUT_SECONDS,
                )
        finally:
            _gemini_semaphore.release()

        output = (response.text or "").strip()
        if not output:
            raise ValueError("The model returned an empty response.")
        return output
    except asyncio.TimeoutError as exc:
        logger.warning("Gemini request timed out after %.0f seconds", GEMINI_REQUEST_TIMEOUT_SECONDS)
        raise HTTPException(
            status_code=504,
            detail="Gemini is taking too long to respond. Please try a shorter question or retry.",
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Gemini request failed")
        message = str(exc).lower()
        if "api key" in message or "unauthorized" in message or "permission" in message:
            detail = "Gemini rejected the configured API key. Check GEMINI_API_KEY in the backend environment."
        elif "quota" in message or "rate limit" in message or "resource_exhausted" in message:
            detail = "The Gemini API quota or rate limit has been reached. Check your Google AI Studio project and try again."
        elif "not found" in message or "model" in message:
            detail = f"The configured Gemini model ({settings.GEMINI_MODEL}) is unavailable to this API key. Check GEMINI_MODEL and model access."
        else:
            detail = "Gemini could not complete the request. Please try again in a moment."
        raise HTTPException(status_code=502, detail=detail) from exc


async def ask_gemini(
    prompt: str,
    system_hint: str = "",
    *,
    thinking_level: str = "low",
) -> str:
    """Generate a normal text response from Gemini."""
    return await _generate_text(prompt, system_hint, thinking_level=thinking_level)


async def ask_gemini_json(prompt: str, system_hint: str = "") -> dict | list:
    """Generate and parse JSON, rejecting malformed model output instead of inventing data."""
    output = await _generate_text(
        prompt,
        system_hint,
        json_response=True,
        thinking_level="low",
    )
    cleaned = re.sub(r"^\s*\x60{3}(?:json)?\s*|\s*\x60{3}\s*$", "", output, flags=re.IGNORECASE).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        for index, character in enumerate(cleaned):
            if character in "{[":
                try:
                    value, _ = decoder.raw_decode(cleaned[index:])
                    return value
                except json.JSONDecodeError:
                    continue

    raise HTTPException(
        status_code=502,
        detail="Gemini returned an invalid structured response. Please try generating it again.",
    )
