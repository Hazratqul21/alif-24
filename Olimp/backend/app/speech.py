"""
Speech API — TTS endpoint
Olimp Platform uchun Azure TTS
"""
from fastapi import APIRouter, Query
from fastapi.responses import Response
from shared.services.azure_speech_service import speech_service

router = APIRouter()


@router.get("/tts")
async def text_to_speech(
    text: str = Query(..., description="Ovozga aylantiriladigan matn", max_length=1000),
    language: str = Query("uz", description="Til: uz, ru, en"),
    gender: str = Query("female", description="Ovoz: female, male"),
):
    """Matnni Azure TTS orqali ovozga aylantirish"""
    audio_content = await speech_service.text_to_speech(text=text, language=language, gender=gender)
    return Response(
        content=audio_content,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=tts.mp3"},
    )
