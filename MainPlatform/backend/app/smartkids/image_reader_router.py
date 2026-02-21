"""
Image Reader Router
Reads text from images using Azure OpenAI GPT Vision

FIX: Previously returned HTTP 200 with {"error": "..."} on failures.
     Frontend couldn't distinguish success from failure by status code.
     Now raises proper HTTPException with appropriate status codes:
     - 413: File too large
     - 500: AI processing failure
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import AsyncOpenAI
import base64
import os
from app.core.config import settings

router = APIRouter()

def get_client():
    """Create OpenAI async client from settings"""
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


def clean_text_for_tts(text):
    """Matnni TTS uchun tozalash — o' va g' belgilarni to'g'ri formatlash"""
    text = text.replace("o'", "oʻ").replace("O'", "Oʻ")
    text = text.replace("g'", "gʻ").replace("G'", "Gʻ")
    return text.strip()


@router.post("/image/read")
async def read_image(file: UploadFile = File(...)):
    """
    Read text from uploaded image using Azure OpenAI GPT Vision.
    
    Returns: {"text": "extracted text..."}
    Raises:
        413 - File exceeds 50MB limit
        500 - AI processing error
    """
    # Fayl hajmini tekshirish (50MB gacha)
    max_size = 50 * 1024 * 1024  # 50MB
    image_bytes = await file.read()
    
    if len(image_bytes) > max_size:
        # FIX: Was returning 200 — now properly raises 413
        raise HTTPException(
            status_code=413,
            detail=f"Rasm hajmi juda katta. Maksimal hajm: 50MB"
        )

    encoded = base64.b64encode(image_bytes).decode("utf-8")

    prompt = (
        "Rasm ichidagi matnni aniqlang va to'liq matn shaklida qaytaring. "
        "Matn o'zbek tilida bo'lsa, o'zbek alifbosidagi maxsus belgilarni saqlang: "
        "o' -> oʻ, g' -> gʻ, sh, ch. "
        "Agar matn bo'lmasa, 'Hech qanday matn topilmadi' deb yozing. "
        "Faqat matnni qaytaring, tahlil yozmang."
    )

    try:
        client = get_client()
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL or "gpt-4",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}"}}
                ]
            }],
            max_tokens=1200,
            temperature=0.3
        )
        text_output = response.choices[0].message.content.strip()
        
        # Matn uzunligini cheklash (250 so'z)
        words = text_output.split()
        if len(words) > 250:
            truncated_text = ' '.join(words[:250])
            warning_message = "\n\n⚠️ Matn juda katta bo'lganligi sababli faqat 250 ta so'z olindi."
            text_output = truncated_text + warning_message

        # Matnni tozalash va to'g'rilash
        cleaned_text = clean_text_for_tts(text_output)
        
        return {"text": cleaned_text}
        
    except Exception as e:
        # FIX: Was returning {"error": "..."} with HTTP 200
        # Frontend couldn't detect failure via status code
        # Now raises HTTP 500 so frontend catch blocks work correctly
        raise HTTPException(
            status_code=500,
            detail=f"AI OCR xatosi: {str(e)}"
        )
