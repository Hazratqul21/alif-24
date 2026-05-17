"""
Multi-Stage Olympiad Router — Ko'p bosqichli olimpiada endpointlari
Admin: yaratish, statistika, bosqich yakunlash
O'quvchi: ro'yxatdan o'tish, dashboard, leaderboard
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sql_func, select, and_
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import math
import logging

from shared.database import get_db
from shared.database.models import User, StudentProfile, UserRole
from shared.database.models.olympiad import (
    Olympiad, OlympiadQuestion, OlympiadParticipant, OlympiadStatus,
    OlympiadReadingTask, ParticipationStatus
)
from shared.database.models.olympiad_content import OlympiadStory
from shared.database.models.olympiad_stage import (
    OlympiadStage, OlympiadStageResult, ScopeType, StageContentType
)
from shared.constants.regions import REGIONS, validate_region, validate_district
from app.core.config import settings

logger = logging.getLogger("olimp")

multi_stage_router = APIRouter(prefix="/multi-stage", tags=["multi-stage"])


# ============= Pydantic Schemas =============

class StageCreate(BaseModel):
    stage_number: int = Field(..., ge=1, le=5)
    title: Optional[str] = None
    scope_type: str = "school"
    content_type: str = "test"
    start_time: datetime
    end_time: datetime
    requirements: Optional[str] = None
    passing_percent: float = Field(default=30.0, ge=1, le=100)
    passing_min_count: int = Field(default=1, ge=1)


class MultiStageOlympiadCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    registration_start: datetime
    registration_end: datetime
    allowed_classes: Optional[List[int]] = None
    min_age: int = Field(default=4, ge=1)
    max_age: int = Field(default=18, ge=1)
    banner_image: Optional[str] = None
    stages: List[StageCreate]


class MultiStageRegister(BaseModel):
    region: str
    district: str
    school_number: int = Field(..., ge=1, le=9999)
    class_number: Optional[int] = Field(default=None, ge=1, le=11)
    student_id: Optional[str] = None


class RegistrationTimeUpdate(BaseModel):
    registration_end: datetime


# ============= Admin Auth =============

async def verify_admin_key(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    if x_admin_key and x_admin_key == settings.ADMIN_SECRET_KEY:
        return True
    raise HTTPException(status_code=403, detail="Admin emas")


# ============= Foizli kvota formulasi =============

def calculate_passing_count(total: int, percent: float, min_count: int) -> int:
    """
    total=10, percent=30 → 3 kishi
    total=2,  percent=30 → ceiling(0.6)=1
    """
    if total <= 0:
        return 0
    raw = total * (percent / 100.0)
    count = max(math.ceil(raw), min_count)
    return min(count, total)


# ============= ADMIN: Yaratish =============

@multi_stage_router.post("/admin/create")
async def create_multi_stage_olympiad(
    data: MultiStageOlympiadCreate,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin_key),
):
    """Ko'p bosqichli olimpiada yaratish"""
    if not data.stages or len(data.stages) < 2:
        raise HTTPException(400, "Kamida 2 ta bosqich kerak")
    if len(data.stages) > 5:
        raise HTTPException(400, "Maksimum 5 ta bosqich")

    # Olimpiada yaratish
    first_stage = min(data.stages, key=lambda s: s.start_time)
    last_stage = max(data.stages, key=lambda s: s.end_time)

    olympiad = Olympiad(
        title=data.title,
        description=data.description,
        registration_start=data.registration_start,
        registration_end=data.registration_end,
        start_time=first_stage.start_time,
        end_time=last_stage.end_time,
        min_age=data.min_age,
        max_age=data.max_age,
        banner_image=data.banner_image,
        allowed_classes=data.allowed_classes,
        is_multi_stage=True,
        total_stages=len(data.stages),
        status=OlympiadStatus.draft,
    )
    db.add(olympiad)
    await db.flush()

    # Bosqichlarni yaratish
    stages_out = []
    for s in data.stages:
        stage = OlympiadStage(
            olympiad_id=olympiad.id,
            stage_number=s.stage_number,
            title=s.title or f"{s.stage_number}-bosqich",
            scope_type=ScopeType(s.scope_type),
            content_type=StageContentType(s.content_type),
            start_time=s.start_time,
            end_time=s.end_time,
            requirements=s.requirements,
            passing_percent=s.passing_percent,
            passing_min_count=s.passing_min_count,
        )
        db.add(stage)
        await db.flush()
        stages_out.append({
            "id": stage.id,
            "stage_number": stage.stage_number,
            "scope_type": stage.scope_type.value,
            "content_type": stage.content_type.value,
        })

    await db.commit()

    return {
        "success": True,
        "data": {
            "olympiad_id": olympiad.id,
            "title": olympiad.title,
            "total_stages": olympiad.total_stages,
            "stages": stages_out,
        }
    }


