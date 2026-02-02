"""
Unified Speech Router - Supports Uzbek, Russian, and English TTS/STT
"""
from fastapi import APIRouter, HTTPException, Response, UploadFile, File
from pydantic import BaseModel
import os
try:
    import azure.cognitiveservices.speech as speechsdk
except ImportError:
    speechsdk = None
from urllib.parse import quote
from typing import Optional

router = APIRouter()

class TextToSpeechRequest(BaseModel):
    text: str
    language: str = "uz-UZ"
    voice: Optional[str] = None

def normalize_uzbek(text):
    """Normalize Uzbek text for TTS"""
    if not text:
        return text
    
    return str(text).replace(r"[ʼʻ'`]", "'").replace(r"gʻ", "g'").replace(r"oʻ", "o'")

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

def build_ssml_if_needed(text, language):
    """Build SSML for special characters if needed"""
    lower = str(text).lower().strip()
    
    # Uzbek special characters
    if language.startswith('uz'):
        if lower == 'sh' or lower.startswith('sh harfi'):
            return f'''<speak version="1.0" xml:lang="uz-UZ"><voice name="uz-UZ-MadinaNeural"><phoneme alphabet="ipa" ph="ʃ">sh</phoneme>{"" if lower == "sh" else " harfi"}</voice></speak>'''
        elif lower == 'ch' or lower.startswith('ch harfi'):
            return f'''<speak version="1.0" xml:lang="uz-UZ"><voice name="uz-UZ-MadinaNeural"><phoneme alphabet="ipa" ph="tʃ">ch</phoneme>{"" if lower == "ch" else " harfi"}</voice></speak>'''
        elif lower in ['gʻ', "g'"] or lower.startswith('gʻ harfi') or lower.startswith("g' harfi"):
            return f'''<speak version="1.0" xml:lang="uz-UZ"><voice name="uz-UZ-MadinaNeural"><phoneme alphabet="ipa" ph="ɣ">gʻ</phoneme>{"" if lower in ["gʻ", "g'"] else " harfi"}</voice></speak>'''
        elif lower in ['oʻ', "o'"] or lower.startswith('oʻ harfi') or lower.startswith("o' harfi"):
            return f'''<speak version="1.0" xml:lang="uz-UZ"><voice name="uz-UZ-MadinaNeural"><phoneme alphabet="ipa" ph="oʊ">oʻ</phoneme>{"" if lower in ["oʻ", "o'"] else " harfi"}</voice></speak>'''
    
    return None

def get_voice_config(language, custom_voice=None):
    """Get voice configuration for language"""
    speech_key = os.getenv("AZURE_SPEECH_KEY") or os.getenv("AZURE_OPENAI_KEY")
    
    if not speech_key:
        return None, "Azure Speech key not configured"
    
    if speechsdk is None:
        return None, "Azure Speech SDK not installed"

    speech_config = speechsdk.SpeechConfig(
        subscription=speech_key,
        region=os.getenv("AZURE_SPEECH_REGION", "westeurope")
    )
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3
    )
    
    # Set voice based on language
    if custom_voice:
        speech_config.speech_synthesis_voice_name = custom_voice
    elif language.startswith('uz'):
        speech_config.speech_synthesis_voice_name = "uz-UZ-MadinaNeural"
    elif language.startswith('ru'):
        speech_config.speech_synthesis_voice_name = "ru-RU-DariyaNeural"
    elif language.startswith('en'):
        speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"
    else:
        speech_config.speech_synthesis_voice_name = "uz-UZ-MadinaNeural"  # default
    
    return speech_config, None

@router.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """Convert text to speech for multiple languages"""
    if not request.text:
        raise HTTPException(status_code=400, detail="Matn kiritilmagan.")
    
    # Normalize text based on language
    if request.language.startswith('uz'):
        norm_text = normalize_uzbek(request.text)
    elif request.language.startswith('ru'):
        norm_text = normalize_russian(request.text)
    else:
        norm_text = request.text
    
    # Get voice configuration
    speech_config, error = get_voice_config(request.language, request.voice)
    if error:
        raise HTTPException(status_code=500, detail=error)
    
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
    
    try:
        # Build SSML if needed
        ssml = build_ssml_if_needed(request.text, request.language)
        
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
                detail=f"Ovoz sintezida xatolik: {result.error_details}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ovoz sintezida xatolik: {str(e)}"
        )

@router.post("/uz/text-to-speech")
async def uzbek_text_to_speech(request: TextToSpeechRequest):
    """Uzbek text to speech endpoint"""
    request.language = "uz-UZ"
    return await text_to_speech(request)

@router.post("/r/text-to-speech")
async def russian_text_to_speech(request: TextToSpeechRequest):
    """Russian text to speech endpoint"""
    request.language = "ru-RU"
    return await text_to_speech(request)

@router.post("/en/text-to-speech")
async def english_text_to_speech(request: TextToSpeechRequest):
    """English text to speech endpoint"""
    request.language = "en-US"
    return await text_to_speech(request)

@router.get("/")
async def unified_home():
    """Unified speech module home"""
    return {
        "module": "unified_speech", 
        "status": "active",
        "endpoints": {
            "uzbek": "/uz/text-to-speech",
            "russian": "/r/text-to-speech", 
            "english": "/en/text-to-speech",
            "unified": "/text-to-speech"
        }
    }
