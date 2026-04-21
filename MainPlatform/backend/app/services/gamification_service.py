import math
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from shared.database.models.student import StudentProfile
from shared.database.models.achievement import StudentAchievement, Achievement

class GamificationService:
    @staticmethod
    def get_level_from_points(points: int) -> int:
        """
        Level formula: Level = floor(sqrt(points / 100)) + 1
        Example: 
        0-99 XP = Level 1
        100-399 XP = Level 2
        400-899 XP = Level 3
        """
        if points <= 0:
            return 1
        return math.floor(math.sqrt(points / 100)) + 1

    @staticmethod
    def get_points_for_level(level: int) -> int:
        """XP needed to REACH a specific level."""
        if level <= 1:
            return 0
        return ((level - 1) ** 2) * 100

    @classmethod
    async def add_xp(cls, db: AsyncSession, student_id: str, amount: int):
        """Adds XP to student profile and handles level-ups."""
        stmt = select(StudentProfile).where(StudentProfile.id == student_id)
        res = await db.execute(stmt)
        student = res.scalars().first()
        
        if not student:
            return None

        old_level = student.level
        student.total_points += amount
        new_level = cls.get_level_from_points(student.total_points)
        
        level_up = False
        if new_level > old_level:
            student.level = new_level
            level_up = True
            # TODO: Track level-up event for frontend
            
        student.last_activity_at = datetime.now(timezone.utc)
        await db.flush()
        
        return {
            "new_points": student.total_points,
            "new_level": student.level,
            "level_up": level_up,
            "xp_gained": amount
        }

    @staticmethod
    async def update_daily_streak(db: AsyncSession, student_id: str):
        """Updates the daily login streak."""
        stmt = select(StudentProfile).where(StudentProfile.id == student_id)
        res = await db.execute(stmt)
        student = res.scalars().first()
        
        if not student:
            return
            
        now = datetime.now(timezone.utc)
        last_activity = student.last_activity_at
        
        if not last_activity:
            student.current_streak = 1
            student.longest_streak = 1
        else:
            # Check if last activity was yesterday
            delta = now.date() - last_activity.date()
            
            if delta == timedelta(days=1):
                # Consecutive day
                student.current_streak += 1
                if student.current_streak > student.longest_streak:
                    student.longest_streak = student.current_streak
            elif delta > timedelta(days=1):
                # Streak broken
                student.current_streak = 1
            # If delta == 0, already logged in today, no change to streak
            
        student.last_activity_at = now
        await db.flush()
        return student.current_streak