# ============= ADMIN: Vaqtni uzaytirish =============

@multi_stage_router.put("/admin/{olympiad_id}/registration-time")
async def update_registration_time(
    olympiad_id: str,
    data: RegistrationTimeUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin_key),
):
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(404, "Olimpiada topilmadi")

    olympiad.registration_end = data.registration_end
    await db.commit()

    return {"success": True, "message": "Ro'yxatdan o'tish vaqti yangilandi"}


# ============= ADMIN: Statistika =============

@multi_stage_router.get("/admin/{olympiad_id}/stats")
async def get_olympiad_stats(
    olympiad_id: str,
    region: Optional[str] = None,
    district: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin_key),
):
    """Viloyat → Tuman → Maktab drill-down statistikasi"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(404, "Olimpiada topilmadi")

    base_q = select(OlympiadParticipant).where(
        OlympiadParticipant.olympiad_id == olympiad_id
    )

    # Maktab darajasi (district va region berilgan)
    if region and district:
        q = base_q.where(
            OlympiadParticipant.region == region,
            OlympiadParticipant.district == district,
        )
        result = await db.execute(q)
        participants = result.scalars().all()

        schools = {}
        for p in participants:
            key = p.school_number or 0
            if key not in schools:
                schools[key] = {"school_number": key, "count": 0, "students": []}
            schools[key]["count"] += 1
            # Student info
            u_res = await db.execute(select(User).where(
                User.id == (await db.execute(
                    select(StudentProfile.user_id).where(StudentProfile.id == p.student_id)
                )).scalar()
            ))
            user = u_res.scalars().first()
            schools[key]["students"].append({
                "participant_id": p.id,
                "name": f"{user.first_name} {user.last_name}" if user else "—",
                "class": p.class_number,
                "current_stage": p.current_stage,
            })

        return {
            "success": True,
            "level": "schools",
            "region": region,
            "district": district,
            "data": sorted(schools.values(), key=lambda x: x["school_number"]),
        }

    # Tuman darajasi (faqat region berilgan)
    if region:
        q = select(
            OlympiadParticipant.district,
            sql_func.count(OlympiadParticipant.id)
        ).where(
            OlympiadParticipant.olympiad_id == olympiad_id,
            OlympiadParticipant.region == region,
        ).group_by(OlympiadParticipant.district)

        result = await db.execute(q)
        districts = [{"district": r[0] or "Noma'lum", "count": r[1]} for r in result.all()]

        return {
            "success": True,
            "level": "districts",
            "region": region,
            "data": sorted(districts, key=lambda x: x["district"]),
        }

    # Viloyat darajasi (hech narsa berilmagan)
    q = select(
        OlympiadParticipant.region,
        sql_func.count(OlympiadParticipant.id)
    ).where(
        OlympiadParticipant.olympiad_id == olympiad_id
    ).group_by(OlympiadParticipant.region)

    result = await db.execute(q)
    regions = [{"region": r[0] or "Noma'lum", "count": r[1]} for r in result.all()]

    total = sum(r["count"] for r in regions)

    return {
        "success": True,
        "level": "regions",
        "total_participants": total,
        "data": sorted(regions, key=lambda x: x["region"]),
    }


# ============= ADMIN: Bosqich yakunlash =============

@multi_stage_router.post("/admin/{olympiad_id}/stages/{stage_id}/finalize")
async def finalize_stage(
    olympiad_id: str,
    stage_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin_key),
):
    """Bosqichni yakunlash — foizli kvota bilan g'oliblarni aniqlash"""
    stage_res = await db.execute(
        select(OlympiadStage).where(
            OlympiadStage.id == stage_id,
            OlympiadStage.olympiad_id == olympiad_id,
        )
    )
    stage = stage_res.scalars().first()
    if not stage:
        raise HTTPException(404, "Bosqich topilmadi")

    # Shu bosqichdagi barcha natijalarni olish
    results_q = await db.execute(
        select(OlympiadStageResult).where(OlympiadStageResult.stage_id == stage_id)
    )
    results = results_q.scalars().all()
    if not results:
        raise HTTPException(400, "Bu bosqichda natijalar yo'q")

    # Participant ma'lumotlarini olish
    p_ids = [r.participant_id for r in results]
    p_res = await db.execute(
        select(OlympiadParticipant).where(OlympiadParticipant.id.in_(p_ids))
    )
    participants = {p.id: p for p in p_res.scalars().all()}

    # Scope bo'yicha guruhlash
    groups = {}
    for r in results:
        p = participants.get(r.participant_id)
        if not p:
            continue

        if stage.scope_type == ScopeType.school:
            key = f"{p.region}|{p.district}|{p.school_number}"
        elif stage.scope_type == ScopeType.district:
            key = f"{p.region}|{p.district}"
        elif stage.scope_type == ScopeType.region:
            key = f"{p.region}"
        else:
            key = "republic"

        if key not in groups:
            groups[key] = []
        groups[key].append((r, p))

    # Har bir guruhda reytinglash va o'tkazish
    total_passed = 0
    total_failed = 0

    for group_key, members in groups.items():
        # Score bo'yicha kamayish, vaqt bo'yicha o'sish
        sorted_members = sorted(members, key=lambda x: (-x[0].score, x[0].duration_seconds))

        pass_count = calculate_passing_count(
            len(sorted_members), stage.passing_percent, stage.passing_min_count
        )

        for i, (result, participant) in enumerate(sorted_members):
            result.rank_in_group = i + 1
            if i < pass_count:
                result.is_passed = True
                participant.current_stage = stage.stage_number + 1
                total_passed += 1
            else:
                result.is_passed = False
                total_failed += 1

    await db.commit()

    return {
        "success": True,
        "data": {
            "stage_number": stage.stage_number,
            "groups_count": len(groups),
            "total_passed": total_passed,
            "total_failed": total_failed,
        }
    }


