"""Admin email broadcast endpoints.

All endpoints require the existing admin headers X-Admin-Role + X-Admin-Key
(shared with the rest of the /admin/ surface).

    POST /api/v1/admin/email/test        Send a single test mail to one address
    POST /api/v1/admin/email/preview     Render the broadcast template (no send)
    POST /api/v1/admin/email/broadcast   Fan out to many users (background task)
    GET  /api/v1/admin/email/audience    Count recipients by filter (dry run)
    GET  /api/v1/admin/email/history     Last N NotificationLog rows
"""

from __future__ import annotations

import html as html_lib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.email_service import (
    render_template,
    send_broadcast,
    send_mail,
)
from shared.database import AsyncSessionLocal, get_db
from shared.database.models import User, UserRole
from shared.database.models.notification import (
    NotificationLog,
    NotificationStatus,
    NotificationType,
)
from shared.database.models.user import AccountStatus

from .admin_panel import has_permission, verify_admin

logger = logging.getLogger(__name__)
router = APIRouter(tags=["admin-email"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

RoleFilter = Literal["all", "student", "teacher", "parent", "organization", "moderator"]


class BroadcastAudience(BaseModel):
    role: RoleFilter = "all"
    only_active: bool = True
    only_marketing_opted_in: bool = True
    include_unverified_email: bool = False


class BroadcastPayload(BaseModel):
    subject: str = Field(..., min_length=2, max_length=200)
    title: str = Field(..., min_length=2, max_length=200)
    # Admins can paste raw HTML — they are trusted. We still sanitize plain text
    # into safe HTML when the admin provides `body_text` instead.
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    cta_label: Optional[str] = Field(None, max_length=80)
    cta_url: Optional[str] = Field(None, max_length=500)
    audience: BroadcastAudience = BroadcastAudience()


class TestMailPayload(BaseModel):
    to: EmailStr
    subject: str = Field(..., min_length=2, max_length=200)
    title: str = Field(..., min_length=2, max_length=200)
    body_html: Optional[str] = None
    body_text: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _require_broadcast_permission(admin: Dict[str, Any]) -> None:
    """hazratqul + nurali have 'all', pedagog does not get broadcast rights."""
    if not (has_permission(admin, "all") or has_permission(admin, "broadcast")):
        raise HTTPException(
            status_code=403,
            detail="Ommaviy xabar yuborish uchun ruxsat yetarli emas (faqat Super Admin).",
        )


def _resolve_body_html(body_html: Optional[str], body_text: Optional[str]) -> str:
    """Allow admins to either paste raw HTML or plain text (auto-converted)."""
    if body_html and body_html.strip():
        return body_html
    if body_text and body_text.strip():
        escaped = html_lib.escape(body_text)
        paragraphs = [p.strip() for p in escaped.split("\n\n") if p.strip()]
        return "\n".join(
            f"<p style=\"margin:0 0 14px 0;\">{p.replace(chr(10), '<br>')}</p>"
            for p in paragraphs
        )
    raise HTTPException(
        status_code=400,
        detail="body_html yoki body_text dan hech bo'lmaganda biri bo'lishi shart.",
    )


def _role_filter(role: RoleFilter):
    if role == "all":
        return None
    return User.role == UserRole(role)


async def _collect_recipients(db: AsyncSession, audience: BroadcastAudience) -> List[Dict[str, Any]]:
    """Pull all users matching the audience filter and return light dicts."""
    stmt = select(User.id, User.email, User.first_name, User.role, User.status,
                   User.email_verified, User.marketing_emails_enabled).where(
        User.email.is_not(None),
        User.email != "",
    )

    if audience.only_active:
        stmt = stmt.where(User.status == AccountStatus.active)
    if audience.only_marketing_opted_in:
        stmt = stmt.where(User.marketing_emails_enabled.is_(True))
    if not audience.include_unverified_email:
        stmt = stmt.where(User.email_verified.is_(True))

    role_cond = _role_filter(audience.role)
    if role_cond is not None:
        stmt = stmt.where(role_cond)

    rows = (await db.execute(stmt)).all()
    return [
        {"id": r.id, "email": r.email, "first_name": r.first_name}
        for r in rows
    ]


async def _run_broadcast_in_bg(
    payload: BroadcastPayload, recipients: List[Dict[str, Any]], admin_role: str
) -> None:
    """Runs after the admin request returns. Uses its own DB session."""
    try:
        async with AsyncSessionLocal() as session:
            summary = await send_broadcast(
                recipients=recipients,
                subject=payload.subject,
                title=payload.title,
                body_html=_resolve_body_html(payload.body_html, payload.body_text),
                cta_label=payload.cta_label,
                cta_url=payload.cta_url,
                db=session,
            )
            logger.info(
                "admin=%s broadcast '%s' done: %s", admin_role, payload.subject, summary
            )
    except Exception:
        logger.exception("Broadcast background task failed")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/email/audience")
async def audience_count(
    role: RoleFilter = "all",
    only_active: bool = True,
    only_marketing_opted_in: bool = True,
    include_unverified_email: bool = False,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Dry-run: how many people would this broadcast reach?"""
    stmt = select(func.count(User.id)).where(
        User.email.is_not(None),
        User.email != "",
    )
    if only_active:
        stmt = stmt.where(User.status == AccountStatus.active)
    if only_marketing_opted_in:
        stmt = stmt.where(User.marketing_emails_enabled.is_(True))
    if not include_unverified_email:
        stmt = stmt.where(User.email_verified.is_(True))
    if role != "all":
        stmt = stmt.where(User.role == UserRole(role))
    total = await db.scalar(stmt)
    return {"success": True, "audience_count": int(total or 0)}


@router.post("/email/preview")
async def preview_broadcast(
    payload: BroadcastPayload,
    admin: Dict = Depends(verify_admin),
):
    """Render the HTML that would be sent, without actually sending."""
    _require_broadcast_permission(admin)
    html = render_template(
        "broadcast.html",
        title=payload.title,
        body_html=_resolve_body_html(payload.body_html, payload.body_text),
        cta_label=payload.cta_label,
        cta_url=payload.cta_url,
        first_name="Ali",  # sample
    )
    return {"success": True, "subject": payload.subject, "html": html}


@router.post("/email/test")
async def send_test_email(
    payload: TestMailPayload,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send a single test broadcast to a specific address (admin sanity check)."""
    _require_broadcast_permission(admin)
    body_html = _resolve_body_html(payload.body_html, payload.body_text)
    html = render_template(
        "broadcast.html",
        title=payload.title,
        body_html=body_html,
        first_name="Test",
    )
    ok = await send_mail(
        to=payload.to,
        subject=payload.subject,
        html=html,
        db=db,
        user_id=None,
    )
    if not ok:
        raise HTTPException(status_code=502, detail="SMTP yuborishda xatolik — logda batafsil.")
    return {"success": True, "message": f"Test xat {payload.to} ga yuborildi."}


@router.post("/email/broadcast")
async def send_admin_broadcast(
    payload: BroadcastPayload,
    background_tasks: BackgroundTasks,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Fan out to everyone matching the audience filter.

    Executes in a background task so the admin's HTTP request returns instantly
    — Gmail SMTP is rate-limited and fanning out 1000 emails can take minutes.
    """
    _require_broadcast_permission(admin)

    # Validate payload early (raises 400 if both bodies are empty)
    _resolve_body_html(payload.body_html, payload.body_text)

    recipients = await _collect_recipients(db, payload.audience)
    if not recipients:
        raise HTTPException(
            status_code=400,
            detail="Tanlangan filtr bo'yicha hech qanday qabul qiluvchi topilmadi.",
        )

    background_tasks.add_task(_run_broadcast_in_bg, payload, recipients, admin["role"])

    logger.info(
        "admin=%s queued broadcast '%s' → %d recipients",
        admin["role"], payload.subject, len(recipients),
    )
    return {
        "success": True,
        "message": "Ommaviy xabarnoma navbatga qo'yildi.",
        "queued": len(recipients),
        "audience": payload.audience.model_dump(),
    }


@router.get("/email/history")
async def email_history(
    limit: int = 50,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Recent email send log — pulled from the shared NotificationLog table."""
    limit = max(1, min(limit, 500))
    res = await db.execute(
        select(NotificationLog)
        .where(NotificationLog.notification_type == NotificationType.EMAIL)
        .order_by(desc(NotificationLog.created_at))
        .limit(limit)
    )
    rows = res.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": r.id,
                "recipient": r.recipient,
                "subject": r.subject,
                "status": r.status.value if hasattr(r.status, "value") else r.status,
                "error_message": r.error_message,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }
