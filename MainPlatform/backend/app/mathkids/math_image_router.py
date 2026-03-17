"""
MathKids Image Reader - Matematik masalalarni rasmdan o'qish
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import AsyncAzureOpenAI
import base64
import logging
from app.core.config import settings

from sympy import sympify, latex as sympy_latex

logger = logging.getLogger(__name__)
router = APIRouter()

# Azure OpenAI configuration
AZURE_DEPLOYMENT_NAME = settings.AZURE_OPENAI_DEPLOYMENT_NAME or "gpt-5-chat"

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


def math_text_to_latex(text: str) -> str:
    """Try to parse raw OCR math text and return a LaTeX string.

    This is not guaranteed since OCR text can be noisy. We make a best-effort
    conversion using sympy and some simple normalizations.
    """
    if not text:
        return ''

    cleaned = (text
        .replace('−', '-')
        .replace('—', '-')
        .replace('×', '*')
        .replace('÷', '/')
        .replace('^', '**')
        .replace('“', '"').replace('”', '"')
        .replace('‘', "'").replace('’', "'")
    )

    # Often OCR returns spaces inside exponents like "3^( 8x - 1 )"; remove
    # spaces around ** to make parsing more reliable.
    cleaned = cleaned.replace('** ', '**').replace(' **', '**')

    try:
        expr = sympify(cleaned, evaluate=False)
        return sympy_latex(expr, mul_symbol='dot')
    except Exception:
        # Fallback: just escape backslashes/underscores for KaTeX display
        return cleaned


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

        # Azure OpenAI
        if not settings.AZURE_OPENAI_KEY or not settings.AZURE_OPENAI_ENDPOINT:
            raise HTTPException(status_code=500, detail="Azure OpenAI not configured")

        try:
            azure_client = AsyncAzureOpenAI(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION
            )
            response = await azure_client.chat.completions.create(
                model=AZURE_DEPLOYMENT_NAME,
                messages=vision_messages,
                max_tokens=1200,
                temperature=0.3
            )
            text_output = response.choices[0].message.content.strip()
            logger.info("Azure math OCR success")
        except Exception as azure_err:
            logger.warning(f"Azure math OCR failed: {azure_err}")
            raise HTTPException(status_code=500, detail=f"Azure math OCR failed: {azure_err}")
        
        # OCR natijasini matematik belgilarga o'zgartirish
        math_text = convert_ocr_to_math(text_output)
        
        # Matnni TTS uchun tozalash (faqat ovoz uchun)
        cleaned_text = clean_text_for_tts(text_output)

        # LaTeX ko'rinishini ham qaytara olsak foydali
        latex_text = math_text and math_text_to_latex(math_text) or ""
        
        return {
            "success": True, 
            "text": math_text,  # Matematik belgilar bilan
            "latex": latex_text,
            "speech_text": cleaned_text  # TTS uchun
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading math image: {str(e)}")
