from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.database.models.lesson import Lesson
from shared.database.models.saved_test import SavedTest
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
            teacher_id=new_owner_id, # Target teacher
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
        
    return None
