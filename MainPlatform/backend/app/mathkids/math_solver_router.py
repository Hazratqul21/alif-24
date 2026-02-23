"""
MathKids Solver - Matematik masalalarni yechish va o'rgatish
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from openai import AsyncOpenAI, AsyncAzureOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, HTTPException, Depends
from shared.database import get_db
import os
import json
import logging
from ..core.config import settings
from ..services.ai_cache_service import AICacheService

logger = logging.getLogger(__name__)
router = APIRouter()

# OpenAI configuration
OPENAI_MODEL = settings.OPENAI_MODEL or "gpt-4o-mini"

async def call_ai(messages, response_format=None, temperature=0.7):
    """Azure first, OpenAI fallback."""
    # 1) Azure
    try:
        client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION
        )
        kwargs = dict(model=settings.AZURE_OPENAI_DEPLOYMENT_NAME, messages=messages, temperature=temperature)
        if response_format:
            kwargs["response_format"] = response_format
        resp = await client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content
    except Exception as e:
        logger.warning(f"Azure math AI failed: {e}")
    # 2) OpenAI fallback
    try:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        kwargs = dict(model=OPENAI_MODEL, messages=messages, temperature=temperature)
        if response_format:
            kwargs["response_format"] = response_format
        resp = await client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content
    except Exception as e:
        logger.error(f"OpenAI math fallback also failed: {e}")
        raise

# Request models
class SolveProblemRequest(BaseModel):
    problem: str
    grade_level: int
    topic: Optional[str] = None

class ExplainStepRequest(BaseModel):
    problem: str
    step_number: int
    step_content: str
    question: str

class GenerateSimilarRequest(BaseModel):
    original_problem: str
    grade_level: int
    topic: Optional[str] = None

class ChatRequest(BaseModel):
    problem: str
    solution: str
    question: str

class InteractiveSolveRequest(BaseModel):
    problem: str
    grade_level: int
    current_step: int = 0
    student_answer: Optional[str] = None
    conversation_history: Optional[List[Dict]] = None


@router.post("/solve")
async def solve_math_problem(request: SolveProblemRequest, db: AsyncSession = Depends(get_db)):
    """
    Matematik masalani qadam-baqadam yechish va tushuntirish (Async + Optimized)
    """
    try:
        # 1. Semantic Caching check
        cache_key = AICacheService.generate_hash(request.problem, str(request.grade_level), model=OPENAI_MODEL)
        cached = await AICacheService.get_cached_response(db, cache_key)
        if cached:
            return {"solution": cached}

        system_prompt = (
            "Siz bog'cha va 1-4 sinf bolalari uchun matematik masalalarni yechadigan o'qituvchisiz. "
            "\n\nMUHIM QOIDALAR:"
            "\n1. Masala qanchalik SODDA bo'lsa, shuncha KAM QADAM"
            "\n2. Faqat: qo'shish, ayirish, ko'paytirish, bo'lish"
            "\n3. Har qadamda 'expected_answer' maydoni BO'LISHI SHART"
            "\n4. Javobni FAQAT JSON formatda qaytaring."
            "\n\nJSON format:"
            "\n{"
            '\n  "problem_type": "tur",'
            '\n  "steps": [{'
            '\n    "step_number": 1,'
            '\n    "title": "nom",'
            '\n    "explanation": "tushuntirish",'
            '\n    "example": "misol",'
            '\n    "expected_answer": "javob"'
            '\n  }],'
            '\n  "final_answer": "javob"'
            "\n}"
        )
        
        user_prompt = (
            f"Bolaning yoshi: {request.grade_level}\n"
            f"Masala: {request.problem}\n\n"
            f"Bu masalani bolaga juda sodda tilda tushuntirib ber. JSON formatida javob ber."
        )
        
        content = await call_ai(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        
        solution = json.loads(content.strip())
        
        # Save to Cache
        await AICacheService.set_cached_response(db, cache_key, solution, prompt_text=request.problem, model=OPENAI_MODEL)
        
        return {"solution": solution}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error solving problem: {str(e)}")


@router.post("/explain-step")
async def explain_step(request: ExplainStepRequest, db: AsyncSession = Depends(get_db)):
    """
    Konkret qadamni batafsil tushuntirish (Async)
    """
    try:
        # Cache check
        cache_key = AICacheService.generate_hash(request.step_content, request.question, model=OPENAI_MODEL)
        cached = await AICacheService.get_cached_response(db, cache_key)
        if cached:
            return cached

        system_prompt = (
            "Siz matematika o'qituvchisisiz. Talaba konkret qadam haqida savol bermoqda. "
            "Qisqa, aniq va tushunarli javob bering. Sodda tilda tushuntiring."
        )
        
        user_prompt = (
            f"Masala: {request.problem}\n"
            f"Qadam {request.step_number}: {request.step_content}\n\n"
            f"Talaba savoli: {request.question}\n\n"
            f"Bu qadamni batafsil tushuntiring."
        )
        
        content = await call_ai(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )
        
        explanation = content.strip()
        result = {"explanation": explanation}
        
        await AICacheService.set_cached_response(db, cache_key, result, prompt_text=request.question, model=OPENAI_MODEL)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error explaining step: {str(e)}")


@router.post("/generate-similar")
async def generate_similar(request: GenerateSimilarRequest, db: AsyncSession = Depends(get_db)):
    """
    O'xshash masala yaratish (Async)
    """
    try:
        system_prompt = (
            "Siz matematika o'qituvchisisiz. Berilgan masalaga o'xshash, lekin biroz boshqacha "
            "masala yarating. Murakkablik darajasi bir xil bo'lsin."
        )
        
        topic_text = f"Mavzu: {request.topic}\n" if request.topic else ""
        
        user_prompt = (
            f"Sinf darajasi: {request.grade_level}\n"
            f"{topic_text}"
            f"Asl masala: {request.original_problem}\n\n"
            f"Bu masalaga o'xshash yangi masala yarating. Faqat masala matnini yozing."
        )
        
        content = await call_ai(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.9
        )
        
        similar_problem = content.strip()
        return {"similar_problem": similar_problem}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating similar problem: {str(e)}")


@router.post("/chat")
async def chat_about_solution(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Yechim haqida savolga javob berish (Async)
    """
    try:
        system_prompt = (
            "Siz matematika o'qituvchisisiz. Talaba sizdan yechim haqida savol bermoqda. "
            "Javobingiz qisqa, aniq va tushunarli bo'lsin. Agar talaba tushunmagan bo'lsa, "
            "boshqa usul bilan tushuntirishga harakat qiling. "
            "Yoki xuddi shunga o'xshash boshqa misol keltiring va uni to'liq yechib bering."
        )
        
        user_prompt = (
            f"Masala: {request.problem}\n\n"
            f"Yechim: {request.solution}\n\n"
            f"Talaba savoli: {request.question}\n\n"
            f"Javob bering:"
        )
        
        content = await call_ai(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )
        
        ai_response = content.strip()
        return {"ai_response": ai_response}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


