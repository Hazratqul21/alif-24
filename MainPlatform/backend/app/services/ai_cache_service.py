import hashlib
import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
from sqlalchemy import select, func
from ..models.ai_cache import AICache
from typing import Optional, Dict, Any

class AICacheService:
    @staticmethod
    def generate_hash(prompt: str, context: str = "", model: str = "gpt-4") -> str:
        """Generate SHA256 hash for the prompt configuration"""
        content = f"{model}:{prompt}:{context}"
        return hashlib.sha256(content.encode()).hexdigest()

    @staticmethod
    async def get_cached_response(db: AsyncSession, prompt_hash: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached response if exists (Async)"""
        stmt = select(AICache).filter(AICache.prompt_hash == prompt_hash)
        result = await db.execute(stmt)
        cache_entry = result.scalars().first()
        
        if cache_entry:
            try:
                return json.loads(cache_entry.response_json)
            except json.JSONDecodeError:
                return None
        return None

    @staticmethod
    async def set_cached_response(
        db: AsyncSession, 
        prompt_hash: str, 
        response_data: Dict[str, Any], 
        prompt_text: str = "", 
        model: str = "gpt-4",
        tokens: int = 0
    ):
        """Save response to cache (Async)"""
        response_str = json.dumps(response_data)
        
        stmt = select(AICache).filter(AICache.prompt_hash == prompt_hash)
        result = await db.execute(stmt)
        existing = result.scalars().first()
        
        if existing:
            existing.response_json = response_str
            existing.updated_at = func.now()
        else:
            new_cache = AICache(
                prompt_hash=prompt_hash,
                prompt_text=prompt_text[:1000] if prompt_text else "",
                response_json=response_str,
                model_name=model,
                tokens_used=tokens
            )
            db.add(new_cache)
        
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.error(f"Cache Save Error: {e}")
