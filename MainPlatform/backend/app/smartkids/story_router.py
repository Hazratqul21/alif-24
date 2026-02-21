"""
Story API - ertak asosida AI suhbat va tahlil
"""
import os
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta, timezone
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, cast, Date, select
from shared.database import get_db
from app.models.reading_analysis import ReadingAnalysis
from app.core.config import settings
from langdetect import detect, LangDetectException
from app.services.ai_cache_service import AICacheService

router = APIRouter()

# OpenAI configuration
OPENAI_API_KEY = settings.OPENAI_API_KEY
OPENAI_MODEL = settings.OPENAI_MODEL or "gpt-4"

# Language-specific prompts
def get_system_prompt(language: str, prompt_type: str):
    """Get system prompt based on language and prompt type"""
    prompts = {
        "next-question": {
            "uz-UZ": (
                "Siz bolalar bilan qiziqarli suhbat olib boruvchi va tarbiyaviy savollar beradigan AI yordamchisisiz. "
                "Har safar ertakka oid bitta sodda, qiziqarli savol yarating. "
                "Savollar bolaning ertakni tushunganini, qahramonlar va voqealarni eslab qolganini tekshirsin. "
                "Savol qisqa, aniq va bolaning yoshiga mos bo'lsin."
            ),
            "ru-RU": (
                "Вы - помощник ИИ, который ведет интересные беседы с детьми и задает воспитательные вопросы. "
                "Каждый раз создавайте один простой, интересный вопрос, связанный со сказкой. "
                "Вопросы должны проверять, понял ли ребенок сказку, запомнил ли персонажей и события. "
                "Вопрос должен быть коротким, четким и соответствовать возрасту ребенка."
            ),
            "en-US": (
                "You are an AI assistant who engages in interesting conversations with children and asks educational questions. "
                "Each time, create one simple, interesting question related to the story. "
                "Questions should check if the child understood the story and remembers characters and events. "
                "The question should be short, clear, and appropriate for the child's age."
            )
        },
        "chat-and-ask": {
            "uz-UZ": (
                "Siz bolalar bilan do'stona suhbat olib boruvchi AI yordamchisisiz. "
                "Bolaning javobini qadrlang va rag'batlantiring. "
                "Juda qisqa (1-2 jumla) va sodda javoblar bering. Ijobiy bo'ling. "
                "Ertak mavzusidan chiqib ketmang. Yangi savol SO'RAMANG!"
            ),
            "ru-RU": (
                "Вы - помощник ИИ, который дружелюбно общается с детьми. "
                "Оцените и поощрите ответ ребенка. "
                "Давайте очень короткие (1-2 предложения) и простые ответы. Будьте позитивны. "
                "Не отходите от темы сказки. НЕ ЗАДАВАЙТЕ НОВЫХ ВОПРОСОВ!"
            ),
            "en-US": (
                "You are an AI assistant who has friendly conversations with children. "
                "Appreciate and encourage the child's answer. "
                "Give very short (1-2 sentences) and simple answers. Be positive. "
                "Don't stray from the story topic. DO NOT ASK NEW QUESTIONS!"
                "Return response as JSON: {\"comment\": \"Your comment\", \"question\": null}"
            )
        },
        "analyze": {
            "uz-UZ": (
                "Siz bolalar nutqini tahlil qilish bo'yicha ekspertsiz. "
                "Bolaning javobini ertak matniga nisbatan tahlil qiling. "
                "Javobning to'g'riligini, tushunarligini va mantiqiy ekanligini baholang."
            ),
            "ru-RU": (
                "Вы эксперт в анализе детской речи. "
                "Проанализируйте ответ ребенка по отношению к тексту сказки. "
                "Оцените правильность, понятность и логичность ответа."
            ),
            "en-US": (
                "You are an expert in children's speech analysis. "
                "Analyze the child's answer in relation to the story text. "
                "Evaluate the correctness, clarity, and logical consistency of the answer."
            )
        }
    }
    
    return prompts.get(prompt_type, {}).get(language, prompts.get(prompt_type, {}).get("uz-UZ", ""))

