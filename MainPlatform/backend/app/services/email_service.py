"""Alif24 transactional email service.

Thin wrapper around fastapi-mail that:
  - Lazily builds the ConnectionConfig from settings (so tests / dev without
    MAIL_ENABLED=true never need valid SMTP creds).
  - Renders HTML templates from app/templates/email/ with Jinja2.
  - Logs every send attempt to shared.database.models.notification.NotificationLog
    so admins can see the history in one place with SMS/Telegram events.
  - Exposes small async helpers:  send_welcome(user), send_broadcast(recipients, ...)

Deliberately NON-blocking at the HTTP request level — callers should pass the
send coroutine to FastAPI `BackgroundTasks` so login/register latency stays low.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Iterable, Optional, Sequence

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from shared.database.models.notification import (
    NotificationLog,
    NotificationStatus,
    NotificationType,
)

logger = logging.getLogger(__name__)

# app/services/email_service.py  →  app/templates/email
_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"

_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
    enable_async=False,
)

_fastmail_instance: Optional[FastMail] = None


def _build_connection_config() -> ConnectionConfig:
    """Build FastMail config from environment. Called lazily on first send."""
    if not (settings.MAIL_USERNAME and settings.MAIL_PASSWORD):
        raise RuntimeError(
            "MAIL_USERNAME and MAIL_PASSWORD must be set (use Gmail App Password)"
        )
    return ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_STARTTLS=settings.MAIL_STARTTLS,
        MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )


def _get_fastmail() -> FastMail:
    global _fastmail_instance
    if _fastmail_instance is None:
        _fastmail_instance = FastMail(_build_connection_config())
    return _fastmail_instance


def render_template(name: str, **context) -> str:
    """Render Jinja2 template at app/templates/email/<name>."""
    template = _jinja_env.get_template(name)
    ctx = {
        "site_url": "https://alif24.uz",
        "brand_name": settings.MAIL_FROM_NAME,
        "support_email": settings.MAIL_FROM,
        "current_year": 2026,
        **context,
    }
    return template.render(**ctx)


async def _log_send(
    db: Optional[AsyncSession],
    *,
    user_id: Optional[str],
    recipient: str,
    subject: str,
    status: str,
    error: Optional[str] = None,
) -> None:
    """Best-effort persistence of an email send into NotificationLog.

    We never raise from the logger — email delivery must not depend on DB being
    reachable at broadcast time.
    """
    if db is None:
        return
    try:
        status_enum = (
            NotificationStatus.SENT if status == "sent" else NotificationStatus.FAILED
        )
        await db.execute(
            insert(NotificationLog).values(
                user_id=user_id,
                notification_type=NotificationType.EMAIL,
                recipient=recipient,
                subject=subject,
                message=None,  # body stored in template; keep log row lean
                status=status_enum,
                error_message=error,
            )
        )
        await db.commit()
    except Exception:  # noqa: BLE001 — logging must not break the send pipeline
        logger.exception("Failed to record NotificationLog for %s", recipient)


async def send_mail(
    *,
    to: str | Sequence[str],
    subject: str,
    html: str,
    db: Optional[AsyncSession] = None,
    user_id: Optional[str] = None,
) -> bool:
    """Send one HTML email. Returns True on success, False on failure.

    If MAIL_ENABLED is false, this is a no-op returning True so local/dev
    environments don't need real credentials.
    """
    recipients = [to] if isinstance(to, str) else list(to)
    if not recipients:
        return True

    if not settings.MAIL_ENABLED:
        logger.info("MAIL_ENABLED=false; would send '%s' to %s", subject, recipients)
        return True

    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        body=html,
        subtype=MessageType.html,
    )

    try:
        fm = _get_fastmail()
        await fm.send_message(message)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Email send failed for %s: %s", recipients, exc)
        for r in recipients:
            await _log_send(
                db,
                user_id=user_id,
                recipient=r,
                subject=subject,
                status="failed",
                error=str(exc)[:500],
            )
        return False

    for r in recipients:
        await _log_send(
            db,
            user_id=user_id,
            recipient=r,
            subject=subject,
            status="sent",
        )
    return True


# ---------------------------------------------------------------------------
# High-level helpers
# ---------------------------------------------------------------------------

async def send_welcome_email(
    *,
    to: str,
    first_name: str,
    db: Optional[AsyncSession] = None,
    user_id: Optional[str] = None,
    provider: str = "password",
) -> bool:
    """Send the Alif24 welcome email. Used by register() and google callback."""
    html = render_template(
        "welcome.html",
        first_name=first_name or "Alif24 foydalanuvchisi",
        provider=provider,
    )
    return await send_mail(
        to=to,
        subject="Xush kelibsiz — Alif24",
        html=html,
        db=db,
        user_id=user_id,
    )


async def send_broadcast(
    *,
    recipients: Iterable[dict],
    subject: str,
    title: str,
    body_html: str,
    cta_label: Optional[str] = None,
    cta_url: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> dict:
    """Send a marketing/broadcast HTML email to many recipients.

    `recipients` is an iterable of dicts: {"email": str, "first_name": str, "id": str}.
    Respects settings.MAIL_BROADCAST_BATCH_SIZE / SLEEP_SECONDS to stay under the
    Gmail SMTP daily send cap and per-minute rate limit.

    Returns a summary {"sent": N, "failed": N, "total": N}.
    """
    recipients = list(recipients)
    total = len(recipients)
    sent = 0
    failed = 0

    html_template = render_template(
        "broadcast.html",
        title=title,
        body_html=body_html,
        cta_label=cta_label,
        cta_url=cta_url,
        # first_name gets injected per-recipient below by a simple replace token
        first_name="{{FIRST_NAME}}",
    )

    batch_size = max(1, settings.MAIL_BROADCAST_BATCH_SIZE)
    sleep_sec = max(0.0, settings.MAIL_BROADCAST_SLEEP_SECONDS)

    for i in range(0, total, batch_size):
        batch = recipients[i : i + batch_size]
        for r in batch:
            email = r.get("email")
            if not email:
                continue
            personalized_html = html_template.replace(
                "{{FIRST_NAME}}",
                r.get("first_name") or "Alif24 foydalanuvchisi",
            )
            ok = await send_mail(
                to=email,
                subject=subject,
                html=personalized_html,
                db=db,
                user_id=r.get("id"),
            )
            if ok:
                sent += 1
            else:
                failed += 1
        # Pace requests so Gmail SMTP doesn't throttle / block the account.
        if i + batch_size < total and sleep_sec > 0:
            await asyncio.sleep(sleep_sec)

    logger.info(
        "Broadcast '%s' completed: sent=%d failed=%d total=%d",
        subject,
        sent,
        failed,
        total,
    )
    return {"sent": sent, "failed": failed, "total": total}