@router.post("/interactive-solve")
async def interactive_solve(request: InteractiveSolveRequest, db: AsyncSession = Depends(get_db)):
    """
    Interaktiv yechish (Async)
    """
    try:
        system_prompt = (
            "Siz bog'cha va 1-4 sinf bolalari bilan ishlaydigan mehribon o'qituvchisiz. "
            "Masalani JUDA SODDA, TUSHINARLI tilda tushuntiring. "
            "\n\nMUHIM QOIDALAR:"
            "\n1. HECH QACHON javobni to'g'ridan-to'g'ri aytmang"
            "\n2. Faqat qo'shish, ayirish, ko'paytirish, bo'lish kabi sodda amallar"
            "\n3. Boladan faqat ODDIY SONLARNI kiritishini so'rang"
            "\n4. Javobni FAQAT JSON formatda qaytaring."
            "\n\nJavob formati (JSON):"
            "\n{"
            '\n  "step_number": 1,'
            '\n  "question": "Qisqa va sodda savol",'
            '\n  "hint": "Sodda maslahat (kerak bo\'lsa)",'
            '\n  "is_correct": true/false,'
            '\n  "feedback": "Qisqa fikr",'
            '\n  "next_step": "keyingi qadamga o\'tish",'
            '\n  "final_answer": "yakuniy javob (oxirgi qadamda)"'
            "\n}"
        )
        
        messages = [{"role": "system", "content": system_prompt}]
        
        if request.conversation_history:
            for item in request.conversation_history:
                messages.append({"role": "user", "content": item.get("user", "")})
                messages.append({"role": "assistant", "content": item.get("assistant", "")})
        
        if request.student_answer:
            user_prompt = (
                f"Masala: {request.problem}\n"
                f"Bola yoshi: {request.grade_level}\n"
                f"Qadim: {request.current_step}\n"
                f"Bola javobi: {request.student_answer}\n\n"
                f"Bola javobini tekshiring va keyingi qadamni JSONda bering."
            )
        else:
            user_prompt = (
                f"Masala: {request.problem}\n"
                f"Bola yoshi: {request.grade_level}\n\n"
                f"BIRINCHI QADAMni boshlang."
            )
        
        messages.append({"role": "user", "content": user_prompt})
        
        content = await call_ai(
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.7
        )
        
        result = json.loads(content.strip())
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in interactive solving: {str(e)}")
