from fastapi import APIRouter, UploadFile, File, HTTPException
import io
import docx
import pypdf
import chardet
import uuid

router = APIRouter()

file_storage = {}  # In-memory storage for file texts

def read_docx(content):
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
    content = await file.read()
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

    # Generate unique ID and store the text
    file_id = str(uuid.uuid4())
    file_storage[file_id] = text

    return {"id": file_id, "text": text}

@router.get("/file/read/{file_id}")
async def get_file(file_id: str):
    if file_id in file_storage:
        return {"text": file_storage[file_id]}
    raise HTTPException(status_code=404, detail="File not found")
