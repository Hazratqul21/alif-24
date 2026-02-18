from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Response
from pydantic import BaseModel
from typing import Optional
import os
import httpx
import logging
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


class TTSRequest(BaseModel):
    text: str
    language: str  # uz-UZ, ru-RU, en-US
    voice: Optional[str] = None

VOICE_MAPPING = {
    "uz-UZ": "uz-UZ-MadinaNeural",
    "ru-RU": "ru-RU-DariyaNeural",
    "en-US": "en-US-JennyNeural"
}

def get_voice_name(language, custom_voice=None):
    """Get voice name for language"""
    if custom_voice:
        return custom_voice
    return VOICE_MAPPING.get(language, "en-US-JennyNeural")

@router.options("/tts")
async def tts_options():
    return Response(status_code=200)

@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Unified Text to Speech endpoint via REST API"""
    speech_key = settings.AZURE_SPEECH_KEY
    speech_region = settings.AZURE_SPEECH_REGION
    
    if not speech_key:
        raise HTTPException(status_code=501, detail="Azure Speech key not configured")
    
    voice_name = get_voice_name(request.language, request.voice)
    
    from xml.sax.saxutils import escape
    escaped = escape(request.text)
    ssml = f"""<speak version='1.0' xml:lang='{request.language}'>
        <voice name='{voice_name}'>
            {escaped}
        </voice>
    </speak>"""
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            token_url = f"https://{speech_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
            token_resp = await client.post(token_url, headers={"Ocp-Apim-Subscription-Key": speech_key})
            token_resp.raise_for_status()
            
            tts_url = f"https://{speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"
            tts_resp = await client.post(tts_url, headers={
                "Authorization": f"Bearer {token_resp.text}",
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
                "User-Agent": "Alif24-Backend"
            }, content=ssml.encode('utf-8'))
            tts_resp.raise_for_status()
            
            return Response(content=tts_resp.content, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")

@router.options("/stt")
async def stt_options():
    return Response(status_code=200)

@router.post("/stt")
async def speech_to_text(
    file: UploadFile = File(...),
    language: str = Form(...)
):
    """Unified Speech to Text endpoint"""
    # STT via REST API is not supported server-side without SDK.
    # The frontend uses Azure Speech SDK directly via browser for STT.
    raise HTTPException(
        status_code=501,
        detail="Server-side STT is disabled. Use browser-based Azure Speech SDK instead."
    )
