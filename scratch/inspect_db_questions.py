import asyncio
from sqlalchemy import select
from shared.database import init_db, get_db_context
from shared.database.models.olympiad import OlympiadQuestion

async def dump_questions():
    async with get_db_context() as db:
        result = await db.execute(
            select(OlympiadQuestion)
            .order_by(OlympiadQuestion.created_at.desc())
            .limit(10)
        )
        questions = result.scalars().all()
        print(f"Total questions found: {len(questions)}")
        for q in questions:
            print(f"ID: {q.id} | Olympiad: {q.olympiad_id}")
            print(f"Text: |{q.question_text}|")
            print(f"Options: {q.options}")
            print("-" * 30)

if __name__ == "__main__":
    asyncio.run(dump_questions())
