"""Email verification codes.

Stores 6-digit codes sent to a user's email for one of two purposes:
  * ``verify_existing`` — confirm an email that the user typed into settings.
  * ``change_email``   — confirm a *new* email before writing it onto the user.

Rate limiting and bruteforce protection are enforced via:
  * ``attempts`` counter (+1 per failed verify; hard-cap 5)
  * ``expires_at`` (default 15 minutes)
  * ``consumed_at`` (a row can only be consumed once)

A new code for the same (user_id, purpose) supersedes any prior un-consumed row
by marking the earlier rows as consumed — done at the service layer to keep this
model mechanical.
"""
from __future__ import annotations

import enum
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Index
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.sql import func

from shared.database.base import Base


class EmailVerificationPurpose(str, enum.Enum):
    verify_existing = "verify_existing"
    change_email    = "change_email"


class EmailVerificationCode(Base):
    """A short-lived, one-time-use 6-digit code sent via email."""

    __tablename__ = "email_verification_codes"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    email      = Column(String(255), nullable=False)
    code_hash  = Column(String(128), nullable=False)   # sha256(code) — never store raw code
    purpose    = Column(SQLEnum(EmailVerificationPurpose), nullable=False)
    attempts   = Column(Integer, nullable=False, default=0)

    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at  = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_evc_user_purpose_active", "user_id", "purpose", "consumed_at"),
    )

    # ------------------------------------------------------------------ helpers
    @staticmethod
    def generate_code() -> str:
        """Return a cryptographically random 6-digit string (``'000000'``–``'999999'``)."""
        return f"{secrets.randbelow(1_000_000):06d}"

    @staticmethod
    def hash_code(code: str) -> str:
        import hashlib
        return hashlib.sha256(code.encode("utf-8")).hexdigest()

    @staticmethod
    def default_expiry(minutes: int = 15) -> datetime:
        return datetime.now(timezone.utc) + timedelta(minutes=minutes)

    def is_expired(self) -> bool:
        if self.expires_at is None:
            return True
        exp = self.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) >= exp

    def is_consumed(self) -> bool:
        return self.consumed_at is not None


__all__ = ["EmailVerificationCode", "EmailVerificationPurpose"]
