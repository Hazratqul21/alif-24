"""
Admin Analytics Router - Smart Admin Panel Analytics
Geolocation stats, trends, audit log, notifications, user segments, subscription health
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, text, select, case, distinct, cast, Date
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
import logging

from shared.database import get_db
from shared.database.models import (
    User, UserRole, AccountStatus,
    StudentCoin, CoinTransaction,
    UserSubscription, SubscriptionPlanConfig, SubscriptionStatus,
)
from shared.database.models.analytics import UserGeoLog, AuditLog, AdminNotification

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-analytics"])

# Reuse admin auth from admin_panel
from .admin_panel import verify_admin, has_permission, ADMIN_KEYS


# ============================================================================
# HELPER: Audit log yozish
# ============================================================================

async def write_audit_log(
    db: AsyncSession,
    admin_role: str,
    action: str,
    target_type: str = None,
    target_id: str = None,
    target_name: str = None,
    details: dict = None,
    ip_address: str = None,
    action_type: str = "info",
):
    """Admin harakati logga yozish"""
    try:
        log = AuditLog(
            admin_role=admin_role,
            action=action,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            target_name=target_name,
            details=details,
            ip_address=ip_address,
        )
        db.add(log)
        await db.commit()
    except Exception as e:
        logger.warning(f"Audit log yozishda xatolik: {e}")


# ============================================================================
# ANALYTICS OVERVIEW
# ============================================================================

@router.get("/analytics/overview")
async def analytics_overview(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Asosiy platform statistikasi — kengaytirilgan"""
    now = datetime.now(timezone.utc)
    today = now.date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Asosiy sonlar
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_students = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.student))).scalar() or 0
    total_parents = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.parent))).scalar() or 0
    total_teachers = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.teacher))).scalar() or 0
    active_users = (await db.execute(select(func.count(User.id)).where(User.status == AccountStatus.active))).scalar() or 0

    # Yangi foydalanuvchilar (bugun, hafta, oy)
    new_today = (await db.execute(
        select(func.count(User.id)).where(cast(User.created_at, Date) == today)
    )).scalar() or 0
    new_week = (await db.execute(
        select(func.count(User.id)).where(cast(User.created_at, Date) >= week_ago)
    )).scalar() or 0
    new_month = (await db.execute(
        select(func.count(User.id)).where(cast(User.created_at, Date) >= month_ago)
    )).scalar() or 0

    # Coins
    coins_result = (await db.execute(select(func.sum(StudentCoin.current_balance)))).scalar()
    coins_in_circulation = int(coins_result) if coins_result else 0

    # Subscription stats
    active_subs = (await db.execute(
        select(func.count(UserSubscription.id)).where(UserSubscription.status == SubscriptionStatus.active)
    )).scalar() or 0

    # Revenue
    total_revenue = (await db.execute(
        select(func.sum(UserSubscription.amount_paid)).where(UserSubscription.amount_paid > 0)
    )).scalar() or 0

    # Login bugun (geo log'dan)
    logins_today = (await db.execute(
        select(func.count(UserGeoLog.id)).where(
            cast(UserGeoLog.created_at, Date) == today,
            UserGeoLog.action == "login"
        )
    )).scalar() or 0

    # Unique logins bugun
    unique_logins_today = (await db.execute(
        select(func.count(distinct(UserGeoLog.user_id))).where(
            cast(UserGeoLog.created_at, Date) == today,
            UserGeoLog.action == "login"
        )
    )).scalar() or 0

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_parents": total_parents,
        "total_teachers": total_teachers,
        "active_users": active_users,
        "coins_in_circulation": coins_in_circulation,
        "active_subscriptions": active_subs,
        "total_revenue": int(total_revenue or 0),
        "new_users": {
            "today": new_today,
            "this_week": new_week,
            "this_month": new_month,
        },
        "logins": {
            "today_total": logins_today,
            "today_unique": unique_logins_today,
        },
        "conversion_rate": round((active_subs / total_users * 100), 1) if total_users > 0 else 0,
    }


# ============================================================================
# TRENDS (Grafik uchun)
# ============================================================================

