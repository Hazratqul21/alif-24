"""
Unified Letters Learning Router - Supports Uzbek and Russian
"""
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
import os
try:
    import azure.cognitiveservices.speech as speechsdk
except ImportError:
    speechsdk = None
from app.core.config import settings

router = APIRouter()


class TextToSpeechRequest(BaseModel):
    text: str
    language: str = "uz-UZ"  # uz-UZ or ru-RU


def normalize_uzbek(text: str) -> str:
    """Normalize Uzbek text"""
    if not text:
        return text
    return (text
        .replace("ʼ", "'")
        .replace("ʻ", "'")
        .replace("`", "'")
        .replace("O'", "Oʻ")
        .replace("G'", "Gʻ")
        .replace("o'", "oʻ")
        .replace("g'", "gʻ"))


def normalize_russian(text: str) -> str:
    """Normalize Russian text"""
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


def build_uzbek_ssml(text: str) -> str:
    """Build SSML for special Uzbek letters"""
    lower = text.lower().strip()
    
    if lower == "sh" or lower.startswith("sh harfi"):
        return f'''<speak version="1.0" xml:lang="uz-UZ">
                    <voice name="uz-UZ-MadinaNeural">
                        <phoneme alphabet="ipa" ph="ʃ">sh</phoneme>
                        {" harfi" if lower != "sh" else ""}
                    </voice>
                </speak>'''
    
    if lower == "ch" or lower.startswith("ch harfi"):
        return f'''<speak version="1.0" xml:lang="uz-UZ">
                    <voice name="uz-UZ-MadinaNeural">
                        <phoneme alphabet="ipa" ph="tʃ">ch</phoneme>
                        {" harfi" if lower != "ch" else ""}
                    </voice>
                </speak>'''
    
    if lower in ["gʻ", "g'"] or lower.startswith("gʻ harfi") or lower.startswith("g' harfi"):
        return f'''<speak version="1.0" xml:lang="uz-UZ">
                    <voice name="uz-UZ-MadinaNeural">
                        <phoneme alphabet="ipa" ph="ɣ">gʻ</phoneme>
                        {" harfi" if "harfi" in lower else ""}
                    </voice>
                </speak>'''
    
    if lower in ["oʻ", "o'"] or lower.startswith("oʻ harfi") or lower.startswith("o' harfi"):
        return f'''<speak version="1.0" xml:lang="uz-UZ">
                    <voice name="uz-UZ-MadinaNeural">
                        <phoneme alphabet="ipa" ph="oʊ">oʻ</phoneme>
                        {" harfi" if "harfi" in lower else ""}
                    </voice>
                </speak>'''
    
    return None


def get_voice_name(language: str) -> str:
    """Get appropriate voice name for language"""
    voices = {
        "uz-UZ": "uz-UZ-MadinaNeural",
        "ru-RU": "ru-RU-DariyaNeural",
    }
    return voices.get(language, "uz-UZ-MadinaNeural")


@router.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """
    Convert text to speech for any supported language
    Supported languages: uz-UZ (Uzbek), ru-RU (Russian)
    """
    if not request.text:
        error_messages = {
            "uz-UZ": "Matn kiritilmagan.",
            "ru-RU": "Текст не введен."
        }
        raise HTTPException(
            status_code=400, 
            detail=error_messages.get(request.language, "Text not provided.")
        )
    
    # Normalize text based on language
    if request.language == "uz-UZ":
        norm_text = normalize_uzbek(request.text)
    elif request.language == "ru-RU":
        norm_text = normalize_russian(request.text)
    else:
        norm_text = request.text
    
    # Configure Azure Speech
    speech_key = (
        settings.AZURE_SPEECH_KEY or 
        settings.AZURE_OPENAI_KEY or 
        os.getenv("AZURE_SPEECH_KEY") or 
        os.getenv("AZURE_OPENAI_KEY")
    )
    
    if not speech_key:
        raise HTTPException(
            status_code=500, 
            detail="Azure Speech key not configured"
        )
    
    if speechsdk is None:
        raise HTTPException(
            status_code=503,
            detail="Speech synthesis is currently unavailable (Dependency missing)."
        )

    speech_config = speechsdk.SpeechConfig(
        subscription=speech_key,
        region=settings.AZURE_SPEECH_REGION
    )
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3
    )
    speech_config.speech_synthesis_voice_name = get_voice_name(request.language)
    
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
    
    # Check if we need SSML (only for Uzbek special characters)
    ssml = None
    if request.language == "uz-UZ":
        ssml = build_uzbek_ssml(norm_text)
    
    try:
        if ssml:
            result = synthesizer.speak_ssml_async(ssml).get()
        else:
            result = synthesizer.speak_text_async(norm_text).get()
        
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            return Response(
                content=bytes(result.audio_data),
                media_type="audio/mpeg"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Speech synthesis error: {result.error_details if hasattr(result, 'error_details') else 'Unknown error'}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during speech synthesis: {str(e)}"
        )


@router.get("/")
async def letters_home():
    """Letters module home"""
    return {
        "module": "letters",
        "status": "active",
        "supported_languages": ["uz-UZ", "ru-RU"],
        "endpoints": [
            {"path": "/text-to-speech", "method": "POST", "description": "Convert text to speech"}
        ]
    }
