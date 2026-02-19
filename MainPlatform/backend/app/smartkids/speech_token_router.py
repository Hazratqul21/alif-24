"""
Azure Speech SDK Token endpoint
Frontend bu tokenni SpeechConfig.fromAuthorizationToken() da ishlatadi.
"""
from fastapi import APIRouter, HTTPException
from shared.services.azure_speech_service import speech_service

router = APIRouter()

@router.get("/speech-token")
async def get_speech_token():
    """
    Azure Speech SDK uchun token olish.
    Frontend bu token bilan bevosita Azure Speech SDK ishlatadi (key o'rniga).
    Token 10 daqiqa amal qiladi, server tomonida 9 daqiqa cache qilinadi.
    """
    try:
        return await speech_service.get_token_for_client()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voices")
async def get_available_voices():
    """Mavjud ovozlar ro'yxati — frontend til tanlash uchun"""
    return speech_service.get_available_voices()
