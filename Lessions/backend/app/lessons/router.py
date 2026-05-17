"""
Lessions Platform Backend - Lessons Router
Darsliklar yaratish va boshqarish (PostgreSQL)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from shared.database import get_db
from shared.database.models.story import Story
from app.lessons.models import Lesson, LessonProgress as LessonProgressModel, LessonStatus

logger = logging.getLogger("lessions")

router = APIRouter()


# ============= Pydantic Schemas =============

class LessonCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    subject: str = Field(..., min_length=2, max_length=100)
    content: str = Field(..., min_length=10)
    grade_level: Optional[str] = None
    language: str = Field(default="uz")
    video_url: Optional[str] = None  # uz, ru, en


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    grade_level: Optional[str] = None
    language: Optional[str] = None
    video_url: Optional[str] = None


class LessonProgressSchema(BaseModel):
    student_id: Optional[str] = None
    progress_percent: int = Field(..., ge=0, le=100)
    time_spent_minutes: int = Field(default=0, ge=0)


class QuizQuestion(BaseModel):
    question: str = Field(..., min_length=3)
    answer: str = Field(..., min_length=1)  # To'g'ri javob


class ErtakCreate(BaseModel):
    """Ertak (Fairy tale / Story) for reading"""
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=20)
    language: str = Field(default="uz")
    age_group: str = Field(default="6-8")  # 4-6, 6-8, 8-10, 10-12
    has_audio: bool = False
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    questions: List[QuizQuestion] = []  # Admin tomonidan qo'shilgan savollar


class EvaluateQuizRequest(BaseModel):
    story_text: str
    question: str
    child_answer: str
    language: Optional[str] = "uz-UZ"
    correct_answer: Optional[str] = None

def _lesson_to_dict(lesson: Lesson) -> dict:
    return {
        "id": lesson.id,
        "title": lesson.title,
        "subject": getattr(lesson, 'subject', None),
        "content": getattr(lesson, 'content', None),
        "grade_level": getattr(lesson, 'grade_level', None),
        "language": getattr(lesson, 'language', 'uz'),
        "video_url": getattr(lesson, 'video_url', None),
        "created_at": lesson.created_at.isoformat() if getattr(lesson, 'created_at', None) else None,
        "updated_at": lesson.updated_at.isoformat() if getattr(lesson, 'updated_at', None) else None,
    }


def _ertak_to_dict(ertak: Story) -> dict:
    return {
        "id": ertak.id,
        "title": ertak.title,
        "content": ertak.content,
        "language": getattr(ertak, 'language', 'uz'),
        "age_group": getattr(ertak, 'age_group', '6-8'),
        "has_audio": getattr(ertak, 'has_audio', False),
        "audio_url": getattr(ertak, 'audio_url', None),
        "image_url": getattr(ertak, 'image_url', None),
        "view_count": getattr(ertak, 'view_count', 0),
        "questions": getattr(ertak, 'questions', []) or [],
        "created_at": ertak.created_at.isoformat() if getattr(ertak, 'created_at', None) else None,
    }


# ============= Lessons CRUD =============

@router.post("/lessons")
async def create_lesson(
    data: LessonCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new lesson"""
    lesson = Lesson(
        title=data.title,
        subject=data.subject,
        content=data.content,
        grade_level=data.grade_level,
        language=data.language,
        video_url=data.video_url,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)

    logger.info(f"Lesson created: {data.title} (ID: {lesson.id})")
    return {"success": True, "data": _lesson_to_dict(lesson)}


