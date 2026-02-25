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

class GenerateProblemRequest(BaseModel):
    grade_level: int
    topic: Optional[str] = None
    count: int = 5