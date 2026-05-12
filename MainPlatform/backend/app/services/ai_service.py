import logging
from openai import AsyncOpenAI, AsyncAzureOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIService:
    _instance = None
    _client = None

    @classmethod
    def get_client(cls):
        """
        Creates and returns an OpenAI or AzureOpenAI client based on configuration.
        If endpoint contains '/openai/v1', it uses standard AsyncOpenAI with base_url.
        Otherwise, it uses AsyncAzureOpenAI.
        """
        if cls._client:
            return cls._client

        endpoint = settings.AZURE_OPENAI_ENDPOINT
        api_key = settings.AZURE_OPENAI_KEY
        api_version = settings.AZURE_OPENAI_API_VERSION

        if not endpoint or not api_key:
            logger.warning("AI Service: Azure OpenAI configuration missing (key or endpoint)")
            return None

        try:
            # If endpoint is a standard OpenAI-style URL (like the one provided by user),
            # use AsyncOpenAI with base_url.
            if "/openai/v1" in endpoint:
                logger.info(f"AI Service: Using standard AsyncOpenAI with base_url: {endpoint}")
                cls._client = AsyncOpenAI(
                    base_url=endpoint,
                    api_key=api_key
                )
            else:
                # Standard Azure OpenAI initialization
                logger.info(f"AI Service: Using AsyncAzureOpenAI with endpoint: {endpoint}")
                cls._client = AsyncAzureOpenAI(
                    azure_endpoint=endpoint,
                    api_key=api_key,
                    api_version=api_version
                )
            return cls._client
        except Exception as e:
            logger.error(f"AI Service: Failed to initialize AI client: {e}")
            return None

    @classmethod
    async def call_ai(cls, messages, model=None, response_format=None, temperature=0.7, max_tokens=None):
        """
        Centralized method to call AI.
        """
        client = cls.get_client()
        if not client:
            raise Exception("AI Client not initialized. Check configuration.")

        model_name = model or settings.AZURE_OPENAI_DEPLOYMENT_NAME or "gpt-4o-1"
        
        kwargs = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
        }
        
        if response_format:
            kwargs["response_format"] = response_format
        if max_tokens:
            kwargs["max_tokens"] = max_tokens

        try:
            resp = await client.chat.completions.create(**kwargs)
            return resp.choices[0].message.content
        except Exception as e:
            logger.error(f"AI Service: AI call failed: {e}")
            raise Exception(f"AI call failed: {e}")

# Global instance for easy import
ai_service = AIService
