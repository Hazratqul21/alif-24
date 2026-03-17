"""
MathKids Solver - Matematik masalalarni yechish va o'rgatish
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from openai import AsyncAzureOpenAI
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

# Azure OpenAI configuration
AZURE_DEPLOYMENT_NAME = settings.AZURE_OPENAI_DEPLOYMENT_NAME or "gpt-5-chat"

async def call_ai(messages, response_format=None, temperature=0.7):
    """Azure OpenAI only."""
    if not settings.AZURE_OPENAI_KEY or not settings.AZURE_OPENAI_ENDPOINT:
        raise Exception("Azure OpenAI not configured")

    try:
        client = AsyncAzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION
        )
        kwargs = dict(model=AZURE_DEPLOYMENT_NAME, messages=messages, temperature=temperature)
        if response_format:
            kwargs["response_format"] = response_format
        resp = await client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content
    except Exception as e:
        logger.warning(f"Azure math AI failed: {e}")
        raise Exception(f"Azure math AI failed: {e}")

# Request models
class SolveProblemRequest(BaseModel):
    problem: str
    grade_level: int
    topic: Optional[str] = None

class ExplainStepRequest(BaseModel):
    problem: str
    step_number: int
    step_content: str

class AskQuestionRequest(BaseModel):
    problem: str
    grade_level: int
    question: str
    conversation_history: Optional[List[Dict]] = None

class InteractiveSolveRequest(BaseModel):
    problem: str
    grade_level: int
    current_step: int = 0
    student_answer: Optional[str] = None
    conversation_history: Optional[List[Dict]] = None

class GenerateProblemRequest(BaseModel):
    grade_level: int
    topic: Optional[str] = None
    count: int = 5


@router.post("/solve")
async def solve_problem(request: SolveProblemRequest):
    """Solve a math problem and return a step-by-step solution."""
    # Simple fallback when Azure isn't configured
    if not settings.AZURE_OPENAI_KEY or not settings.AZURE_OPENAI_ENDPOINT:
        return {
            "solution": {
                "steps": [
                    {
                        "step": "Avvalo masalani diqqat bilan o'qing.",
                        "expected_answer": None,
                        "example": None,
                    }
                ],
                "final_answer": "[AI konfiguratsiyasi yo'q]"
            }
        }

    prompt = (
        "Siz matematik masalalarni bosqichma-bosqich yechuvchi yordamchisiz. "
        "Foydalanuvchining masalasini o'qib, keyin yechim bosqichlarini JSON formatida qaytaring. "
        "JSON strukturasini faqatgina quyidagi shaklda qaytaring (hech qanday izohsiz):\n"
        "{\n"
        "  \"solution\": {\n"
        "    \"steps\": [\n"
        "      {\n"
        "        \"step\": \"...\",\n"
        "        \"expected_answer\": \"...\",\n"
        "        \"example\": \"...\"\n"
        "      }\n"
        "    ],\n"
        "    \"final_answer\": \"...\"\n"
        "  }\n"
        "}\n"
        "Masalani quyida keltirilgan tarzda qo'shing:\n"
        f"Masala: {request.problem}\n"
        f"Baho darajasi: {request.grade_level}\n"
    )

    try:
        response_text = await call_ai(
            messages=[
                {"role": "system", "content": "Siz matematik masalalarni ketma-ket yechish uchun yordamchisiz."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )

        # Ba'zan AI noto'g'ri JSON qaytarishi mumkin - iloji boricha pars qilishga harakat qilamiz
        try:
            parsed = json.loads(response_text)
        except Exception:
            parsed = None

        if not parsed or "solution" not in parsed:
            # Fallback: return raw text wrapped as a single step
            return {
                "solution": {
                    "steps": [
                        {
                            "step": response_text.strip(),
                            "expected_answer": None,
                            "example": None,
                        }
                    ],
                    "final_answer": response_text.strip(),
                }
            }

        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interactive-solve")
async def interactive_solve(request: InteractiveSolveRequest):
    """Interactive solving step: return the next question/hint based on the current step."""
    # Fallback if Azure not configured
    if not settings.AZURE_OPENAI_KEY or not settings.AZURE_OPENAI_ENDPOINT:
        return {
            "step_number": (request.conversation_history and len(request.conversation_history) + 1) or 1,
            "question": "Masalani qanday yechishni boshlaysiz?",
            "feedback": None,
            "hint": "Masalani qadamlar bo'lib ajrating va har bir qadamni tekshiring.",
            "is_correct": None,
            "final_answer": None,
        }

    # Build a prompt intended to produce a consistent JSON output
    prompt = (
        "Siz interaktiv tarzda matematik masalalarni yechadigan yordamchisiz. "
        "Foydalanuvchi har bir qadamda javob beradi, va siz unga keyingi savolni berasiz. "
        "Har bir javobga fikr bildiring va kerak bo'lsa maslahat bering. "
        "Javobni quyidagi JSON formatida qaytaring (bo'sh joylar yoki izohlar yo'q):\n"
        "{\n"
        "  \"step_number\": 1,\n"
        "  \"question\": \"...\",\n"
        "  \"feedback\": \"...\",\n"
        "  \"hint\": \"...\",\n"
        "  \"is_correct\": true|false|null,\n"
        "  \"final_answer\": \"...\"\n"
        "}\n"
        f"Masala: {request.problem}\n"
        f"Baho darajasi: {request.grade_level}\n"
        f"Hozirgi qadam: {request.current_step}\n"
        f"Talabaning javobi: {request.student_answer}\n"
        f"Oldingi suhbat: {json.dumps(request.conversation_history or [])}\n"
    )

    try:
        response_text = await call_ai(
            messages=[
                {"role": "system", "content": "Siz o'quvchiga yo'l-yo'riq beruvchi, do'stona interaktiv matematik yordamchisiz."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
        )

        try:
            parsed = json.loads(response_text)
        except Exception:
            parsed = None

        if not parsed or not isinstance(parsed, dict):
            return {
                "step_number": request.current_step + 1,
                "question": "Masalani qanday yechishni boshlaysiz?",
                "feedback": None,
                "hint": "Boshlash uchun masalani oddiy soddalarga ajrating.",
                "is_correct": None,
                "final_answer": None,
            }

        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
