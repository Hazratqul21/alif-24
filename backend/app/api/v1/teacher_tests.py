from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.teacher_test import TeacherTest, TestType
from app.models.user import User
from app.services.test_builder_service import test_builder_service
import uuid
import json
from datetime import datetime

router = APIRouter()

# --- Builder Endpoints (Helpers) ---

@router.post("/parse-file", response_model=List[dict])
async def parse_test_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Upload a DOCX/PDF/Text file to parse questions.
    Returns a list of question objects (JSON).
    """
    if current_user.role not in ["teacher", "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return await test_builder_service.parse_file(file)

@router.post("/generate-ai", response_model=List[dict])
async def generate_ai_test_questions(
    prompt: str = Form(..., description="Mavzu yoki to'liq so'rov (masalan: 'Trigonometriyadan 10 ta test')"),
    count: int = Form(10),
    difficulty: str = Form("medium"),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Generate questions using AI.
    """
    if current_user.role not in ["teacher", "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return await test_builder_service.generate_ai_test(prompt, count, difficulty)

# --- CRUD Endpoints ---

@router.post("/", response_model=dict)
def create_test(
    title: str = Form(...),
    description: str = Form(None),
    test_type: str = Form("multiple_choice"),
    questions: str = Form(...), # JSON string
    total_points: int = Form(100),
    lesson_id: Optional[uuid.UUID] = Form(None),
    classroom_id: Optional[uuid.UUID] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Save a new test. 
    Accepts questions as a JSON string (since multipart/form-data doesn't support complex JSON lists easily alongside files, 
    though here we aren't uploading files, but keeping it consistent with builder flows if needed. 
    Actually, for pure JSON body, we should use Pydantic models, but `questions` structure is complex JSONB).
    """
    if current_user.role not in ["teacher", "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    try:
        questions_data = json.loads(questions)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON for questions")

    new_test = TeacherTest(
        title=title,
        description=description,
        teacher_id=current_user.id,
        test_type=test_type,
        questions=questions_data,
        total_points=total_points,
        lesson_id=lesson_id,
        classroom_id=classroom_id,
        is_active=True
    )
    
    db.add(new_test)
    db.commit()
    db.refresh(new_test)
    return {"id": str(new_test.id), "message": "Test created successfully"}

@router.get("/", response_model=List[dict])
def read_tests(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List tests created by the current teacher.
    """
    if current_user.role == "student":
         # Logic for students to see available tests could go here
         pass
         
    query = db.query(TeacherTest).filter(TeacherTest.teacher_id == current_user.id)
    return query.offset(skip).limit(limit).all()

@router.get("/{test_id}", response_model=dict)
def read_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    test = db.query(TeacherTest).filter(TeacherTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    # Permission check (Teacher can see own, Student can see active+assigned?)
    if current_user.role == "teacher" and test.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return {
        "id": str(test.id),
        "title": test.title,
        "description": test.description,
        "questions": test.questions,
        "total_points": test.total_points,
        "created_at": test.created_at
    }

@router.delete("/{test_id}")
def delete_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    test = db.query(TeacherTest).filter(TeacherTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test.teacher_id != current_user.id and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db.delete(test)
    db.commit()
    return {"message": "Test deleted"}
