"""
Admin Dashboard API
Махсус админ панель учун
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta
from app.core.database import get_db
from typing import Optional
import os

router = APIRouter()

# Махфий калит - фақат админ билади
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "nurali_secret_2026")


def verify_admin_key(x_admin_key: Optional[str] = Header(None)):
    """Admin калитини текшириш"""
    if not x_admin_key or x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Access denied")
    return True


@router.get("/stats")
async def get_platform_stats(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    """
    Платформа статистикаси
    """
    try:
        # Умумий статистика
        stats_query = text("""
            SELECT 
                COUNT(*) as jami_foydalanuvchilar,
                COUNT(CASE WHEN role = 'student' THEN 1 END) as oquvchilar,
                COUNT(CASE WHEN role = 'teacher' THEN 1 END) as oqituvchilar,
                COUNT(CASE WHEN role = 'parent' THEN 1 END) as ota_onalar,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as oxirgi_hafta,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as oxirgi_oy,
                COUNT(CASE WHEN is_active = true THEN 1 END) as faol_foydalanuvchilar,
                COUNT(CASE WHEN is_verified = true THEN 1 END) as tasdiqlangan
            FROM users
        """)
        
        result = db.execute(stats_query).fetchone()
        
        # SmartReader статистикаси
        reading_query = text("""
            SELECT 
                COUNT(*) as jami_tahlillar,
                SUM(total_words_read) as jami_sozlar,
                COUNT(DISTINCT user_id) as oqugan_foydalanuvchilar,
                COUNT(CASE WHEN session_date > NOW() - INTERVAL '7 days' THEN 1 END) as oxirgi_hafta_tahlillar
            FROM reading_analyses
        """)
        
        reading_result = db.execute(reading_query).fetchone()
        
        return {
            "users": {
                "total": result[0],
                "students": result[1],
                "teachers": result[2],
                "parents": result[3],
                "last_week": result[4],
                "last_month": result[5],
                "active": result[6],
                "verified": result[7]
            },
            "reading": {
                "total_analyses": reading_result[0] if reading_result[0] else 0,
                "total_words": reading_result[1] if reading_result[1] else 0,
                "users_reading": reading_result[2] if reading_result[2] else 0,
                "last_week_analyses": reading_result[3] if reading_result[3] else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")


@router.get("/users")
async def get_users_list(
    limit: int = 50,
    offset: int = 0,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    """
    Фойдаланувчилар рўйхати
    """
    try:
        # Base query
        query = text("""
            SELECT 
                id,
                first_name || ' ' || last_name as ism,
                email,
                role,
                is_active,
                is_verified,
                TO_CHAR(created_at, 'DD.MM.YYYY HH24:MI') as royxatdan_otgan,
                TO_CHAR(last_login_at, 'DD.MM.YYYY HH24:MI') as oxirgi_kirish
            FROM users
            WHERE (:role IS NULL OR role = :role)
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """)
        
        users = db.execute(
            query, 
            {"role": role, "limit": limit, "offset": offset}
        ).fetchall()
        
        # Total count
        count_query = text("""
            SELECT COUNT(*) FROM users
            WHERE (:role IS NULL OR role = :role)
        """)
        total = db.execute(count_query, {"role": role}).fetchone()[0]
        
        return {
            "users": [
                {
                    "id": str(user[0]),
                    "name": user[1],
                    "email": user[2],
                    "role": user[3],
                    "is_active": user[4],
                    "is_verified": user[5],
                    "registered_at": user[6],
                    "last_login": user[7]
                }
                for user in users
            ],
            "total": total,
            "page": offset // limit + 1,
            "pages": (total + limit - 1) // limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")


@router.get("/reading-analyses")
async def get_reading_analyses(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_admin_key)
):
    """
    SmartReader таҳлиллар рўйхати
    """
    try:
        query = text("""
            SELECT 
                ra.id,
                u.first_name || ' ' || u.last_name as user_name,
                u.email,
                ra.story_title,
                ra.total_words_read,
                ra.pronunciation_score,
                ra.comprehension_score,
                ra.speech_errors,
                TO_CHAR(ra.session_date, 'DD.MM.YYYY HH24:MI') as session_date
            FROM reading_analyses ra
            JOIN users u ON ra.user_id = u.id
            ORDER BY ra.session_date DESC
            LIMIT :limit OFFSET :offset
        """)
        
        analyses = db.execute(query, {"limit": limit, "offset": offset}).fetchall()
        
        count_query = text("SELECT COUNT(*) FROM reading_analyses")
        total = db.execute(count_query).fetchone()[0]
        
        return {
            "analyses": [
                {
                    "id": str(a[0]),
                    "user_name": a[1],
                    "email": a[2],
                    "story_title": a[3],
                    "words_read": a[4],
                    "pronunciation": a[5],
                    "comprehension": a[6],
                    "errors": a[7],
                    "date": a[8]
                }
                for a in analyses
            ],
            "total": total,
            "page": offset // limit + 1,
            "pages": (total + limit - 1) // limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analyses: {str(e)}")
