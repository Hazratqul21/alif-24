from fastapi import APIRouter, UploadFile, File, HTTPException
import io
try:
    import docx
except ImportError:
    docx = None
import pypdf
import chardet
from shared.database.id_generator import generate_8_digit_id

router = APIRouter()

file_storage = {}  # In-memory storage for file texts

def read_docx(content):
    if docx is None:
        raise HTTPException(status_code=501, detail="DOCX processing is temporarily disabled for optimization.")
    file_like = io.BytesIO(content)
    doc = docx.Document(file_like)
    return "\n".join(p.text for p in doc.paragraphs)

def read_pdf(content):
    reader = pypdf.PdfReader(io.BytesIO(content))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def read_txt(content):
    enc = chardet.detect(content).get("encoding") or "utf-8"
    return content.decode(enc, errors="ignore")

@router.post("/file/read")
async def read_file(file: UploadFile = File(...)):
    # Fayl hajmini tekshirish (50MB gacha)
    max_size = 50 * 1024 * 1024  # 50MB
    content = await file.read()
    
    if len(content) > max_size:
        raise HTTPException(
            status_code=413, 
            detail=f"Fayl hajmi juda katta. Maksimal hajm: 50MB"
        )
    
    filename = file.filename.lower()

    if filename.endswith(".docx"):
        text = read_docx(content)
    elif filename.endswith(".pdf"):
        text = read_pdf(content)
    elif filename.endswith(".txt"):
        text = read_txt(content)
    else:
        return {"error": "Fayl turi qo'llab-quvvatlanmaydi"}

    if not text.strip():
        return {"error": "Faylda matn topilmadi (PDF rasm bo'lishi mumkin)"}

    # Matn uzunligini cheklash (250 so'z)
    words = text.split()
    if len(words) > 250:
        truncated_text = ' '.join(words[:250])
        warning_message = "\n\n⚠️ Matn juda katta bo'lganligi sababli faqat 250 ta so'z olindi."
        text = truncated_text + warning_message

    # Generate unique ID and store the text
    file_id = generate_8_digit_id()
    file_storage[file_id] = text

    return {"id": file_id, "text": text}

@router.get("/file/read/{file_id}")
async def get_file(file_id: str):
    if file_id in file_storage:
        return {"text": file_storage[file_id]}
    raise HTTPException(status_code=404, detail="File not found")
