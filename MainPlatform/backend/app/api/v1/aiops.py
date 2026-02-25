"""
AIOps Router - AI yordamida testlar yaratish
"""
import os
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from shared.database import get_db
from shared.database.models import User, UserRole
from app.middleware.auth import get_current_user
from app.core.config import settings
from openai import AsyncAzureOpenAI

logger = logging.getLogger(__name__)
router = APIRouter()

def get_azure_client():
    return AsyncAzureOpenAI(
        azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        api_key=settings.AZURE_OPENAI_KEY,
        api_version=settings.AZURE_OPENAI_API_VERSION
    )

class AITestGenerateRequest(BaseModel):
    text: str = Field(..., description="Dars yoki matn", min_length=20)
    question_count: int = Field(default=5, ge=1, le=20)
    difficulty: str = Field(default="medium", description="easy, medium, hard")

@router.post("/teachers/ai/generate-test")
async def generate_test(
    request: AITestGenerateRequest,
    current_user: User = Depends(get_current_user)
):
    allowed_roles = [UserRole.teacher, UserRole.organization, UserRole.moderator]
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Faqat o'qituvchilar ruxsatga ega")

    system_prompt = (
        "Siz o'qituvchilarga sifatli test tuzishda yordam beruvchi AI assistentisiz. "
        f"Matn asosida {request.question_count} ta '{request.difficulty}' qiyinchilikdagi o'zbek tilida test savollarini JSON obyekt formatida yarating. "
        "Har bir savol uchun 4 ta variant va 'correct_answer' (faqat kichik harflarda 'a', 'b', 'c', yoki 'd') bo'lsin. "
        "Qat'iy ravishda bitta 'questions' kalitli ana shunday JSON obyekt qaytaring:\n"
        "{\n"
        "  \"questions\": [\n"
        "    {\n"
        "      \"question\": \"Savol matni\",\n"
        "      \"options\": {\"a\": \"var\", \"b\": \"var\", \"c\": \"var\", \"d\": \"var\"},\n"
        "      \"correct_answer\": \"b\"\n"
        "    }\n"
        "  ]\n"
        "}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Matn: {request.text}"}
    ]

    # Azure OpenAI only
    if not settings.AZURE_OPENAI_KEY or not settings.AZURE_OPENAI_ENDPOINT:
        raise HTTPException(status_code=503, detail="Azure OpenAI not configured")

    try:
        azure_client = get_azure_client()
        azure_model = settings.AZURE_OPENAI_DEPLOYMENT_NAME or "gpt-5-chat"
        logger.info(f"Using Azure OpenAI: endpoint={settings.AZURE_OPENAI_ENDPOINT}, model={azure_model}")
        response = await azure_client.chat.completions.create(
            model=azure_model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        data = json.loads(response.choices[0].message.content.strip())
        logger.info("Azure OpenAI success")
        return {"success": True, "data": data.get("questions", [])}
    except Exception as azure_err:
        logger.error(f"Azure OpenAI failed: {azure_err}")
        raise HTTPException(status_code=500, detail=f"AI xizmati vaqtincha ishlamayapti: {str(azure_err)[:200]}")
