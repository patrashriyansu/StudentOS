import httpx

from backend.core.config import settings


REQUIRED_EMAIL_SETTINGS = ("RESEND_API_KEY", "EMAIL_FROM")
RESEND_EMAILS_URL = "https://api.resend.com/emails"


def missing_email_settings() -> list[str]:
    """Return missing email-provider setting names without exposing secret values."""
    return [
        name
        for name in REQUIRED_EMAIL_SETTINGS
        if not str(getattr(settings, name, "") or "").strip()
    ]


def email_delivery_configured() -> bool:
    return not missing_email_settings()


async def send_email(to_email: str, subject: str, body: str) -> None:
    """Send plain-text mail through Resend's HTTPS API (works on Render Free)."""
    missing = missing_email_settings()
    if missing:
        raise RuntimeError(f"Email delivery is not configured. Missing settings: {', '.join(missing)}")

    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "StudentOS/1.0",
    }
    payload = {
        "from": settings.EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "text": body,
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
        response = await client.post(RESEND_EMAILS_URL, headers=headers, json=payload)
        if response.is_error:
            # Expose safe provider diagnostics without returning request headers or API credentials.
            provider_message = ""
            try:
                error_payload = response.json()
                if isinstance(error_payload, dict):
                    provider_message = str(error_payload.get("message") or error_payload.get("name") or "")[:180]
            except (ValueError, AttributeError):
                provider_message = ""
            suffix = f" Provider detail: {provider_message}" if provider_message else ""
            raise RuntimeError(
                f"Resend email API returned HTTP {response.status_code}.{suffix} "
                "Check RESEND_API_KEY and verify the EMAIL_FROM sender domain."
            )
