"""
Russian Letters Learning Router
"""
from fastapi import APIRouter, HTTPException, Response, UploadFile, File, Query
from pydantic import BaseModel
from typing import Optional

from shared.services.azure_speech_service import speech_service, get_voice_for_language

router = APIRouter()


class TextToSpeechRequest(BaseModel):
    text: str
    language: str = "ru-RU"
    gender: Optional[str] = "female"
    voice: Optional[str] = None

@router.options("/text-to-speech")
async def text_to_speech_options():
    """Handle CORS preflight for text-to-speech"""
    return Response(status_code=200)

@router.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """
    Convert Russian text to speech using Azure TTS.
    Default voice: ru-RU-SvetlanaNeural
    """
    if not request.text:
        raise HTTPException(status_code=400, detail="Текст не введен.")
    
    voice_name = request.voice or get_voice_for_language(request.language, request.gender or "female")
    
    try:
        audio_data = await speech_service.generate_speech(
            text=request.text,
            voice_name=voice_name,
            language=request.language,
        )
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS ошибка: {str(e)}")

@router.get("/")
async def rharf_home():
    """Russian harf module home"""
    return {"module": "rharf", "status": "active"}

@router.options("/speech-to-text")
async def speech_to_text_options():
    """Handle CORS preflight for speech-to-text"""
    return Response(status_code=200)

@router.post("/speech-to-text")
async def speech_to_text(
    file: UploadFile = File(...),
    language: str = Query("ru-RU", description="Til kodi: ru-RU, uz-UZ, en-US"),
):
    """
    Convert Russian speech to text using Azure STT REST API.
    """
    audio_data = await file.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Аудио данные не отправлены.")
    
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
            "error": "Голос не распознан. Попробуйте еще раз.",
        }
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Ошибка STT"))
