"""Subscription helper utilities shared across services.

This module is used by multiple services (e.g. MainPlatform, Olimp) to
centralize subscription-related helper classes and dependencies.
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any

from fastapi import Request, HTTPException


@dataclass
class SubscriptionInfo:
    """User subscription status (populated by middleware)."""

    is_authenticated: bool = False
    has_subscription: bool = False
    plan_slug: Optional[str] = None
    plan_name: Optional[str] = None
    features: Dict[str, Any] = field(default_factory=dict)
    expires_at: Optional[str] = None

    def has_feature(self, feature_name: str) -> bool:
        """Check whether this subscription grants access to a given feature."""
        if not self.is_authenticated:
            return False

        if not self.has_subscription:
            # In the free tier, only "ertaklar" is enabled.
            default_free_features = {
                "ertaklar": True,
                "darslar": False,
                "oyinlar": False,
                "olimpiada": False,
                "ai_test": False,
                "kutubxona": False,
                "live_quiz": False,
            }
            return bool(default_free_features.get(feature_name, False))

        return bool(self.features.get(feature_name, False))

    @property
    def is_free(self) -> bool:
        if not self.has_subscription:
            return True
        return self.plan_slug == "free" or self.plan_slug == "bepul"

    @property
    def is_premium(self) -> bool:
        return self.has_subscription and not self.is_free


def get_sub_info(request: Request) -> SubscriptionInfo:
    """Retrieve subscription info stored by middleware in request.state."""
    return getattr(request.state, "subscription", SubscriptionInfo())


def require_subscription(request: Request) -> SubscriptionInfo:
    """Require any logged-in user (free or paid)."""
    sub = get_sub_info(request)
    if not sub.is_authenticated:
        raise HTTPException(
            status_code=401,
            detail="Iltimos, avval tizimga kiring."
        )
    return sub


def require_feature(feature_name: str):
    """Require that the current user has access to a particular feature."""

    def _check(request: Request) -> SubscriptionInfo:
        sub = get_sub_info(request)

        if not sub.is_authenticated:
            raise HTTPException(
                status_code=401,
                detail="Iltimos, avval tizimga kiring."
            )

        if not sub.has_feature(feature_name):
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "FEATURE_LOCKED",
                    "message": "Bu bo'limdan foydalanish uchun obuna profilingizni yangilang.",
                    "required_feature": feature_name,
                    "current_plan": sub.plan_name or "Bepul (Faqat ertaklar)",
                    "upgrade_url": "/pricing",
                }
            )
        return sub

    return _check


def require_premium(request: Request) -> SubscriptionInfo:
    """Require a paid subscription."""
    sub = get_sub_info(request)
    if not sub.is_authenticated:
        raise HTTPException(status_code=401, detail="Iltimos tizimga kiring.")

    if not sub.is_premium:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PREMIUM_REQUIRED",
                "message": "Bu imkoniyat faqat maxsus obunachilar (Premium) uchun.",
                "current_plan": sub.plan_name or "Bepul",
                "upgrade_url": "/pricing",
            }
        )
    return sub
