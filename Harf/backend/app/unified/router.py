from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Response
from pydantic import BaseModel
from typing import Optional
import logging

from shared.services.azure_speech_service import speech_service, get_voice_for_language

router = APIRouter()
logger = logging.getLogger(__name__)


class TTSRequest(BaseModel):
    text: str
    language: str  # uz-UZ, ru-RU, en-US
    voice: Optional[str] = None
    gender: Optional[str] = "female"

@router.options("/tts")
async def tts_options():
    return Response(status_code=200)

@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """
    Unified Text to Speech endpoint.
    Supports: uz-UZ (MadinaNeural), ru-RU (SvetlanaNeural), en-US (AriaNeural)
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Matn kiritilmadi")
    
    voice_name = request.voice or get_voice_for_language(request.language, request.gender or "female")
    
    try:
        audio_data = await speech_service.generate_speech(
            text=request.text,
            voice_name=voice_name,
            language=request.language,
        )
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS xatoligi: {str(e)}")

@router.options("/stt")
async def stt_options():
    return Response(status_code=200)

@router.post("/stt")
async def speech_to_text(
    file: UploadFile = File(...),
    language: str = Form("uz-UZ")
):
    """
    Unified Speech to Text endpoint via Azure REST API.
    Supports: uz-UZ, ru-RU, en-US
    """
    audio_data = await file.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Audio fayl yuborilmadi")
    
    content_type = file.content_type or "audio/wav"
    audio_format_map = {
        "audio/wav": "audio/wav",
        "audio/wave": "audio/wav",
        "audio/x-wav": "audio/wav",
        "audio/webm": "audio/webm",
        "audio/ogg": "audio/ogg",
        "audio/mpeg": "audio/mpeg",
        "audio/mp3": "audio/mpeg",
    }
    audio_format = audio_format_map.get(content_type, "audio/wav")
    
    result = await speech_service.recognize_speech(
        audio_data=audio_data,
        language=language,
        audio_format=audio_format,
    )
    
    if result["status"] == "Success":
        return {
            "transcript": result["text"],
            "confidence": result["confidence"],
            "language": result["language"],
        }
    elif result["status"] == "NoMatch":
        return {
            "transcript": "",
            "confidence": 0,
            "error": "Ovoz aniqlanmadi",
        }
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "STT xatoligi"))