def get_user_prompt_template(language: str):
    """Get user prompt template based on language"""
    templates = {
        "uz-UZ": (
            "Bola yoshi: {age} yosh.\n\n"
            "Ertak matni:\n{story_text}\n"
            "{history}\n"
            "Bu {question_number}-savol. Ertakga oid qiziqarli va sodda bitta savol yarating. "
            "Faqat savolni yozing, boshqa hech narsa qo'shmang."
        ),
        "ru-RU": (
            "Возраст ребенка: {age} лет.\n\n"
            "Текст сказки:\n{story_text}\n"
            "{history}\n"
            "Это вопрос №{question_number}. Создайте один интересный и простой вопрос, связанный со сказкой. "
            "Напишите только вопрос, ничего больше не добавляйте."
        ),
        "en-US": (
            "Child's age: {age} years old.\n\n"
            "Story text:\n{story_text}\n"
            "{history}\n"
            "This is question #{question_number}. Create one interesting and simple question related to the story. "
            "Write only the question, don't add anything else."
        )
    }
    
    return templates.get(language, templates.get("uz-UZ"))

def get_history_text(language: str, conversation_history: List[Dict]):
    """Get conversation history text based on language"""
    if not conversation_history:
        return ""
    
    history_labels = {
        "uz-UZ": {"user": "Bola", "assistant": "AI", "title": "Avvalgi suhbat:"},
        "ru-RU": {"user": "Ребенок", "assistant": "ИИ", "title": "Предыдущий разговор:"},
        "en-US": {"user": "Child", "assistant": "AI", "title": "Previous conversation:"}
    }
    
    labels = history_labels.get(language, history_labels["uz-UZ"])
    history_text = f"\n\n{labels['title']}\n"
    
    for msg in conversation_history[-4:]:
        role = labels.get(msg.get("role", "user"), "User")
        history_text += f"{role}: {msg.get('content', '')}\n"
    
    return history_text

def get_fallback_question(language: str):
    """Get fallback question based on language"""
    fallbacks = {
        "uz-UZ": "Ertakda nima bo'ldi?",
        "ru-RU": "Что произошло в сказке?",
        "en-US": "What happened in the story?"
    }
    return fallbacks.get(language, fallbacks["uz-UZ"])

# Request models
class NextQuestionRequest(BaseModel):
    story_text: str
    age: int
    conversation_history: Optional[List[Dict]] = []
    question_number: int = 1
    language: Optional[str] = "uz-UZ"

class AnalyzeRequest(BaseModel):
    story_text: str
    question: str
    child_answer: str
    child_audio_text: Optional[str] = None
    language: Optional[str] = "uz-UZ"

class AnalyzeReadingRequest(BaseModel):
    story_text: str
    spoken_text: str
    age: int = 7
    language: Optional[str] = "uz-UZ"

class ChatRequest(BaseModel):
    story_text: str
    question: str
    child_answer: str
    conversation_history: Optional[List[Dict]] = []
    language: Optional[str] = "uz-UZ"

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


class DetectLanguageRequest(BaseModel):
    text: str


def get_openai_client():
    """OpenAI async client yaratish"""
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


@router.post("/detect-language")
async def detect_language_endpoint(request: DetectLanguageRequest):
    """
    Matn tilini aniqlash (TTS uchun)
    Frontend StoryReader.jsx chaqiradi
    Returns: { code, voice, name } — Azure Speech TTS format
    """
    voice_map = {
        "uz": {"code": "uz-UZ", "voice": "uz-UZ-MadinaNeural", "name": "O'zbek"},
        "ru": {"code": "ru-RU", "voice": "ru-RU-SvetlanaNeural", "name": "Rus"},
        "en": {"code": "en-US", "voice": "en-US-AriaNeural", "name": "Ingliz"},
        "tr": {"code": "tr-TR", "voice": "tr-TR-EmelNeural", "name": "Turk"},
        "kk": {"code": "kk-KZ", "voice": "kk-KZ-AigulNeural", "name": "Qozoq"},
    }
    default = voice_map["uz"]
    try:
        detected = detect(request.text)
        result = voice_map.get(detected, default)
        return result
    except (LangDetectException, Exception):
        return default


