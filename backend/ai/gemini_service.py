"""Google Gen AI service used by StudentOS's academic assistant."""
import json
import logging
import re
from typing import Any

from fastapi import HTTPException

from backend.core.config import settings

logger = logging.getLogger(__name__)


def gemini_is_configured() -> bool:
    return bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())


async def _generate_text(
    prompt: str,
    system_hint: str = "",
    *,
    json_response: bool = False,
) -> str:
    if not gemini_is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI is not configured yet. Add GEMINI_API_KEY to the backend environment and redeploy.",
        )

    try:
        from google import genai

        config: dict[str, Any] = {
            "temperature": 0.35,
            "max_output_tokens": 8192,
        }
        if system_hint:
            config["system_instruction"] = system_hint
        if json_response:
            config["response_mime_type"] = "application/json"

        # Use the SDK's native async client so model calls do not block FastAPI.
        async with genai.Client(api_key=settings.GEMINI_API_KEY).aio as client:
            response = await client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=config,
            )

        output = (response.text or "").strip()
        if not output:
            raise ValueError("The model returned an empty response.")
        return output
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


async def ask_gemini(prompt: str, system_hint: str = "") -> str:
    """Generate a normal text response from Gemini."""
    return await _generate_text(prompt, system_hint)


async def ask_gemini_json(prompt: str, system_hint: str = "") -> dict | list:
    """Generate and parse JSON, rejecting malformed model output instead of inventing data."""
    output = await _generate_text(prompt, system_hint, json_response=True)
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
