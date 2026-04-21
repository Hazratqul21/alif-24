"""
Dashboard Router - MainPlatform
Student and Parent dashboards
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.database.models import User
from app.middleware.auth import get_current_user

router = APIRouter()

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from shared.database.models import UserRole, StudentProfile, ParentProfile, Assignment, AssignmentSubmission, SubmissionStatus

@router.get("/student")
async def get_student_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get student dashboard data"""
    from fastapi import HTTPException
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun ruxsat etilgan")

    # Fetch stats
    result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    student = result.scalars().first()
    
    stats = {
        "total_lessons": 0,
        "total_games": 0,
        "total_coins": 0,
        "current_streak": 0,
        "level": 1,
        "total_points": 0
    }
    if student:
        stats.update({
            "total_lessons": student.total_lessons_completed,
            "total_games": student.total_games_played,
            "total_coins": student.total_coins,
            "current_streak": student.current_streak,
            "level": student.level,
            "total_points": student.total_points
        })

    # Fetch pending tasks (assignments)
    # Get submissions for the student to identify task status
    submissions_result = await db.execute(
        select(AssignmentSubmission)
        .options(selectinload(AssignmentSubmission.assignment))
        .where(AssignmentSubmission.student_user_id == current_user.id)
    )
    submissions = submissions_result.scalars().all()
    
    tasks = []
    for sub in submissions:
        if sub.assignment:
             tasks.append({
                 "id": sub.assignment.id,
                 "title": sub.assignment.title,
                 "status": sub.status.value,
                 "deadline": sub.assignment.due_date.isoformat() if sub.assignment.due_date else "Muddatsiz",
                 "xp": sub.assignment.max_score,
                 "assignment_type": sub.assignment.assignment_type.value,
                 "content": sub.assignment.content
             })

    return {
        "success": True,
        "data": {
            "profile": stats,
            "user": current_user.to_dict(),
            "stats": stats,
            "tasks": tasks
        }
    }

@router.get("/student/performance")
async def get_student_performance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get historical performance data for charts"""
    from sqlalchemy import func, cast, Date
    from datetime import datetime, timedelta
    
    # 1. Performance Trend (Last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    stmt = (
        select(
            cast(AssignmentSubmission.submitted_at, Date).label("date"),
            func.avg(AssignmentSubmission.score).label("avg_score")
        )
        .where(
            AssignmentSubmission.student_user_id == current_user.id,
            AssignmentSubmission.submitted_at >= thirty_days_ago,
            AssignmentSubmission.status == SubmissionStatus.graded
        )
        .group_by(cast(AssignmentSubmission.submitted_at, Date))
        .order_by("date")
    )
    
    res = await db.execute(stmt)
    trend = [{"date": str(row.date), "score": float(row.avg_score)} for row in res]
    
    # 2. Subject Breakdown
    from shared.database.models import Assignment
    stmt = (
        select(
            Assignment.subject,
            func.avg(AssignmentSubmission.score).label("avg_score")
        )
        .join(Assignment, Assignment.id == AssignmentSubmission.assignment_id)
        .where(
            AssignmentSubmission.student_user_id == current_user.id,
            AssignmentSubmission.status == SubmissionStatus.graded
        )
        .group_by(Assignment.subject)
    )
    
    res = await db.execute(stmt)
    subjects = [{"subject": row.subject or "Boshqa", "score": float(row.avg_score)} for row in res]
    
    return {
        "success": True,
        "data": {
            "trend": trend,
            "subjects": subjects
        }
    }

@router.get("/student/leaderboard")
async def get_student_leaderboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get class leaderboard ranking"""
    from shared.database.models.classroom import ClassroomStudent
    
    # Get all classrooms student is in
    cls_stmt = select(ClassroomStudent.classroom_id).where(
        ClassroomStudent.student_user_id == current_user.id
    )
    cls_res = await db.execute(cls_stmt)
    classroom_ids = [row[0] for row in cls_res]
    
    if not classroom_ids:
        return {"success": True, "data": []}
        
    # Get all students in these classrooms
    students_stmt = (
        select(User.id, User.first_name, User.last_name, StudentProfile.level, StudentProfile.total_points)
        .join(StudentProfile, StudentProfile.user_id == User.id)
        .join(ClassroomStudent, ClassroomStudent.student_user_id == User.id)
        .where(ClassroomStudent.classroom_id.in_(classroom_ids))
        .distinct()
        .order_by(StudentProfile.total_points.desc())
        .limit(20)
    )
    
    res = await db.execute(students_stmt)
    ranking = []
    for i, row in enumerate(res):
        ranking.append({
            "rank": i + 1,
            "id": row.id,
            "name": f"{row.first_name} {row.last_name}".strip(),
            "level": row.level,
            "points": row.total_points,
            "is_me": row.id == current_user.id
        })
        
    return {"success": True, "data": ranking}

@router.get("/parent")
async def get_parent_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get parent dashboard data"""
    from fastapi import HTTPException
    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun ruxsat etilgan")

    # Get children
    children_result = await db.execute(
        select(User).options(selectinload(User.student_profile)).where(User.parent_id == current_user.id)
    )
    children_users = children_result.scalars().all()
    
    children_data = []
    total_score = 0
    total_lessons = 0
    
    for child in children_users:
        child_dict = child.to_dict()
        if child.student_profile:
            child_stats = {
                "level": child.student_profile.level,
                "total_points": child.student_profile.total_points,
                "total_coins": child.student_profile.total_coins,
                "current_streak": child.student_profile.current_streak,
                "total_lessons": child.student_profile.total_lessons_completed,
                "average_score": child.student_profile.average_score
            }
            child_dict["stats"] = child_stats
            
            total_score += child.student_profile.average_score
            total_lessons += child.student_profile.total_lessons_completed
        else:
            child_dict["stats"] = {}
            
        children_data.append(child_dict)
        
    avg_score = total_score / len(children_data) if children_data else 0

    return {
        "success": True,
        "data": {
            "user": current_user.to_dict(),
            "children": children_data,
            "stats": {
                "total_children": len(children_data),
                "total_lessons_completed": total_lessons,
                "average_score": avg_score
            }
        }
    }