# ============= O'QUVCHI: Ro'yxatdan o'tish =============

@multi_stage_router.post("/{olympiad_id}/register")
async def register_multi_stage(
    olympiad_id: str,
    data: MultiStageRegister,
    db: AsyncSession = Depends(get_db),
):
    """Ko'p bosqichli olimpiadaga viloyat/tuman/maktab bilan ro'yxatdan o'tish"""
    # Olimpiadani tekshirish
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(404, "Olimpiada topilmadi")
    if not olympiad.is_multi_stage:
        raise HTTPException(400, "Bu oddiy olimpiada — ko'p bosqichli emas")

    now = datetime.now(timezone.utc)
    if olympiad.registration_start and now < olympiad.registration_start:
        raise HTTPException(400, "Ro'yxatdan o'tish hali boshlanmagan")
    if olympiad.registration_end and now > olympiad.registration_end:
        raise HTTPException(400, "Ro'yxatdan o'tish muddati tugagan")

    # Viloyat/tuman validatsiyasi
    if not validate_region(data.region):
        raise HTTPException(400, f"Noto'g'ri viloyat: {data.region}")
    if not validate_district(data.region, data.district):
        raise HTTPException(400, f"Noto'g'ri tuman: {data.district}")

    # Resolve student profile
    user_id = data.student_id
    if not user_id:
        raise HTTPException(401, "student_id is required")

    sp = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user_id))
    profile = sp.scalars().first()
    if not profile:
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalars().first()
        if not user:
            raise HTTPException(400, "Foydalanuvchi topilmadi")
        profile = StudentProfile(user_id=user_id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    # Check if already registered
    exist_res = await db.execute(
        select(OlympiadParticipant).where(
            OlympiadParticipant.olympiad_id == olympiad_id,
            OlympiadParticipant.student_id == profile.id
        )
    )
    existing = exist_res.scalars().first()
    if existing:
        raise HTTPException(400, "Siz allaqachon ro'yxatdan o'tgansiz")

    participant = OlympiadParticipant(
        olympiad_id=olympiad_id,
        student_id=profile.id,
        status=ParticipationStatus.registered,
        region=data.region,
        district=data.district,
        school_number=data.school_number,
        class_number=data.class_number,
        current_stage=1,
    )
    db.add(participant)
    await db.commit()
    await db.refresh(participant)

    return {
        "success": True,
        "message": "Muvaffaqiyatli ro'yxatdan o'tdingiz",
        "data": {
            "id": participant.id,
            "olympiad_id": participant.olympiad_id,
            "student_id": user_id,
            "registered_at": participant.registered_at.isoformat() if participant.registered_at else None,
        }
    }


# ============= O'QUVCHI: Dashboard =============

@multi_stage_router.get("/{olympiad_id}/dashboard")
async def get_student_dashboard(
    olympiad_id: str,
    student_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """O'quvchining ko'p bosqichli olimpiada dashboard-i"""
    if not student_id:
        raise HTTPException(401, "student_id kerak")

    # Olimpiada
    o_res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = o_res.scalars().first()
    if not olympiad:
        raise HTTPException(404, "Olimpiada topilmadi")

    # Student profile
    sp = await db.execute(select(StudentProfile).where(StudentProfile.user_id == student_id))
    profile = sp.scalars().first()
    if not profile:
        raise HTTPException(404, "Profil topilmadi")

    # Participant
    p_res = await db.execute(
        select(OlympiadParticipant).where(
            OlympiadParticipant.olympiad_id == olympiad_id,
            OlympiadParticipant.student_id == profile.id,
        )
    )
    participant = p_res.scalars().first()
    if not participant:
        raise HTTPException(404, "Siz bu olimpiadaga yozilmagansiz")

    # Bosqichlar
    stages_res = await db.execute(
        select(OlympiadStage).where(OlympiadStage.olympiad_id == olympiad_id)
        .order_by(OlympiadStage.stage_number)
    )
    stages = stages_res.scalars().all()

    # Natijalar
    sr_res = await db.execute(
        select(OlympiadStageResult).where(
            OlympiadStageResult.participant_id == participant.id
        )
    )
    my_results = {r.stage_id: r for r in sr_res.scalars().all()}

    now = datetime.now(timezone.utc)

    stages_out = []
    for s in stages:
        result = my_results.get(s.id)
        is_accessible = participant.current_stage >= s.stage_number
        is_active = s.start_time and s.end_time and s.start_time <= now <= s.end_time

        stage_data = {
            "id": s.id,
            "stage_number": s.stage_number,
            "title": s.title,
            "scope_type": s.scope_type.value,
            "content_type": s.content_type.value,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "is_accessible": is_accessible,
            "is_active": is_active,
            # Shartlar faqat shu bosqichga o'tganlarga ko'rinadi
            "requirements": s.requirements if is_accessible else None,
        }

        if result:
            stage_data["my_result"] = {
                "score": result.score,
                "rank": result.rank_in_group,
                "is_passed": result.is_passed,
            }

        stages_out.append(stage_data)

    # User info
    u_res = await db.execute(select(User).where(User.id == student_id))
    user = u_res.scalars().first()

    return {
        "success": True,
        "data": {
            "student": {
                "name": f"{user.first_name} {user.last_name}" if user else "—",
                "region": participant.region,
                "district": participant.district,
                "school_number": participant.school_number,
                "class_number": participant.class_number,
                "current_stage": participant.current_stage,
            },
            "olympiad": {
                "id": olympiad.id,
                "title": olympiad.title,
                "total_stages": olympiad.total_stages,
            },
            "stages": stages_out,
        }
    }


# ============= O'QUVCHI: Leaderboard =============

@multi_stage_router.get("/{olympiad_id}/stages/{stage_id}/leaderboard")
async def get_stage_leaderboard(
    olympiad_id: str,
    stage_id: str,
    student_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Bosqich bo'yicha raqiblar jadvali (scope filtrlangan)"""
    stage_res = await db.execute(
        select(OlympiadStage).where(
            OlympiadStage.id == stage_id,
            OlympiadStage.olympiad_id == olympiad_id,
        )
    )
    stage = stage_res.scalars().first()
    if not stage:
        raise HTTPException(404, "Bosqich topilmadi")

    # O'quvchining ma'lumotlarini olish (scope filtrlash uchun)
    my_participant = None
    if student_id:
        sp = await db.execute(select(StudentProfile).where(StudentProfile.user_id == student_id))
        profile = sp.scalars().first()
        if profile:
            p_res = await db.execute(
                select(OlympiadParticipant).where(
                    OlympiadParticipant.olympiad_id == olympiad_id,
                    OlympiadParticipant.student_id == profile.id,
                )
            )
            my_participant = p_res.scalars().first()

    # Barcha natijalar
    results_q = select(OlympiadStageResult).where(
        OlympiadStageResult.stage_id == stage_id
    )
    all_results = (await db.execute(results_q)).scalars().all()

    # Participant ma'lumotlarini olish
    p_ids = [r.participant_id for r in all_results]
    if not p_ids:
        return {"success": True, "data": {"leaderboard": [], "scope": stage.scope_type.value}}

    p_res = await db.execute(
        select(OlympiadParticipant).where(OlympiadParticipant.id.in_(p_ids))
    )
    participants = {p.id: p for p in p_res.scalars().all()}

    # Scope filtrlash
    filtered = []
    for r in all_results:
        p = participants.get(r.participant_id)
        if not p:
            continue

        if my_participant and stage.scope_type == ScopeType.school:
            if (p.region != my_participant.region or
                p.district != my_participant.district or
                p.school_number != my_participant.school_number):
                continue
        elif my_participant and stage.scope_type == ScopeType.district:
            if (p.region != my_participant.region or
                p.district != my_participant.district):
                continue
        elif my_participant and stage.scope_type == ScopeType.region:
            if p.region != my_participant.region:
                continue

        filtered.append((r, p))

    # Reytinglash
    sorted_results = sorted(filtered, key=lambda x: (-x[0].score, x[0].duration_seconds))

    # User ism-shariflarini olish
    student_ids = list({p.student_id for _, p in sorted_results})
    sp_res = await db.execute(
        select(StudentProfile).where(StudentProfile.id.in_(student_ids))
    )
    profiles = {sp.id: sp for sp in sp_res.scalars().all()}

    user_ids = [profiles[sid].user_id for sid in student_ids if sid in profiles]
    u_res = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = {u.id: u for u in u_res.scalars().all()}

    leaderboard = []
    for i, (result, participant) in enumerate(sorted_results):
        prof = profiles.get(participant.student_id)
        user = users.get(prof.user_id) if prof else None
        leaderboard.append({
            "rank": i + 1,
            "name": f"{user.first_name} {user.last_name}" if user else "—",
            "school_number": participant.school_number,
            "score": result.score,
            "duration_seconds": result.duration_seconds,
            "is_passed": result.is_passed,
            "is_me": participant.id == my_participant.id if my_participant else False,
        })

    return {
        "success": True,
        "data": {
            "scope": stage.scope_type.value,
            "total": len(leaderboard),
            "leaderboard": leaderboard,
        }
    }


# ============= REGIONS API =============

@multi_stage_router.get("/regions")
async def get_regions():
    """14 ta viloyat va ularning tumanlari"""
    return {
        "success": True,
        "data": {
            "regions": [
                {"name": name, "districts": districts}
                for name, districts in REGIONS.items()
            ]
        }
    }
