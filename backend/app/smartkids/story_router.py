"""
Story API - ertak asosida AI suhbat va tahlil
"""
import os
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from openai import AzureOpenAI
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from app.core.database import get_db
from app.models.reading_analysis import ReadingAnalysis

router = APIRouter()

# Request models
class NextQuestionRequest(BaseModel):
    story_text: str
    age: int
    conversation_history: Optional[List[Dict]] = []
    question_number: int = 1

class AnalyzeRequest(BaseModel):
    story_text: str
    question: str
    child_answer: str
    child_audio_text: Optional[str] = None

class AnalyzeReadingRequest(BaseModel):
    story_text: str
    spoken_text: str
    age: int = 7

class ChatRequest(BaseModel):
    story_text: str
    question: str
    child_answer: str
    conversation_history: Optional[List[Dict]] = []

class SaveAnalysisRequest(BaseModel):
    user_id: str
    story_title: Optional[str] = None
    total_words_read: int = 0
    reading_time_seconds: int = 0
    speech_errors: int = 0
    pronunciation_score: float = 0.0
    fluency_score: float = 0.0
    comprehension_score: float = 0.0
    expression_quality: float = 0.0
    total_questions: int = 0
    correct_answers: int = 0
    answer_quality_score: float = 0.0
    conversation_history: Optional[List[Dict]] = None
    detailed_analysis: Optional[Dict] = None
    ai_feedback: Optional[str] = None


def get_azure_client():
    """Azure OpenAI client yaratish"""
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_OPENAI_KEY")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview")
    
    if not endpoint or not api_key:
        raise HTTPException(status_code=500, detail="Azure OpenAI credentials not configured")
    
    return AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version=api_version
    )


