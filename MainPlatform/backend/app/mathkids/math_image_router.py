"""
MathKids Image Reader - Matematik masalalarni rasmdan o'qish
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import AsyncOpenAI, AsyncAzureOpenAI
import base64
import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# OpenAI configuration
OPENAI_MODEL = settings.OPENAI_MODEL or "gpt-4o-mini"

def convert_ocr_to_math(text: str) -> str:
    """OCR natijasini matematik belgilarga o'zgartirish"""
    replacements = {
        " teng ": " = ",
        "teng": "=",
        " qo'shish ": " + ",
        "qo'shish": "+",
        " ayirish ": " - ",
        "ayirish": "-",
        " ko'paytirish ": " × ",
        "ko'paytirish": "×",
        " bo'lish ": " ÷ ",
        "bo'lish": "÷",
        "·": "×",  # Nuqta belgisini ko'paytirish belgisiga
    }
    
    result = text
    for old, new in replacements.items():
        result = result.replace(old, new)
    
    return result


def clean_text_for_tts(text: str) -> str:
    """Matematik belgilarni TTS uchun o'qiladigan ko'rinishga o'zgartirish"""
    replacements = {
        "+": " qo'shish ",
        "-": " ayirish ",
        "×": " ko'paytirish ",
        "*": " ko'paytirish ",
        "÷": " bo'lish ",
        "/": " bo'lish ",
        "=": " teng ",
        "²": " kvadrat ",
        "³": " kub ",
        "√": " ildiz ",
        "%": " foiz ",
        "π": " pi ",
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    return text


@router.post("/image/read")
async def read_math_image(image: UploadFile = File(...)):
    """
    Rasmdan matematik masalani o'qish
    """
    try:
        # Rasmni base64 ga encode qilish
        image_bytes = await image.read()
        encoded = base64.b64encode(image_bytes).decode("utf-8")
        
        prompt = (
            "Rasmda matematik masala yoki ifoda bor. "
            "Matematik ifodalarni, tenglamalarni, formulalarni va masala matnini aniq va to'liq o'qing. "
            "Matematik belgilarni to'g'ri qaytaring: +, -, ×, ÷, =, ², ³, √, ∫, π, va boshqalar. "
            "Agar rasm sifatsiz bo'lsa yoki matn yo'q bo'lsa, 'Matematik masala topilmadi' deb yozing. "
            "Faqat masala matnini qaytaring, boshqa izoh yozmang."
        )
        
        vision_messages = [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}"}}
            ]
        }]
        
        text_output = None

        # 1) OpenAI primary
        try:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=vision_messages,
                max_tokens=1200,
                temperature=0.3
            )
            text_output = response.choices[0].message.content.strip()
            logger.info("OpenAI math OCR success")
        except Exception as openai_err:
            logger.warning(f"OpenAI math OCR failed: {openai_err}")

        # 2) Azure fallback (only if configured)
        if not text_output and settings.AZURE_OPENAI_KEY and settings.AZURE_OPENAI_ENDPOINT:
            try:
                azure_client = AsyncAzureOpenAI(
                    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                    api_key=settings.AZURE_OPENAI_KEY,
                    api_version=settings.AZURE_OPENAI_API_VERSION
                )
                response = await azure_client.chat.completions.create(
                    model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                    messages=vision_messages,
                    max_tokens=1200,
                    temperature=0.3
                )
                text_output = response.choices[0].message.content.strip()
                logger.info("Azure math OCR fallback success")
            except Exception as azure_err:
                logger.warning(f"Azure math OCR failed: {azure_err}")
        
        # OCR natijasini matematik belgilarga o'zgartirish
        math_text = convert_ocr_to_math(text_output)
        
        # Matnni TTS uchun tozalash (faqat ovoz uchun)
        cleaned_text = clean_text_for_tts(text_output)
        
        return {
            "success": True, 
            "text": math_text,  # Matematik belgilar bilan
            "speech_text": cleaned_text  # TTS uchun
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading math image: {str(e)}")
