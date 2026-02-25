"""
Uzbek Letters Learning Router
"""
from fastapi import APIRouter, HTTPException, Response, UploadFile, File, Query
from pydantic import BaseModel
from typing import Optional
import os
from urllib.parse import quote
from shared.services.azure_speech_service import speech_service, VOICE_MAP

router = APIRouter()

class TextToSpeechRequest(BaseModel):
    text: str
    language: str = "uz-UZ"
    gender: Optional[str] = "female"
    voice: Optional[str] = None

def normalize_uz(text):
    """Normalize Uzbek text for TTS"""
    if not text:
        return text
    
    # O' va G' harflarini to'g'rilash
    text = text.replace("o'", "oʻ").replace("O'", "Oʻ")
    text = text.replace("g'", "gʻ").replace("G'", "Gʻ")
    text = text.replace("'", "ʻ") # Boshqa apostroflarni ham
    
    return text.strip()

@router.options("/text-to-speech")
async def text_to_speech_options():
    """Handle CORS preflight for text-to-speech"""
    return Response(status_code=200)

@router.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """
    Convert text to speech using Azure TTS REST API.
    Supports: uz-UZ (MadinaNeural), ru-RU (SvetlanaNeural), en-US (AriaNeural)
    """
    if not request.text:
        raise HTTPException(status_code=400, detail="Matn kiritilmadi")
    
    # O'zbek tili uchun normalizatsiya
    text = request.text
    if request.language == "uz-UZ":
        text = normalize_uz(text)
    
    lang_code = "uz" if request.language.startswith("uz") else ("ru" if request.language.startswith("ru") else "en")
    voice_name = request.voice or VOICE_MAP.get(lang_code, {}).get(request.gender or "female", "uz-UZ-MadinaNeural")
    
    try:
        audio_data = await speech_service.generate_speech(
            text=text,
            voice_name=voice_name,
            language=request.language,
        )
        return Response(
            content=audio_data,
            media_type="audio/mpeg"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Nutq sintezida xatolik: {str(e)}"
        )

@router.get("/")
async def harf_home():
    """Harf moduli bosh sahifasi"""
    return {"module": "harf", "status": "active"}

@router.options("/speech-to-text")
async def speech_to_text_options():
    """Handle CORS preflight for speech-to-text"""
    return Response(status_code=200)

@router.post("/speech-to-text")
async def speech_to_text(
    file: UploadFile = File(...),
    language: str = Query("uz-UZ", description="Til kodi: uz-UZ, ru-RU, en-US"),
):
    """
    Convert speech to text using Azure STT REST API.
    Supports: uz-UZ, ru-RU, en-US
    """
    audio_data = await file.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Audio fayl yuborilmadi")
    
    # Content-Type ni aniqlash
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
            "language": result["language"],
            "error": "Ovoz aniqlanmadi. Qaytadan urinib ko'ring.",
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "STT xatoligi")
        )