@router.post("/next-question")
async def next_question(request: NextQuestionRequest):
    """
    Ertak asosida keyingi savol yaratish
    """
    try:
        client = get_azure_client()
        model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")
        
        system_prompt = (
            "Siz bolalar bilan qiziqarli suhbat olib boruvchi va tarbiyaviy savollar beradigan AI yordamchisisiz. "
            "Har safar ertakka oid bitta sodda, qiziqarli savol yarating. "
            "Savollar bolaning ertakni tushunganini, qahramonlar va voqealarni eslab qolganini tekshirsin. "
            "Savol qisqa, aniq va bolaning yoshiga mos bo'lsin."
        )
        
        history_text = ""
        if request.conversation_history and len(request.conversation_history) > 0:
            history_text = "\n\nAvvalgi suhbat:\n"
            for msg in request.conversation_history[-4:]:
                role = "Bola" if msg.get("role") == "user" else "AI"
                history_text += f"{role}: {msg.get('content', '')}\n"
        
        user_prompt = (
            f"Bola yoshi: {request.age} yosh.\n\n"
            f"Ertak matni:\n{request.story_text}\n"
            f"{history_text}\n"
            f"Bu {request.question_number}-savol. Ertakga oid qiziqarli va sodda bitta savol yarating. "
            f"Faqat savolni yozing, boshqa hech narsa qo'shmang."
        )
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=150,
            temperature=0.8
        )
        
        question = response.choices[0].message.content.strip()
        
        # Raqam yoki tire bo'lsa olib tashlash
        if question and question[0].isdigit():
            question = question.split('.', 1)[-1].strip()
        if question.startswith('-'):
            question = question[1:].strip()
        
        return {"question": question if question else "Ertakda nima bo'ldi?"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating question: {str(e)}")


@router.post("/analyze")
async def analyze_answer(request: AnalyzeRequest):
    """
    Bolaning javobini tahlil qilish
    """
    try:
        client = get_azure_client()
        model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")
        
        system_prompt = (
            "Siz bolalar nutqi va fikrlashini tahlil qiluvchi mutaxassissiz. "
            "Qisqa va aniq tahlil natijalarini berasiz. "
            "JSON formatida javob berasiz."
        )
        
        audio_analysis = ""
        if request.child_audio_text and request.child_audio_text != request.child_answer:
            audio_analysis = f"\nEslatma: STT natijasi: '{request.child_audio_text}', To'g'ri javob: '{request.child_answer}'"
        
        user_prompt = (
            f"Ertak matni:\n{request.story_text}\n\n"
            f"Savol: {request.question}\n\n"
            f"Bolaning javobi: {request.child_answer}{audio_analysis}\n\n"
            f"Quyidagilarni tahlil qiling va JSON formatida javob bering:\n"
            f"1. Nutq xatolari (phonetic errors) - masalan: 'r' harfini 'ye' deb aytgan, 'sh' harfini 's' deb aytgan\n"
            f"2. Fikrlash baholash - 'yaxshi', 'o'rtacha', 'fikrini aytishga qiynaladi', 'juda yaxshi bayon etdi'\n"
            f"3. Ma'no tahlili - axborotni to'g'ri tahlil qilib ma'nosini aytib berganmi\n"
            f"4. Qahramonlarni eslash - hikoya qahramonlarini yaxshi eslab qolganmi\n"
            f"5. Qahramonlarni ajratish - yaxshi va yomon qahramonlarni ajratib ko'rsatganmi\n\n"
            f"JSON format:\n"
            f'{{\n'
            f'  "speech_errors": ["xatolar ro\'yxati"],\n'
            f'  "thinking_assessment": "baholash",\n'
            f'  "meaning_analysis": "tahlil",\n'
            f'  "character_recall": "qahramonlarni eslash",\n'
            f'  "character_distinction": "qahramonlarni ajratish"\n'
            f'}}'
        )
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        analysis_result = json.loads(response.choices[0].message.content.strip())
        return {"analysis": analysis_result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing answer: {str(e)}")


@router.post("/analyze-reading")
async def analyze_reading(request: AnalyzeReadingRequest):
    """
    Bolaning o'qishini tahlil qilish (STT matni asosida)
    """
    try:
        client = get_azure_client()
        model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")
        
        system_prompt = (
            "Siz bolalar o'qituvchisisiz. Bolaning ertak o'qishini tahlil qiling. "
            "Bolaning nutqini (STT orqali olingan) asli matn bilan solishtiring. "
            "Quyidagi JSON formatida qaytaring: "
            "{'accuracy_score': 0-100, 'fluency_feedback': 'string', 'pronunciation_feedback': 'string', 'missing_words': ['word'], 'general_feedback': 'string'}"
        )
        
        user_prompt = (
            f"Asl matn: {request.story_text}\n\n"
            f"Bola o'qigani (STT): {request.spoken_text}\n\n"
            f"Bala yoshi: {request.age}"
        )
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        analysis_result = json.loads(response.choices[0].message.content.strip())
        return {"analysis": analysis_result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing reading: {str(e)}")


@router.post("/chat-and-ask")
async def chat_and_ask(request: ChatRequest):
    """
    AI javob beradi - bolaning javobini qadrlaydi va rag'batlantiradi
    """
    try:
        client = get_azure_client()
        model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")
        
        system_prompt = (
            "Siz bolalar bilan do'stona suhbat olib boruvchi AI yordamchisisiz. "
            "Bolaning javobini qadrlang va rag'batlantiring. "
            "Juda qisqa (1-2 jumla) va sodda javoblar bering. Ijobiy bo'ling. "
            "Ertak mavzusidan chiqib ketmang. Yangi savol SO'RAMANG!"
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Ertak matni:\n{request.story_text}\n\nSavol: {request.question}\n\nBola javobi: {request.child_answer}\n\nBolaning javobini juda qisqa (1-2 jumla) qadrlab, rag'batlantiring. Yangi savol SO'RAMANG!"}
        ]
        
        if request.conversation_history:
            for msg in request.conversation_history[-4:]:
                messages.insert(-1, msg)
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=150,
            temperature=0.8
        )
        
        ai_response = response.choices[0].message.content.strip()
        return {"ai_response": ai_response}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in chat: {str(e)}")


@router.post("/save-analysis")
async def save_analysis(request: SaveAnalysisRequest, db: Session = Depends(get_db)):
    """
    SmartReaderTTS tahlilini saqlash
    """
    try:
        print(f"💾 Tahlilni saqlash: user_id={request.user_id}, title={request.story_title}")
        
        # UUID conversion
        try:
            from uuid import UUID
            user_uuid = UUID(request.user_id) if isinstance(request.user_id, str) else request.user_id
            print(f"✅ UUID converted: {user_uuid}")
        except ValueError:
            print(f"❌ Invalid UUID: {request.user_id}")
            raise HTTPException(status_code=400, detail=f"Invalid user_id format: {request.user_id}")
        
        analysis = ReadingAnalysis(
            user_id=user_uuid,
            story_title=request.story_title,
            total_words_read=request.total_words_read,
            reading_time_seconds=request.reading_time_seconds,
            speech_errors=request.speech_errors,
            pronunciation_score=request.pronunciation_score,
            fluency_score=request.fluency_score,
            comprehension_score=request.comprehension_score,
            expression_quality=request.expression_quality,
            total_questions=request.total_questions,
            correct_answers=request.correct_answers,
            answer_quality_score=request.answer_quality_score,
            conversation_history=request.conversation_history,
            detailed_analysis=request.detailed_analysis,
            ai_feedback=request.ai_feedback
        )
        
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        
        print(f"✅ Tahlil saqlandi: ID={analysis.id}")
        
        return {
            "message": "Tahlil saqlandi",
            "analysis_id": str(analysis.id)
        }
        print(f"❌ Xato tahlilni saqlashda: {str(e)}")
        import traceback
        traceback.print_exc()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving analysis: {str(e)}")


@router.get("/user-analyses/{user_id}")
async def get_user_analyses(user_id: str, days: int = 30, db: Session = Depends(get_db)):
    """
    Foydalanuvchining oxirgi N kun ichidagi tahlillarini olish
    StudentDashboard uchun
    """
    try:
        print(f"📊 Tahlillarni olish: user_id={user_id}, days={days}")
        
        # UUID conversion
        try:
            from uuid import UUID
            user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
            print(f"✅ UUID converted: {user_uuid}")
        except ValueError:
            print(f"❌ Invalid UUID: {user_id}")
            raise HTTPException(status_code=400, detail=f"Invalid user_id format: {user_id}")
        
        # Oxirgi N kun
        start_date = datetime.utcnow() - timedelta(days=days)
        
        analyses = db.query(ReadingAnalysis).filter(
            ReadingAnalysis.user_id == user_uuid,
            ReadingAnalysis.session_date >= start_date
        ).order_by(ReadingAnalysis.session_date.desc()).all()
        
        print(f"📈 Topilgan tahlillar: {len(analyses)} ta")
        
        # Kunlik statistika
        daily_stats = db.query(
            cast(ReadingAnalysis.session_date, Date).label('date'),
            func.sum(ReadingAnalysis.total_words_read).label('total_words'),
            func.avg(ReadingAnalysis.speech_errors).label('avg_errors'),
            func.avg(ReadingAnalysis.comprehension_score).label('avg_comprehension'),
            func.avg(ReadingAnalysis.answer_quality_score).label('avg_answers')
        ).filter(
            ReadingAnalysis.user_id == user_uuid,
            ReadingAnalysis.session_date >= start_date
        ).group_by(cast(ReadingAnalysis.session_date, Date)).all()
        
        # Umumiy ko'rsatkichlar
        total_sessions = len(analyses)
        total_words = sum([a.total_words_read for a in analyses])
        avg_pronunciation = sum([a.pronunciation_score for a in analyses]) / total_sessions if total_sessions > 0 else 0
        avg_fluency = sum([a.fluency_score for a in analyses]) / total_sessions if total_sessions > 0 else 0
        avg_comprehension = sum([a.comprehension_score for a in analyses]) / total_sessions if total_sessions > 0 else 0
        total_errors = sum([a.speech_errors for a in analyses])
        
        print(f"📊 Statistika: sessions={total_sessions}, words={total_words}, daily_stats={len(daily_stats)}")
        
        return {
            "total_sessions": total_sessions,
            "total_words": total_words,
            "avg_pronunciation": round(avg_pronunciation, 1),
            "avg_fluency": round(avg_fluency, 1),
            "avg_comprehension": round(avg_comprehension, 1),
            "total_speech_errors": total_errors,
            "daily_stats": [
                {
                    "date": str(stat.date),
                    "total_words": int(stat.total_words or 0),
                    "avg_errors": round(float(stat.avg_errors or 0), 1),
                    "avg_comprehension": round(float(stat.avg_comprehension or 0), 1),
                    "avg_answers": round(float(stat.avg_answers or 0), 1)
                }
                for stat in daily_stats
            ],
            "recent_analyses": [
                {
                    "id": str(a.id),
                    "date": a.session_date.isoformat(),
                    "story_title": a.story_title,
                    "words_read": a.total_words_read,
                    "pronunciation_score": a.pronunciation_score,
                    "comprehension_score": a.comprehension_score,
                    "speech_errors": a.speech_errors
                }
                for a in analyses[:10]
            ]
        }
        print(f"❌ Xato tahlillarni olishda: {str(e)}")
        import traceback
        traceback.print_exc()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analyses: {str(e)}")
