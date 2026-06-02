from typing import List, Optional, Tuple, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, desc, and_, cast, String
from datetime import datetime, timezone

from shared.database.models import User, UserRole, AccountStatus
from shared.database.models.book import BookReadingRecord
from shared.database.models.reading_rating import ReadingRating, RatingPeriod
from shared.database.models.classroom import Classroom, ClassroomStudent

def get_period_keys() -> Dict[RatingPeriod, str]:
    now = datetime.now(timezone.utc)
    # weekly: 2026-W22
    year, week, _ = now.isocalendar()
    weekly_key = f"{year}-W{week:02d}"
    # monthly: 2026-06
    monthly_key = f"{now.year}-{now.month:02d}"
    # yearly: 2026
    yearly_key = str(now.year)
    
    return {
        RatingPeriod.weekly: weekly_key,
        RatingPeriod.monthly: monthly_key,
        RatingPeriod.yearly: yearly_key,
        RatingPeriod.all_time: ""
    }

class RatingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def process_reading_record(self, record: BookReadingRecord) -> BookReadingRecord:
        """
        Process a new or updated reading record.
        Calculates max_score and updates aggregates.
        """
        quiz = record.quiz_score or 0
        test = record.test_score or 0
        max_s = max(quiz, test)
        
        # 40 balldan past bo'lsa umumiy reytingga qo'shilmaydi
        record.max_score = max_s
        record.is_counted = (max_s > 40)
        
        # Ensure it's counted only if it's from library or assignment
        if record.source_type not in ["library", "assignment"]:
            record.is_counted = False
            
        await self.db.flush()
        
        if record.is_counted:
            await self._update_student_ratings(record.student_user_id)
            
        return record

    async def _update_student_ratings(self, student_id: str):
        """
        Update the aggregated ReadingRating for a student.
        Calculates from all BookReadingRecord of the student.
        """
        period_keys = get_period_keys()
        
        # Fetch all counted records
        stmt = select(BookReadingRecord).where(
            and_(
                BookReadingRecord.student_user_id == student_id,
                BookReadingRecord.is_counted == True
            )
        )
        result = await self.db.execute(stmt)
        records = result.scalars().all()
        
        # We need to aggregate by period
        aggregates = {
            RatingPeriod.weekly: {"books": 0, "score": 0},
            RatingPeriod.monthly: {"books": 0, "score": 0},
            RatingPeriod.yearly: {"books": 0, "score": 0},
            RatingPeriod.all_time: {"books": 0, "score": 0},
        }
        
        for r in records:
            if not r.completed_at:
                continue
            
            r_date = r.completed_at
            if r_date.tzinfo is None:
                r_date = r_date.replace(tzinfo=timezone.utc)
            
            # calculate keys for the record date
            y, w, _ = r_date.isocalendar()
            r_weekly = f"{y}-W{w:02d}"
            r_monthly = f"{r_date.year}-{r_date.month:02d}"
            r_yearly = str(r_date.year)
            
            # Add to all_time
            aggregates[RatingPeriod.all_time]["books"] += 1
            aggregates[RatingPeriod.all_time]["score"] += r.max_score
            
            if r_weekly == period_keys[RatingPeriod.weekly]:
                aggregates[RatingPeriod.weekly]["books"] += 1
                aggregates[RatingPeriod.weekly]["score"] += r.max_score
                
            if r_monthly == period_keys[RatingPeriod.monthly]:
                aggregates[RatingPeriod.monthly]["books"] += 1
                aggregates[RatingPeriod.monthly]["score"] += r.max_score
                
            if r_yearly == period_keys[RatingPeriod.yearly]:
                aggregates[RatingPeriod.yearly]["books"] += 1
                aggregates[RatingPeriod.yearly]["score"] += r.max_score
                
        # Update or create ReadingRating rows
        for period, agg in aggregates.items():
            p_key = period_keys[period]
            
            stmt_rating = select(ReadingRating).where(
                and_(
                    ReadingRating.student_id == student_id,
                    cast(ReadingRating.period, String) == period.value,
                    ReadingRating.period_key == p_key
                )
            )
            res = await self.db.execute(stmt_rating)
            rating = res.scalars().first()
            
            if not rating:
                rating = ReadingRating(
                    student_id=student_id,
                    period=period,
                    period_key=p_key,
                    total_books=agg["books"],
                    total_score=agg["score"]
                )
                self.db.add(rating)
            else:
                rating.total_books = agg["books"]
                rating.total_score = agg["score"]
                
        await self.db.flush()

    async def get_student_leaderboard(
        self,
        period: RatingPeriod,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[dict], int]:
        """
        Get leaderboard of students for a given period.
        """
        period_keys = get_period_keys()
        p_key = period_keys[period]
        
        stmt = select(User, ReadingRating).select_from(User).outerjoin(
            ReadingRating,
            and_(
                ReadingRating.student_id == User.id,
                cast(ReadingRating.period, String) == period.value,
                ReadingRating.period_key == p_key
            )
        ).where(
            User.role == UserRole.student
        ).order_by(
            ReadingRating.total_score.desc().nulls_last(),
            ReadingRating.total_books.desc().nulls_last()
        )
        
        # total count
        count_stmt = select(func.count(User.id)).where(User.role == UserRole.student)
        total_res = await self.db.execute(count_stmt)
        total = total_res.scalar() or 0
        
        # paginate
        stmt = stmt.offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        rows = result.all()
        
        leaderboard = []
        rank_counter = 1 + offset
        for user, rating in rows:
            data = rating.to_dict() if rating else {
                "id": None,
                "student_id": user.id,
                "period": period.value,
                "period_key": p_key,
                "total_books": 0,
                "total_score": 0,
                "previous_score": 0,
                "growth": 0,
                "updated_at": None
            }
            data["rank"] = rank_counter
            data["first_name"] = user.first_name
            data["last_name"] = user.last_name
            data["books_read"] = data.get("total_books", 0)
            
            # Keep student object for backwards compatibility
            data["student"] = {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "avatar_url": user.avatar
            }
            leaderboard.append(data)
            rank_counter += 1
            
        return leaderboard, total

    async def get_teacher_dashboard_stats(self, teacher_id: str, period: RatingPeriod):
        """
        Get reading stats for teacher's students.
        """
        period_keys = get_period_keys()
        p_key = period_keys[period]
        
        # Get all students for this teacher
        stmt_students = select(ClassroomStudent.student_user_id).join(
            Classroom, Classroom.id == ClassroomStudent.classroom_id
        ).where(Classroom.teacher_id == teacher_id)
        
        res = await self.db.execute(stmt_students)
        student_ids = [row for row in res.scalars().all()]
        
        if not student_ids:
            return {
                "total_students": 0,
                "total_books_read": 0,
                "average_books": 0,
                "average_score": 0,
                "most_active_student": None
            }
            
        stmt_ratings = select(User, ReadingRating).select_from(User).outerjoin(
            ReadingRating,
            and_(
                ReadingRating.student_id == User.id,
                cast(ReadingRating.period, String) == period.value,
                ReadingRating.period_key == p_key
            )
        ).where(
            User.id.in_(student_ids)
        ).order_by(
            ReadingRating.total_score.desc().nulls_last(),
            ReadingRating.total_books.desc().nulls_last()
        )
        
        res_ratings = await self.db.execute(stmt_ratings)
        ratings = res_ratings.all()
        
        total_students = len(student_ids)
        total_books = sum([r[1].total_books for r in ratings if r[1]])
        total_score = sum([r[1].total_score for r in ratings if r[1]])
        
        active_student = None
        if ratings and ratings[0][1] and ratings[0][1].total_books > 0:
            active_student = {
                "id": ratings[0][0].id,
                "first_name": ratings[0][0].first_name,
                "last_name": ratings[0][0].last_name,
                "total_books": ratings[0][1].total_books,
                "total_score": ratings[0][1].total_score
            }
            
        return {
            "total_students": total_students,
            "total_books_read": total_books,
            "average_books": round(total_books / total_students, 2) if total_students > 0 else 0,
            "average_score": round(total_score / len(ratings), 2) if len(ratings) > 0 else 0,
            "most_active_student": active_student
        }
        
    async def get_organization_dashboard_stats(self, organization_id: str, period: RatingPeriod):
        """
        Get reading stats for an organization.
        (Assuming organization_id links to users or teachers in some way, this is a placeholder implementation).
        We will return overall platform stats if org specific logic is missing.
        """
        period_keys = get_period_keys()
        p_key = period_keys[period]
        
        count_stmt = select(func.count(User.id)).where(User.role == UserRole.student)
        count_res = await self.db.execute(count_stmt)
        count = count_res.scalar() or 0
        
        if count == 0:
            return {
                "total_students": 0,
                "total_books_read": 0,
                "average_books": 0,
                "average_score": 0
            }
            
        stmt_sum = select(
            func.sum(ReadingRating.total_books),
            func.sum(ReadingRating.total_score)
        ).where(
            cast(ReadingRating.period, String) == period.value,
            ReadingRating.period_key == p_key
        )
        
        sum_res = await self.db.execute(stmt_sum)
        row = sum_res.first()
        
        total_books = row[0] if row and row[0] else 0
        total_score = row[1] if row and row[1] else 0
        
        return {
            "total_students": count,
            "total_books_read": total_books,
            "average_books": round(total_books / count, 2) if count > 0 else 0,
            "average_score": round(total_score / count, 2) if count > 0 else 0
        }

    async def get_classroom_leaderboard(
        self,
        classroom_id: str,
        period: RatingPeriod,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[dict], int]:
        """
        Get leaderboard of students for a specific classroom.
        Only includes students who have read at least 1 book.
        """
        period_keys = get_period_keys()
        p_key = period_keys[period]

        # Inner join to ensure only students who have read books appear
        stmt = select(User, ReadingRating).select_from(ClassroomStudent).join(
            User, User.id == ClassroomStudent.student_user_id
        ).join(
            ReadingRating,
            and_(
                ReadingRating.student_id == User.id,
                cast(ReadingRating.period, String) == period.value,
                ReadingRating.period_key == p_key,
                ReadingRating.total_books > 0
            )
        ).where(
            ClassroomStudent.classroom_id == classroom_id
        ).order_by(
            ReadingRating.total_score.desc().nulls_last(),
            ReadingRating.total_books.desc().nulls_last()
        )

        # total count
        count_stmt = select(func.count(User.id)).select_from(ClassroomStudent).join(
            User, User.id == ClassroomStudent.student_user_id
        ).join(
            ReadingRating,
            and_(
                ReadingRating.student_id == User.id,
                cast(ReadingRating.period, String) == period.value,
                ReadingRating.period_key == p_key,
                ReadingRating.total_books > 0
            )
        ).where(ClassroomStudent.classroom_id == classroom_id)
        
        total_res = await self.db.execute(count_stmt)
        total = total_res.scalar() or 0

        # paginate
        stmt = stmt.offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        rows = result.all()

        leaderboard = []
        rank_counter = 1 + offset
        for user, rating in rows:
            data = rating.to_dict()
            data["rank"] = rank_counter
            data["first_name"] = user.first_name
            data["last_name"] = user.last_name
            data["books_read"] = data.get("total_books", 0)

            data["student"] = {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "avatar_url": user.avatar
            }
            leaderboard.append(data)
            rank_counter += 1

        return leaderboard, total

    async def get_teacher_classrooms_reading_stats(self, teacher_id: str, period: RatingPeriod) -> List[dict]:
        """
        Get list of classrooms for a teacher and their aggregated reading stats.
        """
        period_keys = get_period_keys()
        p_key = period_keys[period]

        # Get all classrooms for teacher
        stmt_classes = select(Classroom).where(Classroom.teacher_id == teacher_id)
        res_classes = await self.db.execute(stmt_classes)
        classrooms = res_classes.scalars().all()

        stats_list = []
        for c in classrooms:
            # get total students in this class
            count_stmt = select(func.count(ClassroomStudent.id)).where(ClassroomStudent.classroom_id == c.id)
            count_res = await self.db.execute(count_stmt)
            total_students = count_res.scalar() or 0

            # get aggregated ratings for students in this class
            stmt_sum = select(
                func.sum(ReadingRating.total_books),
                func.sum(ReadingRating.total_score),
                func.count(ReadingRating.id)
            ).select_from(ClassroomStudent).join(
                ReadingRating,
                and_(
                    ReadingRating.student_id == ClassroomStudent.student_user_id,
                    cast(ReadingRating.period, String) == period.value,
                    ReadingRating.period_key == p_key,
                    ReadingRating.total_books > 0
                )
            ).where(
                ClassroomStudent.classroom_id == c.id
            )
            sum_res = await self.db.execute(stmt_sum)
            row = sum_res.first()
            
            total_books = row[0] if row and row[0] else 0
            total_score = row[1] if row and row[1] else 0
            readers_count = row[2] if row and row[2] else 0

            stats_list.append({
                "classroom_id": c.id,
                "classroom_name": c.name,
                "subject": getattr(c, "subject", ""),
                "grade_level": getattr(c, "grade_level", ""),
                "total_students": total_students,
                "readers_count": readers_count,
                "total_books_read": total_books,
                "average_score": round(total_score / readers_count, 2) if readers_count > 0 else 0
            })
            
        return stats_list

    async def get_student_classrooms_rank(self, student_id: str, period: RatingPeriod) -> List[dict]:
        """
        Find all classrooms the student belongs to and their rank within each classroom.
        If the student hasn't read any books, return rank 0 or None.
        """
        period_keys = get_period_keys()
        p_key = period_keys[period]

        # 1. Check if student has a rating
        stmt_rating = select(ReadingRating).where(
            and_(
                ReadingRating.student_id == student_id,
                cast(ReadingRating.period, String) == period.value,
                ReadingRating.period_key == p_key,
                ReadingRating.total_books > 0
            )
        )
        res_rating = await self.db.execute(stmt_rating)
        my_rating = res_rating.scalars().first()

        my_score = my_rating.total_score if my_rating else 0
        my_books = my_rating.total_books if my_rating else 0

        # 2. Get student's classrooms
        stmt_classes = select(Classroom).join(
            ClassroomStudent, ClassroomStudent.classroom_id == Classroom.id
        ).where(ClassroomStudent.student_user_id == student_id)
        res_classes = await self.db.execute(stmt_classes)
        classrooms = res_classes.scalars().all()

        results = []
        for c in classrooms:
            if not my_rating:
                results.append({
                    "classroom_id": c.id,
                    "classroom_name": c.name,
                    "subject": getattr(c, "subject", ""),
                    "grade_level": getattr(c, "grade_level", ""),
                    "rank": 0,
                    "total_score": 0,
                    "total_books": 0,
                    "has_read": False
                })
                continue
                
            # Count how many students in this classroom have a better score/book count
            count_stmt = select(func.count(ReadingRating.id)).select_from(ClassroomStudent).join(
                ReadingRating,
                and_(
                    ReadingRating.student_id == ClassroomStudent.student_user_id,
                    cast(ReadingRating.period, String) == period.value,
                    ReadingRating.period_key == p_key,
                    ReadingRating.total_books > 0
                )
            ).where(
                and_(
                    ClassroomStudent.classroom_id == c.id,
                    # Better score OR (same score but more books)
                    (ReadingRating.total_score > my_score) |
                    ((ReadingRating.total_score == my_score) & (ReadingRating.total_books > my_books))
                )
            )
            res_better = await self.db.execute(count_stmt)
            better_count = res_better.scalar() or 0

            # Rank is better_count + 1
            results.append({
                "classroom_id": c.id,
                "classroom_name": c.name,
                "subject": getattr(c, "subject", ""),
                "grade_level": getattr(c, "grade_level", ""),
                "rank": better_count + 1,
                "total_score": my_score,
                "total_books": my_books,
                "has_read": True
            })

        return results
