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
GEMINI_MODEL_FALLBACKS = (
    "gemini-4-hydrogen",
    "gemini-4-neon",
    "gemini-4-carbon",
    "gemini-4-argon",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
)
_active_gemini_model: tuple[str, str] | None = None


def _normalize_model_name(value: str) -> str:
    return value.removeprefix("models/").strip()


def _is_model_unavailable_error(exc: Exception) -> bool:
    status = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    message = str(exc).lower()
    if status == 404 or str(status) == "404":
        return True
    return "model" in message and any(
        phrase in message
        for phrase in ("not found", "not available", "not supported", "does not exist", "no access")
    )


def _generation_config(
    types: Any,
    model_name: str,
    system_hint: str,
    *,
    json_response: bool,
    thinking_level: str,
    temperature: float,
) -> dict[str, Any]:
    config: dict[str, Any] = {"max_output_tokens": 8192}
    if model_name.startswith(("gemini-3", "gemini-4")):
        config["thinking_config"] = types.ThinkingConfig(thinking_level=thinking_level)
    else:
        config["temperature"] = temperature
    if system_hint:
        config["system_instruction"] = system_hint
    if json_response:
        config["response_mime_type"] = "application/json"
    return config


async def _list_available_generate_content_models(client: Any) -> set[str]:
    """Return model IDs the configured API key can use for generateContent."""
    pager = await client.models.list()
    available: set[str] = set()

    def include(model: Any) -> None:
        name = _normalize_model_name(getattr(model, "name", "") or "")
        actions = getattr(model, "supported_actions", None)
        if not name.startswith("gemini-"):
            return
        if actions and not any(str(action).lower() == "generatecontent" for action in actions):
            return
        available.add(name)

    if hasattr(pager, "__aiter__"):
        async for model in pager:
            include(model)
    else:
        for model in pager:
            include(model)
    return available


def _select_fallback_model(configured_model: str, available_models: set[str]) -> str | None:
    configured = _normalize_model_name(configured_model)
    for candidate in GEMINI_MODEL_FALLBACKS:
        if candidate != configured and candidate in available_models:
            return candidate
    remaining = sorted(name for name in available_models if name != configured)
    return remaining[0] if remaining else None


async def _generate_content_with_model_fallback(
    client: Any,
    types: Any,
    contents: Any,
    system_hint: str = "",
    *,
    json_response: bool = False,
    thinking_level: str = "low",
    temperature: float = 0.35,
) -> Any:
    """Try the configured Gemini model, then discover an accessible fallback on model errors."""
    global _active_gemini_model
    configured_model = _normalize_model_name(settings.GEMINI_MODEL or "gemini-3.8-flash")
    model_to_use = configured_model
    if _active_gemini_model and _active_gemini_model[0] == configured_model:
        model_to_use = _active_gemini_model[1]

    async def generate(model_name: str) -> Any:
        return await client.models.generate_content(
            model=model_name,
            contents=contents,
            config=_generation_config(
                types,
                model_name,
                system_hint,
                json_response=json_response,
                thinking_level=thinking_level,
                temperature=temperature,
            ),
        )

    try:
        return await generate(model_to_use)
    except Exception as first_error:
        if not _is_model_unavailable_error(first_error):
            raise

        available_models = await _list_available_generate_content_models(client)
        fallback_model = _select_fallback_model(configured_model, available_models)
        if not fallback_model:
            _active_gemini_model = None
            raise RuntimeError(
                f"The configured Gemini model ({configured_model}) is unavailable and this API key "
                "does not list another model with generateContent access. Check that GEMINI_API_KEY "
                "belongs to a Google AI Studio project with Gemini Developer API access, then set "
                "GEMINI_MODEL to one of that key's listed models."
            ) from first_error

        logger.warning(
            "Configured Gemini model %s is unavailable; using accessible fallback %s",
            configured_model,
            fallback_model,
        )
        try:
            response = await generate(fallback_model)
        except Exception:
            _active_gemini_model = None
            raise
        _active_gemini_model = (configured_model, fallback_model)
        return response


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
                    _generate_content_with_model_fallback(
                        client,
                        types,
                        prompt,
                        system_hint,
                        json_response=json_response,
                        thinking_level=thinking_level,
                        temperature=0.35,
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


async def ask_gemini_image(prompt: str, data: bytes, mime_type: str) -> str:
    """Extract text from a user-owned image or PDF using Gemini multimodal input."""
    if not gemini_is_configured():
        raise HTTPException(
            status_code=503,
            detail="Image OCR needs Gemini. Add GEMINI_API_KEY to the backend environment and redeploy.",
        )
    if mime_type not in {"image/png", "image/jpeg", "image/webp", "application/pdf"}:
        raise HTTPException(status_code=415, detail="Unsupported file type for OCR.")

    try:
        from google import genai
        from google.genai import types

        try:
            await asyncio.wait_for(_gemini_semaphore.acquire(), timeout=GEMINI_QUEUE_TIMEOUT_SECONDS)
        except asyncio.TimeoutError as exc:
            raise HTTPException(
                status_code=503,
                detail="StudentOS AI is busy. Please retry OCR in a few seconds.",
                headers={"Retry-After": "10"},
            ) from exc
        try:
            image_part = types.Part.from_bytes(data=data, mime_type=mime_type)
            async with genai.Client(api_key=settings.GEMINI_API_KEY).aio as client:
                response = await asyncio.wait_for(
                    _generate_content_with_model_fallback(
                        client,
                        types,
                        [image_part, prompt],
                        thinking_level="low",
                        temperature=0.1,
                    ),
                    timeout=GEMINI_REQUEST_TIMEOUT_SECONDS,
                )
        finally:
            _gemini_semaphore.release()
        output = (response.text or "").strip()
        if not output:
            raise ValueError("The model returned no OCR text.")
        return output
    except HTTPException:
        raise
    except asyncio.TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Image OCR timed out. Please retry.") from exc
    except Exception as exc:
        logger.exception("Gemini image OCR failed")
        if "model" in str(exc).lower():
            detail = (
                "No accessible Gemini model is available to this API key. Check that GEMINI_API_KEY "
                "belongs to a Google AI Studio project with Gemini Developer API access and set "
                "GEMINI_MODEL to a model listed for that key."
            )
        else:
            detail = "Gemini could not read this image. Please retry."
        raise HTTPException(status_code=502, detail=detail) from exc
