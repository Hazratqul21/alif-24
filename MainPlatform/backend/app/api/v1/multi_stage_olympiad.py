"""
Multi-Stage Olympiad Router wrapper for MainPlatform backend.
Reuses all logic from shared models and database.
Admin creates multi-stage olympiads from the admin panel.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sql_func, select
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import math
import logging

from shared.database import get_db
from shared.database.models.olympiad import Olympiad, OlympiadStatus, OlympiadParticipant
from shared.database.models.olympiad_stage import (
    OlympiadStage, OlympiadStageResult, ScopeType, StageContentType
)
from shared.constants.regions import REGIONS, validate_region, validate_district
import os as _os
_ADMIN_SECRET = _os.getenv("ADMIN_SECRET_KEY", "change_me_in_env")

logger = logging.getLogger("multi_stage")

router = APIRouter()


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


# ============= Admin Auth =============

async def verify_admin(x_admin_key: str = Header("", alias="X-Admin-Key")):
    if x_admin_key and x_admin_key == _ADMIN_SECRET:
        return True
    raise HTTPException(status_code=403, detail="Admin emas")


# ============= Foizli kvota formulasi =============

def calculate_passing_count(total: int, percent: float, min_count: int) -> int:
    if total <= 0:
        return 0
    raw = total * (percent / 100.0)
    count = max(math.ceil(raw), min_count)
    return min(count, total)


# ============= ADMIN: Yaratish =============

@router.post("/admin/create")
async def create_multi_stage_olympiad(
    data: MultiStageOlympiadCreate,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin),
):
    """Ko'p bosqichli olimpiada yaratish"""
    if not data.stages or len(data.stages) < 2:
        raise HTTPException(400, "Kamida 2 ta bosqich kerak")
    if len(data.stages) > 5:
        raise HTTPException(400, "Maksimum 5 ta bosqich")

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


# ============= ADMIN: Statistika =============

@router.get("/admin/{olympiad_id}/stats")
async def get_multi_stage_stats(
    olympiad_id: str,
    region: Optional[str] = None,
    district: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin),
):
    """Viloyat → Tuman → Maktab drill-down statistikasi"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(404, "Olimpiada topilmadi")

    base_q = select(OlympiadParticipant).where(
        OlympiadParticipant.olympiad_id == olympiad_id
    )

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
                schools[key] = {"school_number": key, "count": 0}
            schools[key]["count"] += 1
        return {
            "success": True, "level": "schools",
            "region": region, "district": district,
            "data": sorted(schools.values(), key=lambda x: x["school_number"]),
        }

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
            "success": True, "level": "districts", "region": region,
            "data": sorted(districts, key=lambda x: x["district"]),
        }

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
        "success": True, "level": "regions", "total_participants": total,
        "data": sorted(regions, key=lambda x: x["region"]),
    }


# ============= ADMIN: Bosqich yakunlash =============

@router.post("/admin/{olympiad_id}/stages/{stage_id}/finalize")
async def finalize_stage(
    olympiad_id: str,
    stage_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin),
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

    results_q = await db.execute(
        select(OlympiadStageResult).where(OlympiadStageResult.stage_id == stage_id)
    )
    results = results_q.scalars().all()
    if not results:
        raise HTTPException(400, "Bu bosqichda natijalar yo'q")

    p_ids = [r.participant_id for r in results]
    p_res = await db.execute(
        select(OlympiadParticipant).where(OlympiadParticipant.id.in_(p_ids))
    )
    participants = {p.id: p for p in p_res.scalars().all()}

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

    total_passed = 0
    total_failed = 0
    for group_key, members in groups.items():
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


# ============= REGIONS API =============

@router.get("/regions")
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
