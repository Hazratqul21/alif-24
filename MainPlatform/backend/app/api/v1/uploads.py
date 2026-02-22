from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request, Header
from shared.database import get_db
from shared.database.models import User
from app.middleware.auth import get_current_user
import shutil
import uuid
import os
import secrets
from pathlib import Path
from typing import Dict, Any

ADMIN_KEYS = {
    "hazratqul": "alif24_rahbariyat26!",
    "nurali": "alif24_rahbariyat26!",
    "pedagog": "alif24_rahbariyat26!",
}

async def verify_admin_upload(
    x_admin_role: str = Header(..., alias="X-Admin-Role"),
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
) -> Dict[str, Any]:
    role = x_admin_role.lower()
    if role not in ADMIN_KEYS or x_admin_key != ADMIN_KEYS.get(role):
        raise HTTPException(status_code=403, detail="Admin authentication failed")
    return {"role": role}

router = APIRouter()

# Max file size limits in bytes
TEACHER_PARENT_LIMIT = 10 * 1024 * 1024  # 10 MB

# Store uploads here
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/assignment-file")
async def upload_assignment_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a file for assignment or content. 
    Teachers and Parents have a 10MB limit. Admins and Superadmins have no limit.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    role = current_user.role
    
    # Pre-check headers if content-length is provided
    content_length = request.headers.get("content-length")
    role_str = role.value if hasattr(role, 'value') else str(role)
    if content_length and role_str in ["teacher", "parent"]:
        if int(content_length) > TEACHER_PARENT_LIMIT:
            raise HTTPException(status_code=413, detail=f"File too large. Max size is 10MB for {role}s")

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # Read chunks to enforce limit dynamically
    total_size = 0
    with open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # read in 1MB chunks
            total_size += len(chunk)
            if role_str in ["teacher", "parent"] and total_size > TEACHER_PARENT_LIMIT:
                f.close()
                os.remove(file_path)
                raise HTTPException(status_code=413, detail=f"File too large. Max size is 10MB for {role_str}s")
            f.write(chunk)

    # Note: Returning just the path for Nginx to serve
    # Typically, the frontend will use process.env.VITE_API_URL or similar 
    # but we can return relative path e.g., /api/uploads/safe_filename
    
    file_url = f"/api/uploads/{safe_filename}"
    
    return {
        "success": True,
        "url": file_url,
        "filename": file.filename,
        "saved_as": safe_filename,
        "size": total_size
    }


@router.post("/admin-file")
async def upload_admin_file(
    request: Request,
    file: UploadFile = File(...),
    admin: Dict = Depends(verify_admin_upload),
):
    """
    Upload a file from admin panel (no size limit).
    Uses X-Admin-Role / X-Admin-Key auth.
    """
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    total_size = 0
    with open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            total_size += len(chunk)
            f.write(chunk)

    file_url = f"/api/uploads/{safe_filename}"

    return {
        "success": True,
        "url": file_url,
        "filename": file.filename,
        "saved_as": safe_filename,
        "size": total_size
    }
