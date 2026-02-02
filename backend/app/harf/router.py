from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
try:
    import azure.cognitiveservices.speech as speechsdk
except ImportError:
    speechsdk = None
from app.core.config import settings
import os

router = APIRouter()

class TextToSpeechRequest(BaseModel):
    text: str

def normalize_uz(text: str) -> str:
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

def build_ssml_if_needed(text: str) -> str:
    """Build SSML for special cases"""
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

@router.options("/text-to-speech")
async def text_to_speech_options():
    """Handle CORS preflight for text-to-speech"""
    return Response(status_code=200)

@router.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """Convert text to speech"""
    if not request.text:
        raise HTTPException(status_code=400, detail="Matn kiritilmagan.")
    
    norm_text = normalize_uz(request.text)
    
    # Configure Azure Speech
    speech_key = settings.AZURE_SPEECH_KEY or settings.AZURE_OPENAI_KEY or os.getenv("AZURE_SPEECH_KEY") or os.getenv("AZURE_OPENAI_KEY")
    
    if not speech_key:
        raise HTTPException(status_code=500, detail="Azure Speech key not configured")
    
    speech_config = speechsdk.SpeechConfig(
        subscription=speech_key,
        region=settings.AZURE_SPEECH_REGION
    )
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3
    )
    speech_config.speech_synthesis_voice_name = "uz-UZ-MadinaNeural"
    
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
    
    ssml = build_ssml_if_needed(norm_text)
    
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

@router.post("/speech-to-text")
async def speech_to_text(file: UploadFile = File(...)):
    """Convert speech to text"""
    audio_data = await file.read()
    
    if not audio_data:
        raise HTTPException(status_code=400, detail="Audio ma'lumotlar yuborilmagan.")
    
    # Configure Azure Speech
    speech_key = settings.AZURE_SPEECH_KEY or settings.AZURE_OPENAI_KEY
    if not speech_key:
        raise HTTPException(status_code=500, detail="Azure Speech key not configured")
    
    speech_config = speechsdk.SpeechConfig(
        subscription=speech_key,
        region=settings.AZURE_SPEECH_REGION
    )
    speech_config.speech_recognition_language = "uz-UZ"
    
    # Create audio stream
    audio_stream = speechsdk.audio.PushAudioInputStream()
    audio_stream.write(audio_data)
    audio_stream.close()
    
    audio_config = speechsdk.audio.AudioConfig(stream=audio_stream)
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config
    )
    
    result = recognizer.recognize_once_async().get()
    
    if result.reason == speechsdk.ResultReason.RecognizedSpeech:
        return {"transcript": result.text}
    elif result.reason == speechsdk.ResultReason.NoMatch:
        raise HTTPException(
            status_code=500,
            detail="Hech qanday nutq aniqlanmadi."
        )
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Ovozni tanishda xatolik: {result.error_details}"
        )