@router.get("/analytics/trends")
async def analytics_trends(
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Kunlik trend ma'lumotlari (grafik uchun)"""
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(period, 30)
    start_date = datetime.now(timezone.utc).date() - timedelta(days=days)

    # Kunlik yangi ro'yxatlar
    reg_result = await db.execute(
        select(
            cast(User.created_at, Date).label("day"),
            func.count(User.id).label("count")
        ).where(cast(User.created_at, Date) >= start_date)
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
    )
    registrations = [{"date": str(r.day), "count": r.count} for r in reg_result]

    # Kunlik loginlar
    login_result = await db.execute(
        select(
            cast(UserGeoLog.created_at, Date).label("day"),
            func.count(distinct(UserGeoLog.user_id)).label("unique_users"),
            func.count(UserGeoLog.id).label("total_logins"),
        ).where(
            cast(UserGeoLog.created_at, Date) >= start_date,
            UserGeoLog.action == "login"
        )
        .group_by(cast(UserGeoLog.created_at, Date))
        .order_by(cast(UserGeoLog.created_at, Date))
    )
    logins = [{"date": str(r.day), "unique_users": r.unique_users, "total_logins": r.total_logins} for r in login_result]

    # Rol bo'yicha ro'yxatlar
    role_result = await db.execute(
        select(
            User.role,
            func.count(User.id).label("count")
        ).where(cast(User.created_at, Date) >= start_date)
        .group_by(User.role)
    )
    by_role = {str(r.role.value) if r.role else "unknown": r.count for r in role_result}

    return {
        "period": period,
        "registrations": registrations,
        "logins": logins,
        "by_role": by_role,
    }


# ============================================================================
# GEOLOCATION STATS
# ============================================================================

@router.get("/analytics/geo")
async def analytics_geo(
    period: str = Query("30d", regex="^(7d|30d|90d|all)$"),
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Geolokatsiya bo'yicha statistika"""
    days_map = {"7d": 7, "30d": 30, "90d": 90, "all": 3650}
    days = days_map.get(period, 30)
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Viloyat/shahar bo'yicha
    region_result = await db.execute(
        select(
            UserGeoLog.region,
            UserGeoLog.city,
            func.count(distinct(UserGeoLog.user_id)).label("unique_users"),
            func.count(UserGeoLog.id).label("total_visits"),
        ).where(
            UserGeoLog.created_at >= start_date,
            UserGeoLog.region.isnot(None),
        )
        .group_by(UserGeoLog.region, UserGeoLog.city)
        .order_by(func.count(distinct(UserGeoLog.user_id)).desc())
        .limit(50)
    )
    regions = []
    for r in region_result:
        regions.append({
            "region": r.region,
            "city": r.city,
            "unique_users": r.unique_users,
            "total_visits": r.total_visits,
        })

    # Qurilma turlari bo'yicha
    device_result = await db.execute(
        select(
            UserGeoLog.device_type,
            func.count(distinct(UserGeoLog.user_id)).label("count"),
        ).where(UserGeoLog.created_at >= start_date)
        .group_by(UserGeoLog.device_type)
    )
    devices = {r.device_type or "unknown": r.count for r in device_result}

    # Browser bo'yicha
    browser_result = await db.execute(
        select(
            UserGeoLog.browser,
            func.count(distinct(UserGeoLog.user_id)).label("count"),
        ).where(UserGeoLog.created_at >= start_date)
        .group_by(UserGeoLog.browser)
        .order_by(func.count(distinct(UserGeoLog.user_id)).desc())
    )
    browsers = {r.browser or "unknown": r.count for r in browser_result}

    # OS bo'yicha
    os_result = await db.execute(
        select(
            UserGeoLog.os,
            func.count(distinct(UserGeoLog.user_id)).label("count"),
        ).where(UserGeoLog.created_at >= start_date)
        .group_by(UserGeoLog.os)
    )
    os_stats = {r.os or "unknown": r.count for r in os_result}

    # ISP bo'yicha top 10
    isp_result = await db.execute(
        select(
            UserGeoLog.isp,
            func.count(distinct(UserGeoLog.user_id)).label("count"),
        ).where(
            UserGeoLog.created_at >= start_date,
            UserGeoLog.isp.isnot(None),
        )
        .group_by(UserGeoLog.isp)
        .order_by(func.count(distinct(UserGeoLog.user_id)).desc())
        .limit(10)
    )
    isps = {r.isp: r.count for r in isp_result}

    return {
        "period": period,
        "regions": regions,
        "devices": devices,
        "browsers": browsers,
        "os": os_stats,
        "isps": isps,
        "total_geo_records": (await db.execute(
            select(func.count(UserGeoLog.id)).where(UserGeoLog.created_at >= start_date)
        )).scalar() or 0,
    }


# ============================================================================
# AUDIT LOG
# ============================================================================

@router.get("/analytics/audit-log")
async def get_audit_log(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
    action: Optional[str] = None,
    admin_role: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Admin harakatlari logi"""
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    count_stmt = select(func.count(AuditLog.id))

    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action}%"))
        count_stmt = count_stmt.where(AuditLog.action.ilike(f"%{action}%"))
    if admin_role:
        stmt = stmt.where(AuditLog.admin_role == admin_role)
        count_stmt = count_stmt.where(AuditLog.admin_role == admin_role)

    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(limit))
    logs = result.scalars().all()

    return {
        "total": total,
        "logs": [
            {
                "id": log.id,
                "admin_role": log.admin_role,
                "action": log.action,
                "action_type": log.action_type,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "target_name": log.target_name,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }


# ============================================================================
# ADMIN NOTIFICATIONS
# ============================================================================

@router.get("/analytics/notifications")
async def get_admin_notifications(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100),
):
    """Admin bildirishnomalari"""
    stmt = select(AdminNotification).order_by(AdminNotification.created_at.desc())

    if unread_only:
        stmt = stmt.where(AdminNotification.is_read == False)

    result = await db.execute(stmt.limit(limit))
    notifs = result.scalars().all()

    role = admin["role"]
    return {
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "category": n.category,
                "action_url": n.action_url,
                "is_read": role in (n.read_by or []),
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifs
        ],
        "unread_count": sum(1 for n in notifs if role not in (n.read_by or [])),
    }


@router.post("/analytics/notifications/{notif_id}/read")
async def mark_notification_read(
    notif_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Bildirishnomani o'qilgan deb belgilash"""
    result = await db.execute(select(AdminNotification).where(AdminNotification.id == notif_id))
    notif = result.scalars().first()
    if not notif:
        raise HTTPException(status_code=404, detail="Topilmadi")

    role = admin["role"]
    read_by = notif.read_by or []
    if role not in read_by:
        read_by.append(role)
        notif.read_by = read_by
        if len(read_by) >= len(ADMIN_KEYS):
            notif.is_read = True
        await db.commit()

    return {"message": "O'qildi"}


@router.post("/analytics/notifications/read-all")
async def mark_all_notifications_read(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Barcha bildirishnomalarni o'qilgan deb belgilash"""
    role = admin["role"]
    result = await db.execute(select(AdminNotification).where(AdminNotification.is_read == False))
    notifs = result.scalars().all()

    for n in notifs:
        read_by = n.read_by or []
        if role not in read_by:
            read_by.append(role)
            n.read_by = read_by
            if len(read_by) >= len(ADMIN_KEYS):
                n.is_read = True

    await db.commit()
    return {"message": f"{len(notifs)} ta o'qildi"}


# ============================================================================
# USER SEGMENTS
# ============================================================================

@router.get("/analytics/segments")
async def user_segments(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Foydalanuvchi segmentlari"""
    now = datetime.now(timezone.utc)
    today = now.date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    three_months_ago = today - timedelta(days=90)

    # 1. Yangi (oxirgi 7 kunda ro'yxatdan o'tgan)
    new_users = (await db.execute(
        select(func.count(User.id)).where(cast(User.created_at, Date) >= week_ago)
    )).scalar() or 0

    # 2. Faol (oxirgi 7 kunda login qilgan)
    active_last_week = (await db.execute(
        select(func.count(distinct(UserGeoLog.user_id))).where(
            cast(UserGeoLog.created_at, Date) >= week_ago,
            UserGeoLog.action == "login"
        )
    )).scalar() or 0

    # 3. O'rtacha faol (7-30 kun ichida login)
    moderate_active = (await db.execute(
        select(func.count(distinct(UserGeoLog.user_id))).where(
            cast(UserGeoLog.created_at, Date) >= month_ago,
            cast(UserGeoLog.created_at, Date) < week_ago,
            UserGeoLog.action == "login"
        )
    )).scalar() or 0

    # 4. Nofaol (30+ kun login qilmagan lekin ro'yxatdan o'tgan)
    total = (await db.execute(select(func.count(User.id)))).scalar() or 0

    # 5. Obunador (faol obunasi bor)
    subscribers = (await db.execute(
        select(func.count(distinct(UserSubscription.user_id))).where(
            UserSubscription.status == SubscriptionStatus.active
        )
    )).scalar() or 0

    # 6. Coin boylar (top)
    rich_users = (await db.execute(
        select(func.count(StudentCoin.id)).where(StudentCoin.current_balance > 100)
    )).scalar() or 0

    return {
        "segments": [
            {"name": "Yangi", "slug": "new", "count": new_users, "color": "#10b981", "description": "Oxirgi 7 kunda ro'yxatdan o'tgan"},
            {"name": "Faol", "slug": "active", "count": active_last_week, "color": "#3b82f6", "description": "Oxirgi 7 kunda login qilgan"},
            {"name": "O'rtacha faol", "slug": "moderate", "count": moderate_active, "color": "#f59e0b", "description": "7-30 kun ichida login qilgan"},
            {"name": "Obunador", "slug": "subscribers", "count": subscribers, "color": "#8b5cf6", "description": "Faol obunasi bor"},
            {"name": "Coin boylar", "slug": "rich", "count": rich_users, "color": "#eab308", "description": "100+ coin balansli"},
        ],
        "total_users": total,
    }


# ============================================================================
# SUBSCRIPTION HEALTH
# ============================================================================

@router.get("/analytics/subscription-health")
async def subscription_health(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Obuna salomatligi — expiring, expired, revenue trend"""
    now = datetime.now(timezone.utc)
    today = now.date()

    # 3 kun ichida tugaydigan obunalar
    expiring_3d = (await db.execute(
        select(func.count(UserSubscription.id)).where(
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.expires_at <= now + timedelta(days=3),
            UserSubscription.expires_at > now,
        )
    )).scalar() or 0

    # 7 kun ichida tugaydigan
    expiring_7d = (await db.execute(
        select(func.count(UserSubscription.id)).where(
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.expires_at <= now + timedelta(days=7),
            UserSubscription.expires_at > now,
        )
    )).scalar() or 0

    # Muddati o'tgan (lekin hali bekor qilinmagan)
    stale_expired = (await db.execute(
        select(func.count(UserSubscription.id)).where(
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.expires_at <= now,
        )
    )).scalar() or 0

    # Plan bo'yicha breakdown
    plan_result = await db.execute(
        select(
            SubscriptionPlanConfig.name,
            SubscriptionPlanConfig.price,
            func.count(UserSubscription.id).label("active_count"),
            func.sum(UserSubscription.amount_paid).label("revenue"),
        ).join(
            UserSubscription,
            UserSubscription.plan_config_id == SubscriptionPlanConfig.id
        ).where(
            UserSubscription.status == SubscriptionStatus.active
        ).group_by(SubscriptionPlanConfig.id)
    )
    plans = [
        {
            "name": r.name,
            "price": r.price,
            "active_count": r.active_count,
            "revenue": int(r.revenue or 0),
        }
        for r in plan_result
    ]

    # Expiring soon list (3 kun)
    expiring_list_result = await db.execute(
        select(
            UserSubscription.user_id,
            UserSubscription.expires_at,
            SubscriptionPlanConfig.name.label("plan_name"),
            User.first_name,
            User.last_name,
            User.phone,
        ).join(
            SubscriptionPlanConfig,
            UserSubscription.plan_config_id == SubscriptionPlanConfig.id
        ).join(
            User, User.id == UserSubscription.user_id
        ).where(
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.expires_at <= now + timedelta(days=7),
            UserSubscription.expires_at > now,
        ).order_by(UserSubscription.expires_at.asc())
        .limit(20)
    )
    expiring_users = [
        {
            "user_id": r.user_id,
            "name": f"{r.first_name} {r.last_name}",
            "phone": r.phone,
            "plan_name": r.plan_name,
            "expires_at": r.expires_at.isoformat() if r.expires_at else None,
        }
        for r in expiring_list_result
    ]

    return {
        "expiring_3d": expiring_3d,
        "expiring_7d": expiring_7d,
        "stale_expired": stale_expired,
        "plans": plans,
        "expiring_users": expiring_users,
    }


# ============================================================================
# AUTO-EXPIRE SUBSCRIPTIONS
# ============================================================================

@router.post("/analytics/expire-subscriptions")
async def auto_expire_subscriptions(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    """Muddati o'tgan obunalarni avtomatik expired qilish"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(UserSubscription).where(
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.expires_at <= now,
        )
    )
    expired_subs = result.scalars().all()

    count = 0
    for sub in expired_subs:
        sub.status = SubscriptionStatus.expired
        count += 1

    if count > 0:
        await db.commit()
        # Audit log
        await write_audit_log(
            db, admin["role"], "subscription.auto_expire",
            target_type="subscriptions",
            details={"expired_count": count},
            action_type="warning",
        )

    return {"message": f"{count} ta obuna expired qilindi", "count": count}


# ============================================================================
# RECENT USER LOGINS (so'nggi loginlar ro'yxati)
# ============================================================================

@router.get("/analytics/recent-logins")
async def recent_logins(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(30, ge=1, le=100),
):
    """So'nggi login qilgan foydalanuvchilar"""
    result = await db.execute(
        select(
            UserGeoLog.user_id,
            UserGeoLog.ip_address,
            UserGeoLog.region,
            UserGeoLog.city,
            UserGeoLog.device_type,
            UserGeoLog.browser,
            UserGeoLog.os,
            UserGeoLog.created_at,
            User.first_name,
            User.last_name,
            User.role,
            User.phone,
        ).join(
            User, User.id == UserGeoLog.user_id
        ).where(
            UserGeoLog.action == "login"
        ).order_by(UserGeoLog.created_at.desc())
        .limit(limit)
    )
    logins = [
        {
            "user_id": r.user_id,
            "name": f"{r.first_name} {r.last_name}",
            "role": r.role.value if r.role else None,
            "phone": r.phone,
            "ip": r.ip_address,
            "region": r.region,
            "city": r.city,
            "device": r.device_type,
            "browser": r.browser,
            "os": r.os,
            "time": r.created_at.isoformat() if r.created_at else None,
        }
        for r in result
    ]

    return {"logins": logins}
