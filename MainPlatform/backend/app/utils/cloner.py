from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.database.models.lesson import Lesson
from shared.database.models.saved_test import SavedTest
from shared.database.models.live_quiz import LiveQuiz, LiveQuizQuestion
from shared.database.models.teacher import TeacherProfile
from shared.database.id_generator import generate_8_digit_id

async def clone_resource(db: AsyncSession, resource_id: str, resource_type: str, new_owner_id: str):
    """
    Creates a deep copy of a resource (Lesson, Test, etc.) for a new owner.
    """
    if resource_type == "lesson":
        res = await db.execute(select(Lesson).where(Lesson.id == resource_id))
        original = res.scalars().first()
        if not original:
            return None
        
        cloned = Lesson(
            id=generate_8_digit_id(),
            teacher_id=new_owner_id, # Target user (could be teacher or regular user)
            title=f"{original.title} (Nusxa)",
            subject=original.subject,
            grade_level=original.grade_level,
            content=original.content,
            language=original.language,
            video_url=original.video_url,
            attachments=original.attachments,
            status="published"
        )
        db.add(cloned)
        await db.flush()
        return cloned.id

    elif resource_type == "test":
        res = await db.execute(select(SavedTest).where(SavedTest.id == resource_id))
        original = res.scalars().first()
        if not original:
            return None
            
        cloned = SavedTest(
            id=generate_8_digit_id(),
            creator_id=new_owner_id,
            title=f"{original.title} (Nusxa)",
            description=original.description,
            subject=original.subject,
            topic=original.topic,
            difficulty=original.difficulty,
            language=original.language,
            questions=original.questions,
            questions_count=original.questions_count,
            ai_generated=original.ai_generated,
            source_platform="marketplace"
        )
        db.add(cloned)
        await db.flush()
        return cloned.id

    elif resource_type == "live_quiz":
        # First, find the teacher profile for the new owner
        tp_res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == new_owner_id))
        teacher_profile = tp_res.scalars().first()
        if not teacher_profile:
            return None # Must be a teacher to clone a live quiz
            
        res = await db.execute(select(LiveQuiz).where(LiveQuiz.id == resource_id))
        original = res.scalars().first()
        if not original:
            return None
            
        cloned = LiveQuiz(
            id=generate_8_digit_id(),
            teacher_id=teacher_profile.id,
            title=f"{original.title} (Nusxa)",
            description=original.description,
            is_template=True,
            max_participants=original.max_participants,
            time_per_question=original.time_per_question,
            show_leaderboard=original.show_leaderboard,
            shuffle_questions=original.shuffle_questions,
            shuffle_options=original.shuffle_options,
            status="created"
        )
        db.add(cloned)
        await db.flush()
        
        # Clone questions
        q_res = await db.execute(select(LiveQuizQuestion).where(LiveQuizQuestion.quiz_id == original.id))
        original_questions = q_res.scalars().all()
        for q in original_questions:
            cloned_q = LiveQuizQuestion(
                id=generate_8_digit_id(),
                quiz_id=cloned.id,
                question_text=q.question_text,
                question_image=q.question_image,
                options=q.options,
                correct_answer=q.correct_answer,
                points=q.points,
                time_limit=q.time_limit,
                order=q.order
            )
            db.add(cloned_q)
        
        await db.flush()
        return cloned.id
        
    return None