@router.post("/next-question")
async def next_question(request: NextQuestionRequest):
    """
    Ertak asosida keyingi savol yaratish
    """
    try:
        # Auto-detect language
        try:
            detected = detect(request.story_text)
            if detected == 'ru': request.language = "ru-RU"
            elif detected == 'en': request.language = "en-US"
            else: request.language = "uz-UZ"
            print(f"🌍 Lang detected: {detected} -> {request.language}")
        except:
            request.language = "uz-UZ"
            
        client = get_openai_client()
        model = OPENAI_MODEL
        
        # Get language-specific system prompt
        system_prompt = get_system_prompt(request.language, "next-question")
        
        # Get conversation history in the appropriate language
        history_text = get_history_text(request.language, request.conversation_history)
        
        # Get user prompt template and format it
        user_prompt_template = get_user_prompt_template(request.language)
        user_prompt = user_prompt_template.format(
            age=request.age,
            story_text=request.story_text,
            history=history_text,
            question_number=request.question_number
        )
        
        response = await client.chat.completions.create(
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
        
        fallback_question = get_fallback_question(request.language)
        return {"question": question if question else fallback_question}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating question: {str(e)}")


@router.post("/analyze")
async def analyze_answer(request: AnalyzeRequest):
    """
    Bolaning javobini tahlil qilish
    """
    try:
        # Auto-detect language
        try:
            detected = detect(request.story_text)
            if detected == 'ru': request.language = "ru-RU"
            elif detected == 'en': request.language = "en-US"
            else: request.language = "uz-UZ"
        except:
            pass
            
        client = get_openai_client()
        model = OPENAI_MODEL
        
        # Get language-specific system prompt
        system_prompt = get_system_prompt(request.language, "analyze")
        
        # Language-specific prompts
        language_prompts = {
            "uz-UZ": {
                "system": "Siz bolalar nutqi va fikrlashini tahlil qiluvchi mutaxassissiz. Qisqa va aniq tahlil natijalarini berasiz. JSON formatida javob berasiz.",
                "audio_note": "Eslatma: STT natijasi: '{stt}', To'g'ri javob: '{correct}'",
                "instructions": (
                    "Quyidagilarni tahlil qiling va JSON formatida javob bering:\n"
                    "1. Nutq xatolari (phonetic errors) - masalan: 'r' harfini 'ye' deb aytgan, 'sh' harfini 's' deb aytgan\n"
                    "2. Fikrlash baholash - 'yaxshi', 'o'rtacha', 'fikrini aytishga qiynaladi', 'juda yaxshi bayon etdi'\n"
                    "3. Ma'no tahlili - axborotni to'g'ri tahlil qilib ma'nosini aytib berganmi\n"
                    "4. Qahramonlarni eslash - hikoya qahramonlarini yaxshi eslab qolganmi\n"
                    "5. Qahramonlarni ajratish - yaxshi va yomon qahramonlarni ajratib ko'rsatganmi"
                ),
                "labels": ["speech_errors", "thinking_assessment", "meaning_analysis", "character_recall", "character_distinction"]
            },
            "ru-RU": {
                "system": "Вы эксперт по анализу речи и мышления детей. Вы даете краткие и точные результаты анализа. Отвечайте в формате JSON.",
                "audio_note": "Примечание: результат STT: '{stt}', Правильный ответ: '{correct}'",
                "instructions": (
                    "Проанализируйте следующее и ответьте в формате JSON:\n"
                    "1. Речевые ошибки (phonetic errors) - например: произносит 'r' как 'ye', 'sh' как 's'\n"
                    "2. Оценка мышления - 'хорошо', 'средне', 'трудно выражает мысли', 'очень хорошо изложил'\n"
                    "3. Анализ смысла - правильно ли проанализировал информацию и передал смысл\n"
                    "4. Воспроизведение персонажей - хорошо ли запомнил персонажей истории\n"
                    "5. Различение персонажей - выделил ли хороших и плохих персонажей"
                ),
                "labels": ["speech_errors", "thinking_assessment", "meaning_analysis", "character_recall", "character_distinction"]
            },
            "en-US": {
                "system": "You are an expert in children's speech and thinking analysis. You provide brief and accurate analysis results. Answer in JSON format.",
                "audio_note": "Note: STT result: '{stt}', Correct answer: '{correct}'",
                "instructions": (
                    "Analyze the following and answer in JSON format:\n"
                    "1. Speech errors (phonetic errors) - e.g.: pronounces 'r' as 'ye', 'sh' as 's'\n"
                    "2. Thinking assessment - 'good', 'average', 'struggles to express thoughts', 'very well articulated'\n"
                    "3. Meaning analysis - correctly analyzed information and conveyed meaning\n"
                    "4. Character recall - well remembered story characters\n"
                    "5. Character distinction - distinguished good and bad characters"
                ),
                "labels": ["speech_errors", "thinking_assessment", "meaning_analysis", "character_recall", "character_distinction"]
            }
        }
        
        lang_config = language_prompts.get(request.language, language_prompts["uz-UZ"])
        
        audio_analysis = ""
        if request.child_audio_text and request.child_audio_text != request.child_answer:
            audio_analysis = f"\n{lang_config['audio_note'].format(stt=request.child_audio_text, correct=request.child_answer)}"
        
        story_label = 'Ertak matni' if request.language == 'uz-UZ' else 'Текст сказки' if request.language == 'ru-RU' else 'Story text'
        question_label = 'Savol' if request.language == 'uz-UZ' else 'Вопрос' if request.language == 'ru-RU' else 'Question'
        answer_label = 'Bolaning javobi' if request.language == 'uz-UZ' else 'Ответ ребенка' if request.language == 'ru-RU' else "Child's answer"
        
        user_prompt = (
            f"{story_label}:\n{request.story_text}\n\n"
            f"{question_label}: {request.question}\n\n"
            f"{answer_label}: {request.child_answer}{audio_analysis}\n\n"
            f"{lang_config['instructions']}\n\n"
            f"JSON format:\n"
            f'{{\n'
            f'  "{lang_config["labels"][0]}": ["list of errors"],\n'
            f'  "{lang_config["labels"][1]}": "assessment",\n'
            f'  "{lang_config["labels"][2]}": "analysis",\n'
            f'  "{lang_config["labels"][3]}": "character recall",\n'
            f'  "{lang_config["labels"][4]}": "character distinction"\n'
            f'}}'
        )
        
        response = await client.chat.completions.create(
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
        # Auto-detect language
        try:
            detected = detect(request.story_text)
            if detected == 'ru': request.language = "ru-RU"
            elif detected == 'en': request.language = "en-US"
            else: request.language = "uz-UZ"
        except:
            pass

        client = get_openai_client()
        model = OPENAI_MODEL
        
        # Language-specific prompts
        language_prompts = {
            "uz-UZ": {
                "system": (
                    "Siz bolalar o'qituvchisisiz. Bolaning ertak o'qishini tahlil qiling. "
                    "Bolaning nutqini (STT orqali olingan) asli matn bilan solishtiring. "
                    "Quyidagi JSON formatida qaytaring: "
                    "{'accuracy_score': 0-100, 'fluency_feedback': 'string', 'pronunciation_feedback': 'string', 'missing_words': ['word'], 'general_feedback': 'string'}"
                ),
                "original_text": "Asl matn",
                "spoken_text": "Bola o'qigani (STT)",
                "age": "Bola yoshi"
            },
            "ru-RU": {
                "system": (
                    "Вы учитель детей. Проанализируйте чтение сказки ребенком. "
                    "Сравните речь ребенка (полученную через STT) с исходным текстом. "
                    "Верните в следующем JSON формате: "
                    "{'accuracy_score': 0-100, 'fluency_feedback': 'string', 'pronunciation_feedback': 'string', 'missing_words': ['word'], 'general_feedback': 'string'}"
                ),
                "original_text": "Исходный текст",
                "spoken_text": "Прочитано ребенком (STT)",
                "age": "Возраст ребенка"
            },
            "en-US": {
                "system": (
                    "You are a children's teacher. Analyze the child's story reading. "
                    "Compare the child's speech (obtained via STT) with the original text. "
                    "Return in the following JSON format: "
                    "{'accuracy_score': 0-100, 'fluency_feedback': 'string', 'pronunciation_feedback': 'string', 'missing_words': ['word'], 'general_feedback': 'string'}"
                ),
                "original_text": "Original text",
                "spoken_text": "Child's reading (STT)",
                "age": "Child's age"
            }
        }
        
        lang_config = language_prompts.get(request.language, language_prompts["uz-UZ"])
        
        system_prompt = lang_config["system"]
        
        user_prompt = (
            f"{lang_config['original_text']}: {request.story_text}\n\n"
            f"{lang_config['spoken_text']}: {request.spoken_text}\n\n"
            f"{lang_config['age']}: {request.age}"
        )
        
        response = await client.chat.completions.create(
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
        raise HTTPException(status_code=500, detail=f"Error analyzing reading: {str(e)}")


@router.post("/chat-and-ask")
async def chat_and_ask(request: ChatRequest):
    """
    AI javob beradi - bolaning javobini qadrlaydi va rag'batlantiradi
    """
    try:
        # Auto-detect language
        try:
            detected = detect(request.story_text)
            if detected == 'ru': request.language = "ru-RU"
            elif detected == 'en': request.language = "en-US"
            else: request.language = "uz-UZ"
        except:
            pass

        client = get_openai_client()
        model = OPENAI_MODEL
        
        # Get language-specific system prompt
        system_prompt = get_system_prompt(request.language, "chat-and-ask")
        
        # Get language-specific user prompt
        user_prompts = {
            "uz-UZ": f"Ertak matni:\n{request.story_text}\n\nSavol: {request.question}\n\nBola javobi: {request.child_answer}\n\nBolaning javobini juda qisqa (1-2 jumla) qadrlab, rag'batlantiring. Yangi savol SO'RAMANG!",
            "ru-RU": f"Текст сказки:\n{request.story_text}\n\nВопрос: {request.question}\n\nОтвет ребенка: {request.child_answer}\n\nОчень кратко (1-2 предложения) оцените и поощрите ответ ребенка. НЕ ЗАДАВАЙТЕ НОВЫХ ВОПРОСОВ!",
            "en-US": f"Story text:\n{request.story_text}\n\nQuestion: {request.question}\n\nChild's answer: {request.child_answer}\n\nVery briefly (1-2 sentences) appreciate and encourage the child's answer. DO NOT ASK NEW QUESTIONS!"
        }
        
        user_prompt = user_prompts.get(request.language, user_prompts["uz-UZ"])
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        if request.conversation_history:
            for msg in request.conversation_history[-4:]:
                messages.insert(-1, msg)
        
        response = await client.chat.completions.create(
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
async def save_analysis(request: SaveAnalysisRequest, db: AsyncSession = Depends(get_db)):
    """
    SmartReaderTTS tahlilini saqlash
    """
    try:
        print(f"💾 Tahlilni saqlash: user_id={request.user_id}, title={request.story_title}")
        
        analysis = ReadingAnalysis(
            user_id=request.user_id,
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
        await db.commit()
        await db.refresh(analysis)
        
        print(f"✅ Tahlil saqlandi: ID={analysis.id}")
        
        return {
            "message": "Tahlil saqlandi",
            "analysis_id": analysis.id
        }
        
    except Exception as e:
        print(f"❌ Xato tahlilni saqlashda: {str(e)}")
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving analysis: {str(e)}")


@router.get("/user-analyses/{user_id}")
async def get_user_analyses(user_id: str, days: int = 30, db: AsyncSession = Depends(get_db)):
    """
    Foydalanuvchining oxirgi N kun ichidagi tahlillarini olish
    StudentDashboard uchun
    """
    try:
        print(f"📊 Tahlillarni olish: user_id={user_id}, days={days}")
        
        # Oxirgi N kun
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        result = await db.execute(
            select(ReadingAnalysis).where(
                ReadingAnalysis.user_id == user_id,
                ReadingAnalysis.session_date >= start_date
            ).order_by(ReadingAnalysis.session_date.desc())
        )
        analyses = result.scalars().all()
        
        print(f"📈 Topilgan tahlillar: {len(analyses)} ta")
        
        # Kunlik statistika
        daily_result = await db.execute(
            select(
                cast(ReadingAnalysis.session_date, Date).label('date'),
                func.sum(ReadingAnalysis.total_words_read).label('total_words'),
                func.avg(ReadingAnalysis.speech_errors).label('avg_errors'),
                func.avg(ReadingAnalysis.comprehension_score).label('avg_comprehension'),
                func.avg(ReadingAnalysis.answer_quality_score).label('avg_answers')
            ).where(
                ReadingAnalysis.user_id == user_id,
                ReadingAnalysis.session_date >= start_date
            ).group_by(cast(ReadingAnalysis.session_date, Date))
        )
        daily_stats = daily_result.all()
        
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
                    "id": a.id,
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
        
    except Exception as e:
        print(f"❌ Xato tahlillarni olishda: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching analyses: {str(e)}")
