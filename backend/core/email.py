import asyncio
import smtplib
import ssl
from email.message import EmailMessage

from backend.core.config import settings


def email_delivery_configured() -> bool:
    return all((
        settings.SMTP_HOST,
        settings.SMTP_USERNAME,
        settings.SMTP_PASSWORD,
        settings.SMTP_FROM_EMAIL,
    ))


async def send_email(to_email: str, subject: str, body: str) -> None:
    """Send a plain-text email using the same SMTP configuration as account recovery."""
    if not email_delivery_configured():
        raise RuntimeError("SMTP email delivery is not configured")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = to_email
    message.set_content(body)

    def deliver() -> None:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            if settings.SMTP_STARTTLS:
                server.starttls(context=ssl.create_default_context())
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)

    await asyncio.to_thread(deliver)
