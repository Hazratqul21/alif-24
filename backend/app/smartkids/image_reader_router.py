from fastapi import APIRouter, UploadFile, File
from openai import AzureOpenAI
import base64
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

client = AzureOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION")
)

model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4")

def clean_text_for_tts(text):
    """Matnni TTS uchun tozalash"""
    text = text.replace("o'", "oʻ").replace("O'", "Oʻ")
    text = text.replace("g'", "gʻ").replace("G'", "Gʻ")
    return text.strip()

@router.post("/image/read")
async def read_image(file: UploadFile = File(...)):
    image_bytes = await file.read()
    encoded = base64.b64encode(image_bytes).decode("utf-8")

    prompt = (
        "Rasm ichidagi matnni aniqlang va to'liq matn shaklida qaytaring. "
        "Matn o'zbek tilida bo'lsa, o'zbek alifbosidagi maxsus belgilarni saqlang: "
        "o' -> oʻ, g' -> gʻ, sh, ch. "
        "Agar matn bo'lmasa, 'Hech qanday matn topilmadi' deb yozing. "
        "Faqat matnni qaytaring, tahlil yozmang."
    )

    try:
        response = client.chat.completions.create(
            model=model,
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
        
        # Matnni tozalash va to'g'rilash
        cleaned_text = clean_text_for_tts(text_output)
        
        return {"text": cleaned_text}
        
    except Exception as e:
        return {"error": f"AI OCR xatosi: {str(e)}"}