@router.get("/lessons")
async def list_lessons(
    subject: Optional[str] = None,
    grade_level: Optional[str] = None,
    language: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all lessons with optional filters"""
    stmt = select(Lesson)

    if subject:
        stmt = stmt.where(Lesson.subject.ilike(subject))
    if grade_level:
        stmt = stmt.where(Lesson.grade_level == grade_level)
    if language:
        stmt = stmt.where(Lesson.language == language)

    result = await db.execute(stmt)
    results = result.scalars().all()
    return {
        "success": True,
        "data": {
            "lessons": [_lesson_to_dict(l) for l in results],
            "total": len(results)
        }
    }


@router.get("/lessons/{lesson_id}")
async def get_lesson(
    lesson_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get lesson details"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    return {"success": True, "data": _lesson_to_dict(lesson)}


@router.put("/lessons/{lesson_id}")
async def update_lesson(
    lesson_id: str,
    data: LessonUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update lesson"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lesson, key, value)

    await db.commit()
    await db.refresh(lesson)
    return {"success": True, "data": _lesson_to_dict(lesson)}


@router.post("/lessons/{lesson_id}/publish")
async def publish_lesson(
    lesson_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Publish a lesson (No-op since status is removed from shared model)"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    return {"success": True, "data": _lesson_to_dict(lesson)}


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a lesson"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    await db.delete(lesson)
    await db.commit()
    return {"success": True, "message": "Darslik o'chirildi"}


# ============= Student Progress =============

@router.post("/lessons/{lesson_id}/progress")
async def update_progress(
    lesson_id: str,
    data: LessonProgressSchema,
    db: AsyncSession = Depends(get_db)
):
    """Update student progress for a lesson"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    progress = None
    if data.student_id:
        p_res = await db.execute(
            select(LessonProgressModel).where(
                LessonProgressModel.lesson_id == lesson.id,
                LessonProgressModel.student_id == data.student_id
            )
        )
        progress = p_res.scalars().first()

    if progress:
        progress.progress_percent = data.progress_percent
        progress.time_spent_minutes = data.time_spent_minutes
        progress.completed = data.progress_percent >= 100
    else:
        progress = LessonProgressModel(
            lesson_id=lesson.id,
            student_id=data.student_id,
            progress_percent=data.progress_percent,
            time_spent_minutes=data.time_spent_minutes,
            completed=data.progress_percent >= 100,
        )
        db.add(progress)

    await db.commit()
    await db.refresh(progress)

    return {
        "success": True,
        "data": {
            "lesson_id": progress.lesson_id,
            "student_id": progress.student_id,
            "progress_percent": progress.progress_percent,
            "time_spent_minutes": progress.time_spent_minutes,
            "completed": progress.completed,
        }
    }


@router.get("/lessons/{lesson_id}/progress/{student_id}")
async def get_progress(
    lesson_id: str,
    student_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get student progress for a lesson"""
    p_res = await db.execute(
        select(LessonProgressModel).where(
            LessonProgressModel.lesson_id == lesson_id,
            LessonProgressModel.student_id == student_id
        )
    )
    progress = p_res.scalars().first()

    if not progress:
        return {
            "success": True,
            "data": {
                "lesson_id": lesson_id,
                "student_id": student_id,
                "progress_percent": 0,
                "time_spent_minutes": 0,
                "completed": False
            }
        }

    return {
        "success": True,
        "data": {
            "lesson_id": progress.lesson_id,
            "student_id": progress.student_id,
            "progress_percent": progress.progress_percent,
            "time_spent_minutes": progress.time_spent_minutes,
            "completed": progress.completed,
        }
    }


# ============= Ertaklar (Stories/Fairy tales) =============

@router.post("/ertaklar")
async def create_ertak(
    data: ErtakCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new ertak (story)"""
    ertak = Story(
        title=data.title,
        content=data.content,
        language=data.language,
        age_group=data.age_group,
        has_audio=data.has_audio,
        audio_url=data.audio_url,
        questions=[q.dict() for q in data.questions] if data.questions else [],
    )
    db.add(ertak)
    await db.commit()
    await db.refresh(ertak)

    logger.info(f"Ertak created: {data.title} (ID: {ertak.id})")
    return {"success": True, "data": _ertak_to_dict(ertak)}


@router.get("/ertaklar")
async def list_ertaklar(
    language: Optional[str] = None,
    age_group: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all ertaklar (stories) — faqat Admin yasagan (teacher_id IS NULL)"""
    stmt = select(Story).where(Story.teacher_id == None)  # noqa: E711 — faqat Admin ertaklari

    if language:
        stmt = stmt.where(Story.language == language)
    if age_group:
        stmt = stmt.where(Story.age_group == age_group)

    result = await db.execute(stmt)
    results = result.scalars().all()
    return {
        "success": True,
        "data": {
            "ertaklar": [_ertak_to_dict(e) for e in results],
            "total": len(results)
        }
    }


@router.get("/ertaklar/{ertak_id}")
async def get_ertak(
    ertak_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get ertak details"""
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    ertak.view_count += 1
    await db.commit()
    return {"success": True, "data": _ertak_to_dict(ertak)}


@router.delete("/ertaklar/{ertak_id}")
async def delete_ertak(
    ertak_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete an ertak"""
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    await db.delete(ertak)
    await db.commit()
    return {"success": True, "message": "Ertak o'chirildi"}


# ============= Ertak Savollar (Quiz Questions) =============

class QuestionsUpdate(BaseModel):
    questions: List[QuizQuestion]


@router.put("/ertaklar/{ertak_id}/questions")
async def update_ertak_questions(
    ertak_id: str,
    data: QuestionsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Admin: ertakka savollar qo'shish yoki yangilash"""
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    ertak.questions = [q.dict() for q in data.questions]
    await db.commit()
    await db.refresh(ertak)
    return {"success": True, "data": _ertak_to_dict(ertak)}


# ============= Quiz Answer Evaluation (STT + Keyword Scoring) =============

from fastapi import UploadFile, File
import difflib

@router.post("/ertaklar/{ertak_id}/quiz/evaluate")
async def evaluate_quiz_answer(
    ertak_id: str,
    question_index: int,
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Bolaning ovozini qabul qilib, STT orqali matnga aylantiradi va
    admin bergan to'g'ri javob bilan 100 ballik shkalada solishtiradi.
    """
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    questions = ertak.questions or []
    if question_index < 0 or question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Savol indeksi noto'g'ri")

    correct_answer = questions[question_index].get("answer", "").strip().lower()

    # STT — Bolaning ovozini matnga aylantirish
    try:
        audio_bytes = await audio.read()
        lang = ertak.language or "uz"
        stt_result = await speech_service.speech_to_text(audio_data=audio_bytes, language=lang)
        if isinstance(stt_result, dict):
            recognized_text = (stt_result.get("transcript", "") or "").strip().lower()
        else:
            recognized_text = (str(stt_result) if stt_result else "").strip().lower()
    except Exception as e:
        logger.warning(f"STT failed: {e}")
        recognized_text = ""

    # Keyword + fuzzy matching scoring (0-100)
    score = 0
    if recognized_text and correct_answer:
        # Sequence matching (overall similarity)
        ratio = difflib.SequenceMatcher(None, recognized_text, correct_answer).ratio()
        score = int(ratio * 100)

        # Bonus: har bir to'g'ri kalit so'z uchun qo'shimcha ball
        correct_words = set(correct_answer.split())
        recognized_words = set(recognized_text.split())
        keyword_matches = len(correct_words & recognized_words)
        if correct_words:
            keyword_ratio = keyword_matches / len(correct_words)
            # Keyword va sequence o'rtacha
            score = int((ratio * 0.5 + keyword_ratio * 0.5) * 100)

        score = min(100, max(0, score))

    return {
        "success": True,
        "data": {
            "recognized_text": recognized_text,
            "correct_answer": questions[question_index].get("answer", ""),
            "score": score,
            "passed": score >= 60,
        }
    }


from fastapi import Form

@router.post("/ertaklar/{ertak_id}/quiz/evaluate-text")
async def evaluate_quiz_answer_text(
    ertak_id: str,
    question_index: int,
    recognized_text: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Frontend'dan tayyor matn (STT orqali olingan) qabul qilinib,
    admin bergan to'g'ri javob bilan 100 ballik shkalada solishtiriladi.
    OpenAI semantic baholash qo'llaniladi, xato bo'lsa difflib fallback.
    """
    import httpx, os
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    questions = ertak.questions or []
    if question_index < 0 or question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Savol indeksi noto'g'ri")

    correct_answer = questions[question_index].get("answer", "").strip()
    question_text  = questions[question_index].get("question", "").strip()
    recognized_clean = recognized_text.strip()

    # ── 1. AI-based evaluation (semantic similarity) ──────────────────────────
    api_key = os.getenv("OPENAI_API_KEY", "")
    score = None
    ai_used = False

    if api_key and recognized_clean and correct_answer:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                prompt = (
                    f"Savol: {question_text}\n"
                    f"To'g'ri javob: {correct_answer}\n"
                    f"Bola aytgan: {recognized_clean}\n\n"
                    "Bolaning javobi ma'nosi jihatidan to'g'ri javobga qanchalik mos kelishini "
                    "0 dan 100 gacha faqat bitta butun son bilan baholang. "
                    "100 = to'liq mos, 0 = mutlaqo noto'g'ri. "
                    "Faqat son qaytaring, boshqa hech narsa yozmang."
                )
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.0,
                        "max_tokens": 5,
                    }
                )
                if resp.status_code == 200:
                    raw = resp.json()["choices"][0]["message"]["content"].strip()
                    digits = "".join(filter(str.isdigit, raw))[:3]
                    score = max(0, min(100, int(digits or "0")))
                    ai_used = True
        except Exception as e:
            logger.warning(f"AI evaluation failed, falling back to difflib: {e}")

    # ── 2. Fallback: keyword + sequence matching ───────────────────────────────
    if score is None:
        score = 0
        r_lower = recognized_clean.lower()
        c_lower = correct_answer.lower()
        if r_lower and c_lower:
            ratio = difflib.SequenceMatcher(None, r_lower, c_lower).ratio()
            correct_words  = set(c_lower.split())
            recognized_words = set(r_lower.split())
            keyword_ratio = len(correct_words & recognized_words) / len(correct_words) if correct_words else 0
            score = int((ratio * 0.5 + keyword_ratio * 0.5) * 100)
            score = min(100, max(0, score))

    return {
        "success": True,
        "data": {
            "recognized_text": recognized_clean,
            "correct_answer": correct_answer,
            "score": score,
            "passed": score >= 60,
            "ai_evaluated": ai_used,
        }
    }


# ============= TTS — Ertakni AI o'qib berish (OpenAI) =============

from fastapi import Response as FastAPIResponse
from pydantic import BaseModel as TTSBaseModel
import httpx
import os
from shared.services.azure_speech_service import speech_service

class TTSRequest(TTSBaseModel):
    text: str
    language: str = "uz"

# OpenAI TTS — HD ovozlar, bolalar uchun
LANGUAGE_VOICES = {
    "uz": "shimmer",   # O'zbek — iliq, tabiiy ayol ovozi
    "ru": "nova",      # Rus — yumshoq, aniq ayol ovozi
    "en": "nova",      # Ingliz — professional ovoz
}

OPENAI_TTS_URL = os.getenv("OPENAI_TTS_URL", "https://api.openai.com/v1/audio/speech")
TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "tts-1-hd")   # e.g gpt-4o-mini-tts
TTS_SPEED = 0.95          # sekinroq — bolalar uchun


@router.post("/ertaklar/{ertak_id}/tts")
async def ertak_tts(
    ertak_id: str,
    db: AsyncSession = Depends(get_db),
):
    """AI yordamida ertakni o'qib berish (Azure TTS)"""
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    lang = ertak.language or "uz"
    text = (ertak.content or "")[:4096]

    try:
        # Generate Audio using Azure Speech Services
        audio_content = await speech_service.text_to_speech(text=text, language=lang, gender="female")
        return FastAPIResponse(content=audio_content, media_type="audio/mpeg")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS error for story {ertak_id}: {e}")
        raise HTTPException(status_code=500, detail=f"TTS xatoligi: {str(e)}")


@router.post("/tts")
async def general_tts(data: TTSRequest):
    """Umumiy TTS endpoint — istalgan matnni o'qib berish (OpenAI HD)"""
    if not data.text or not data.text.strip():
        raise HTTPException(status_code=400, detail="Matn kiritilmadi")
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="Tizimda ovoz sozlamalari mavjud emas (API kaliti yo'q)")

    lang = data.language or "uz"
    voice = LANGUAGE_VOICES.get(lang, "shimmer")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OPENAI_TTS_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": TTS_MODEL,
                    "input": data.text[:4096],
                    "voice": voice,
                    "speed": TTS_SPEED,
                    "response_format": "mp3",
                },
            )
            if response.status_code != 200:
                logger.error(f"OpenAI TTS error: {response.status_code}")
                raise HTTPException(status_code=500, detail=f"OpenAI xatoligi: {response.status_code}")
            return FastAPIResponse(content=response.content, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS xatoligi: {str(e)}")


# ============= GET /speech/tts — Frontend frontenddan chaqiriladigan TTS =============

from fastapi import Query

@router.get("/speech/tts")
async def speech_tts_get(
    text: str = Query(..., description="O'qiladigan matn"),
    language: str = Query("uz", description="Til: uz, ru, en"),
    gender: str = Query("female", description="Ovoz jinsi: male, female"),
):
    """
    GET /speech/tts?text=...&language=uz&gender=female
    Azure Speech Service yordamida matnni ovozga aylantirish.
    Frontend RecordingModal va QuizModal shu endpointni ishlatadi.
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Matn kiritilmadi")

    try:
        audio_content = await speech_service.text_to_speech(
            text=text[:4096],
            language=language,
            gender=gender,
        )
        return FastAPIResponse(content=audio_content, media_type="audio/mpeg")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Speech TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS xatoligi: {str(e)}")


# ============= Speech Token =============
@router.get("/speech-token")
async def get_speech_token():
    """
    Azure Speech SDK uchun token olish.
    """
    try:
        return await speech_service.get_token_for_client()
    except Exception as e:
        logger.error(f"Speech token error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============= General Quiz Evaluation (AI) =============
@router.post("/evaluate-quiz")
async def evaluate_quiz_general(request: EvaluateQuizRequest):
    """
    Bolaning savolga javobini AI yordamida baholash (100 ballik tizimda)
    Lessions backend o'zining mustaqil AI xizmatidan foydalanadi.
    """
    import os, json
    from openai import AsyncAzureOpenAI, AsyncOpenAI
    
    try:
        api_key = os.getenv("AZURE_OPENAI_KEY") or os.getenv("OPENAI_API_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-1")
        
        if not api_key:
            raise ValueError("AI API kaliti topilmadi (AZURE_OPENAI_KEY yoki OPENAI_API_KEY)")

        if endpoint and not endpoint.endswith("/openai/v1"):
            # Azure
            client = AsyncAzureOpenAI(
                api_key=api_key,
                api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01"),
                azure_endpoint=endpoint
            )
            model_kwargs = {"model": deployment_name}
        else:
            # Standard OpenAI or custom endpoint (like sambanova)
            base_url = endpoint if endpoint else None
            client = AsyncOpenAI(api_key=api_key, base_url=base_url)
            model_kwargs = {"model": deployment_name if endpoint else "gpt-4o-mini"}

        lang = request.language or "uz-UZ"
        if lang == "uz": lang = "uz-UZ"
        elif lang == "ru": lang = "ru-RU"
        elif lang == "en": lang = "en-US"

        system_prompts = {
            "uz-UZ": (
                "Siz mehribon va professional bolalar pedagogisiz. Vazifangiz: bolaning ertak asosidagi savolga bergan javobini tahlil qilish va baholash.\n\n"
                "BAHOLASH MEZONLARI:\n"
                "1. MA'NO VA MANTIQ (Eng muhimi): O'quvchi javobi namuna (correct_answer) bilan so'zma-so'z mos kelishi shart emas. Agar bola savolning mohiyatini tushungan bo'lsa va javobi ertak matniga mantiqan to'g'ri kelsa, unga yuqori ball (85-100) bering.\n"
                "2. KALIT SO'ZLAR: Javobda voqelikdagi asosiy ob'ektlar yoki harakatlar (masalan: qush, qalam, tush) mavjud bo'lsa, bu to'g'ri javob hisoblanadi.\n"
                "3. YOSH VA USLUB: O'quvchi bolaligini inobatga oling. Uning tili sodda, gaplari qisqa bo'lishi normal holat. Grammatikaga va STT (ovozni matnga aylantirish) xatolariga mutlaqo e'tibor bermang.\n"
                "4. BALLAR:\n"
                "   - 85-100 ball: Ma'no to'g'ri, savolga javob berilgan (hatto juda sodda tilda bo'lsa ham).\n"
                "   - 50-84 ball: Javob qisman to'g'ri yoki bola asosiy fikrni aytishga yaqin kelgan.\n"
                "   - 10-49 ball: Javob xato, lekin bola mavzu atrofida gapirishga harakat qilgan yoki 'bilmayman' degan.\n"
                "   - 0-9 ball: Javob savolga yoki ertakka mutlaqo aloqasiz (boshqa narsalar haqida gapirish).\n\n"
                "JSON formatida javob bering: {\"score\": ball, \"feedback\": \"rag'batlantiruvchi va tushuntiruvchi izoh\", \"passed\": true/false}"
            ),
            "ru-RU": (
                "Вы добрый и профессиональный детский педагог. Ваша задача: проанализировать и оценить ответ ребенка на вопрос по сказке.\n\n"
                "КРИТЕРИИ ОЦЕНКИ:\n"
                "1. СМЫСЛ И ЛОГИКА (Главное): Ответ ребенка не должен дословно совпадать с образцом (correct_answer). Если ребенок понял суть вопроса и ответ логически соответствует сказке, ставьте высокий балл (85-100).\n"
                "2. КЛЮЧЕВЫЕ СЛОВА: Если в ответе упоминаются главные объекты или действия из истории (например: птица, ручка, сон), это считается правильным ответом.\n"
                "3. ВОЗРАСТ И СТИЛЬ: Учитывайте, что это ребенок. Простой язык и короткие предложения — это нормально. Полностью игнорируйте грамматику и ошибки STT (перевода голоса в текст).\n"
                "4. БАЛЛЫ:\n"
                "   - 85-100 баллов: Смысл верный, на вопрос дан ответ (даже если очень простым языком).\n"
                "   - 50-84 баллов: Ответ частично верный или ребенок был близок к основной мысли.\n"
                "   - 10-49 баллов: Ответ неверный, но ребенок пытался говорить по теме или сказал 'не знаю'.\n"
                "   - 0-9 баллов: Ответ абсолютно не по теме вопроса или сказки.\n\n"
                "Ответьте в формате JSON: {\"score\": балл, \"feedback\": \"поощрительный комментарий\", \"passed\": true/false}"
            ),
            "en-US": (
                "You are a kind and professional children's educator. Your task: analyze and evaluate the child's answer to a story-based question.\n\n"
                "EVALUATION CRITERIA:\n"
                "1. MEANING AND LOGIC (Most important): The child's answer does not have to literally match the sample (correct_answer). If the child understood the essence of the question and their answer logically matches the story content, give a high score (85-100).\n"
                "2. KEYWORDS: If the answer contains main objects or actions from the story (e.g., bird, pen, dream), it is considered a correct answer.\n"
                "3. AGE AND STYLE: Consider that the student is a child. Simple language and short sentences are normal. Ignore grammar and STT (speech-to-text) errors completely.\n"
                "4. SCORING:\n"
                "   - 85-100 points: Correct meaning, question answered (even if in very simple language).\n"
                "   - 50-84 points: Partially correct answer or the child was close to the main idea.\n"
                "   - 10-49 points: Incorrect answer, but the child tried to speak on topic or said 'I don't know'.\n"
                "   - 0-9 points: The answer is completely unrelated to the question or the story.\n\n"
                "Respond in JSON format: {\"score\": score, \"feedback\": \"encouraging comment\", \"passed\": true/false}"
            )
        }
        
        system_prompt = system_prompts.get(lang, system_prompts["uz-UZ"])
        
        user_prompt = (
            f"Ertak matni:\n{request.story_text}\n\n"
            f"Savol: {request.question}\n"
            f"O'qituvchi kutgan to'g'ri javob (namuna): {request.correct_answer or 'Ertak mazmuniga asoslangan holda baholang'}\n\n"
            f"Bolaning javobi: {request.child_answer}\n\n"
            "Pedagogik nuqtai nazardan haqqoniy baholang va JSON formatida javob bering."
        )

        response = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            **model_kwargs
        )
        
        content = response.choices[0].message.content
        result = json.loads(content.strip())
        score = result.get("score", 0)
        result["passed"] = score >= 50
        return {"data": result}
        
    except Exception as e:
        logger.error(f"Error calling local evaluate_quiz: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {"data": {"score": 0, "feedback": "AI baholashda xatolik yuz berdi", "passed": False}}
