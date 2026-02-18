"""
Russian Letters Learning Router
"""
from fastapi import APIRouter, HTTPException, Response, UploadFile, File
from pydantic import BaseModel
import os
import httpx
from app.core.config import settings

router = APIRouter()


class TextToSpeechRequest(BaseModel):
    text: str
    language: str = "ru-RU"

def normalize_russian(text):
    """Normalize Russian text for TTS"""
    if not text:
        return text
    
    # Basic Russian text normalization
    replacements = {
        'ё': 'е',
        'Ё': 'Е',
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    return text.strip()

@router.options("/text-to-speech")
async def text_to_speech_options():
    """Handle CORS preflight for text-to-speech"""
    return Response(status_code=200)

@router.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """Convert Russian text to speech"""
    if not request.text:
        raise HTTPException(status_code=400, detail="Текст не введен.")
    
    norm_text = normalize_russian(request.text)
    
    # Configure Azure Speech
    speech_key = settings.AZURE_SPEECH_KEY
    speech_region = settings.AZURE_SPEECH_REGION
    
    if not speech_key:
        raise HTTPException(status_code=501, detail="Azure Speech key not configured")
    
    # Use REST API instead of SDK
    from xml.sax.saxutils import escape
    escaped = escape(norm_text)
    ssml = f"""<speak version='1.0' xml:lang='ru-RU'>
        <voice name='ru-RU-DariyaNeural'>
            {escaped}
        </voice>
    </speak>"""
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get token
            token_url = f"https://{speech_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
            token_resp = await client.post(token_url, headers={"Ocp-Apim-Subscription-Key": speech_key})
            token_resp.raise_for_status()
            token = token_resp.text
            
            # TTS
            tts_url = f"https://{speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"
            tts_resp = await client.post(tts_url, headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
                "User-Agent": "Alif24-Backend"
            }, content=ssml.encode('utf-8'))
            tts_resp.raise_for_status()
            
            return Response(content=tts_resp.content, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")

@router.get("/")
async def rharf_home():
    """Russian harf module home"""
    return {"module": "rharf", "status": "active"}

@router.options("/speech-to-text")
async def speech_to_text_options():
    """Handle CORS preflight for speech-to-text"""
    return Response(status_code=200)

@router.post("/speech-to-text")
async def speech_to_text(file: UploadFile = File(...)):
    """Convert Russian speech to text"""
    audio_data = await file.read()
    
    if not audio_data:
        raise HTTPException(status_code=400, detail="Аудио данные не отправлены.")
    
    # STT via REST API is not supported server-side without SDK.
    # The frontend uses Azure Speech SDK directly via browser for STT.
    raise HTTPException(
        status_code=501,
        detail="Server-side STT is disabled. Use browser-based Azure Speech SDK instead."
    )
