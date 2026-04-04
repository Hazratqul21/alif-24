"""
Subscription Access Control Dependencies
=========================================
Professional approach: "Inject, Don't Block"

Middleware FAQAT request.state ga obuna ma'lumotini yozadi.
Endpoint-lar bu dependency-lardan foydalanib, o'zlari qaror qiladi.
"""

from fastapi import Request, HTTPException
from dataclasses import dataclass, field
from typing import Optional, Dict, Any


@dataclass
class SubscriptionInfo:
    """Foydalanuvchi obuna holati — middleware tomonidan to'ldiriladi."""
    is_authenticated: bool = False
    has_subscription: bool = False
    plan_slug: Optional[str] = None
    plan_name: Optional[str] = None
    features: Dict[str, Any] = field(default_factory=dict)
    expires_at: Optional[str] = None

    def has_feature(self, feature_name: str) -> bool:
        """Berilgan feature mavjudligini tekshirish."""
        # Agar foydalanuvchi autentifikatsiya qilinmagan bo'lsa, hech narsa ko'rsatmaymiz (login so'raymiz)
        if not self.is_authenticated:
            return False

        # Agar foydalanuvchida obuna yo'q bo'lsa (yoki muddati tugagan bo'lsa), 
        # u avtomatik ravishda VIRTUAL BEPUL obunada hisoblanadi.
        if not self.has_subscription:
            # Bepul tariff - Olimpiada endi faqat obunachilar uchun (14 kun trial ham o'tadi)
            default_free_features = {
                "ertaklar": True,
                "darslar": True,
                "oyinlar": False,
                "olimpiada": False,  # Olimpiada faqat obuna yoki trial bilan
                "ai_test": False,
                "kutubxona": True,
                "live_quiz": False,
            }
            return bool(default_free_features.get(feature_name, False))

        # Agar foydalanuvchida qandaydir tarif bo'lsa, uning o'z configidan qidiramiz
        return bool(self.features.get(feature_name, False))

    @property
    def is_free(self) -> bool:
        """Bepul (virtal yoki jismoniy bepul ro'yxatdan o'tgan) ekanligini tekshirish."""
        if not self.has_subscription:
            return True
        return self.plan_slug == "free" or self.plan_slug == "bepul"

    @property
    def is_premium(self) -> bool:
        """Pullik (premium) obuna ekanligini tekshirish."""
        return self.has_subscription and not self.is_free


def get_sub_info(request: Request) -> SubscriptionInfo:
    """
    Request.state dan obuna ma'lumotini olish.
    Middleware tomonidan to'ldirilgan bo'lishi kerak.
    Hech qachon xato bermaydi — default qiymat qaytaradi.
    """
    return getattr(request.state, "subscription", SubscriptionInfo())


def require_subscription(request: Request) -> SubscriptionInfo:
    """
    Har qanday faol obuna talab qilish (Virtual bepul ham o'tadi, login qilgan bo'lsa).
    Faqat login qilmaganlarni yoki umuman man qilinganlarni qaytaradi.
    """
    sub = get_sub_info(request)
    if not sub.is_authenticated:
        raise HTTPException(
            status_code=401,
            detail="Iltimos, avval tizimga kiring."
        )
    return sub


def require_feature(feature_name: str):
    """
    Ma'lum bir feature talab qilish ("darslar", "oyinlar", "ertaklar" so'ralganda).
    """
    def _check(request: Request) -> SubscriptionInfo:
        sub = get_sub_info(request)
        
        # 1. Login bo'lmagan bo'lsa
        if not sub.is_authenticated:
            raise HTTPException(
                status_code=401,
                detail="Iltimos, avval tizimga kiring."
            )

        # 2. Xususiyat tekshiruvi (has_feature funksiyasi orqali yurgiziladi)
        if not sub.has_feature(feature_name):
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "FEATURE_LOCKED",
                    "message": f"Bu bo'limdan foydalanish uchun obuna profilingizni yangilang.",
                    "required_feature": feature_name,
                    "current_plan": sub.plan_name or "Bepul (Faqat ertaklar)",
                    "upgrade_url": "/pricing",
                }
            )
        return sub
    return _check


def require_premium(request: Request) -> SubscriptionInfo:
    """
    Faqat pullik obuna talab qilish (bepul tarif ruxsat bermaydi).
    """
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
