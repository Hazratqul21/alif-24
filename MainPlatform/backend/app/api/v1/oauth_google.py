"""Google OAuth2 login for Alif24.

Endpoints:
    GET /api/v1/auth/google/login      → 302 to Google consent screen
    GET /api/v1/auth/google/callback   → handled by Google after consent

Flow:
  1. User clicks "Sign in with Google" on the frontend.
  2. Frontend navigates to /api/v1/auth/google/login.
  3. authlib redirects user to accounts.google.com with state + nonce in a
     short-lived session cookie (starlette SessionMiddleware).
  4. Google bounces back to /api/v1/auth/google/callback with an auth code.
  5. authlib exchanges the code for an ID token and parses the userinfo.
  6. We upsert a User (by google_id, then by email). Brand-new users get a
     StudentProfile and a welcome email via BackgroundTasks.
  7. We mint the same JWT pair used by /auth/login and set HttpOnly cookies
     on .alif24.uz, then 302 back to OAUTH_SUCCESS_REDIRECT so the SPA can
     read /auth/me and hydrate its React context.

No change to the existing password login — this is purely additive.
"""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from typing import Optional

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.email_service import send_welcome_email
from shared.auth import create_access_token, create_refresh_token
from shared.database import AsyncSessionLocal, get_db
from shared.database.models import StudentProfile, User, UserRole
from shared.database.models.user import AccountStatus

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Lazy OAuth client so that a missing GOOGLE_CLIENT_ID in local dev does not
# crash FastAPI startup — only /auth/google/* endpoints will raise 503.
# ---------------------------------------------------------------------------
_oauth_client: Optional[OAuth] = None


def _get_oauth() -> OAuth:
    global _oauth_client
    if _oauth_client is not None:
        return _oauth_client
    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET):
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured on this server",
        )
    oauth = OAuth()
    oauth.register(
        name="google",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
    _oauth_client = oauth
    return oauth


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _set_auth_cookies(response: RedirectResponse, access_token: str, refresh_token: str, host: Optional[str]) -> None:
    """Mirror the cookie semantics of /auth/login so the SPA works identically."""
    domain = ".alif24.uz" if host and "alif24.uz" in host else None
    secure = not settings.DEBUG
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        domain=domain,
        max_age=8 * 60 * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        domain=domain,
        max_age=30 * 24 * 60 * 60,
        path="/",
    )


async def _send_welcome_in_background(user_id: str, email: str, first_name: str, provider: str) -> None:
    """Runs after response is returned — opens its own DB session."""
    try:
        async with AsyncSessionLocal() as session:
            await send_welcome_email(
                to=email,
                first_name=first_name,
                db=session,
                user_id=user_id,
                provider=provider,
            )
    except Exception:
        logger.exception("welcome email failed for %s", email)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/google/login")
async def google_login(request: Request):
    """Kick off the OAuth dance — redirects to Google's consent screen."""
    oauth = _get_oauth()
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Google redirects here after user consents. Exchanges code → tokens → session."""
    oauth = _get_oauth()

    # 1. Exchange auth code for tokens & parse ID token
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as exc:
        logger.warning("Google OAuth error: %s", exc)
        return RedirectResponse(url=settings.OAUTH_FAILURE_REDIRECT, status_code=302)

    userinfo = token.get("userinfo") or {}
    if not userinfo:
        # Fallback — hit the userinfo endpoint with the access_token
        try:
            resp = await oauth.google.get(
                "https://openidconnect.googleapis.com/v1/userinfo", token=token
            )
            userinfo = resp.json()
        except Exception:
            logger.exception("Failed to fetch Google userinfo")
            return RedirectResponse(url=settings.OAUTH_FAILURE_REDIRECT, status_code=302)

    google_sub = userinfo.get("sub")
    email = (userinfo.get("email") or "").lower().strip()
    email_verified = bool(userinfo.get("email_verified", False))
    given_name = userinfo.get("given_name") or ""
    family_name = userinfo.get("family_name") or ""
    picture = userinfo.get("picture")

    if not google_sub or not email:
        logger.warning("Google returned userinfo without sub/email: %s", userinfo)
        return RedirectResponse(url=settings.OAUTH_FAILURE_REDIRECT, status_code=302)

    # 2. Upsert User — first try by google_id, then by email (account linking)
    result = await db.execute(select(User).where(User.google_id == google_sub))
    user = result.scalars().first()
    is_new_user = False

    if user is None:
        # Maybe the user previously registered with the same email using a password:
        # link the Google identity instead of creating a duplicate.
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if user is None:
            # Genuinely new account → create a student by default.
            user = User(
                email=email,
                first_name=given_name or email.split("@")[0],
                last_name=family_name or "",
                avatar=picture,
                role=UserRole.student,
                google_id=google_sub,
                oauth_provider="google",
                email_verified=email_verified,
                status=AccountStatus.active,
            )
            # No password — Google handles auth. password_hash stays NULL.
            db.add(user)
            await db.flush()
            # Minimal student profile so the dashboard / coin stats don't 500.
            db.add(StudentProfile(user_id=user.id))
            await db.flush()
            is_new_user = True
        else:
            # Link
            user.google_id = google_sub
            if not user.oauth_provider:
                user.oauth_provider = "google"
            if email_verified:
                user.email_verified = True
            if picture and not user.avatar:
                user.avatar = picture

    # Keep avatar fresh on repeat logins when the user hasn't uploaded their own
    if picture and (not user.avatar or user.avatar.startswith("https://lh3.googleusercontent.com")):
        user.avatar = picture

    if user.status != AccountStatus.active:
        # Don't leak account state details; treat as auth failure
        logger.info("Blocked OAuth login for non-active user %s", user.id)
        return RedirectResponse(url=settings.OAUTH_FAILURE_REDIRECT, status_code=302)

    # 3. Mint our own JWTs (same shape as /auth/login)
    access_token = create_access_token(
        data={
            "sub": user.id,
            "email": user.email or user.phone,
            "role": user.role.value,
        }
    )
    refresh_token = create_refresh_token(data={"sub": user.id})
    user.refresh_token = refresh_token
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    # 4. Send welcome email *only* for brand-new accounts (background)
    if is_new_user and user.email:
        background_tasks.add_task(
            _send_welcome_in_background,
            user.id,
            user.email,
            user.first_name,
            "google",
        )

    # 5. Redirect browser back into the SPA with cookies set
    target = settings.OAUTH_SUCCESS_REDIRECT
    response = RedirectResponse(url=target, status_code=302)
    host = request.url.hostname
    _set_auth_cookies(response, access_token, refresh_token, host)
    return response
