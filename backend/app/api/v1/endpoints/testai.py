from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import json
from pydantic import BaseModel

from app.core.database import get_db
from app.models.teacher_test import TeacherTest, TestType, TestResult as DBTestResult
from app.models.user import User
from app.middleware.deps import get_current_user
from app.services.testai.parsers import parse_tests, parse_pdf, parse_word, parse_image_tests
from app.services.testai.ai_generator import AITestGenerator

router = APIRouter()

# --- Pydantic Schemas ---

class TextParseRequest(BaseModel):
    """Request body for text parsing"""
    text: str

class QuestionSchema(BaseModel):
    id: Optional[str] = None
    question: str
    options: List[str]
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: int = 10

class TestCreateSchema(BaseModel):
    title: str
    description: Optional[str] = None
    questions: List[QuestionSchema]
    category: str = "general"
    tags: List[str] = []
    test_type: str = "multiple_choice"

class TestUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    questions: Optional[List[QuestionSchema]] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None

class TestResponseSchema(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    questions: List[Any]
    category: Optional[str]
    tags: List[str]
    created_at: datetime
    teacher_id: uuid.UUID

    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/health")
async def health_check():
    return {"status": "healthy"}

@router.post("/parse/text")
async def parse_text(
    request: TextParseRequest,
    current_user: User = Depends(get_current_user)
):
    """Parse text from textarea to generate questions"""
    try:
        tests = parse_tests(request.text)
        return {"status": "success", "tests": tests, "count": len(tests)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parsing error: {str(e)}")

@router.post("/parse/file")
async def parse_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Parse file (PDF, DOCX, IMG) to generate questions"""
    try:
        content = await file.read()
        filename = file.filename.lower()
        tests = []

        if filename.endswith('.pdf'):
            tests = parse_pdf(content)
        elif filename.endswith(('.docx', '.doc')):
            tests = parse_word(content)
        elif filename.endswith(('.jpg', '.jpeg', '.png')):
            tests = parse_image_tests(content)
        elif filename.endswith('.txt'):
             tests = parse_tests(content.decode('utf-8', errors='ignore'))
        
        return {"status": "success", "tests": tests, "count": len(tests)}
    except Exception as e:
        print(f"Error parsing file: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/generate/ai")
async def generate_ai_test(
    topic: str = Form(...),
    count: int = Form(5),
    api_key: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """Generate tests using AI"""
    # Use provided key or fallback to env var logic inside logic
    # Ideally should be securely stored in backend settings
    import os
    actual_api_key = api_key or os.getenv("OPENAI_API_KEY")
    
    if not actual_api_key:
         raise HTTPException(status_code=400, detail="API Key required (not found in env)")
    
    try:
        generator = AITestGenerator(api_key=actual_api_key) 
        questions = generator.generate_questions(topic, count)
        return {"status": "success", "tests": questions, "count": len(questions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

@router.post("/", response_model=Dict[str, Any])
async def create_test(
    test_data: TestCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new test"""
    return await save_test_logic(test_data, db, current_user)

@router.post("/save", response_model=Dict[str, Any])
async def save_test_endpoint(
    test_data: TestCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save generated test (Alias for Create)"""
    return await save_test_logic(test_data, db, current_user)

async def save_test_logic(test_data: TestCreateSchema, db: Session, current_user: User):
    try:
        # Format questions for JSON storage
        formatted_questions = []
        for idx, q in enumerate(test_data.questions):
            q_dict = q.dict()
            q_dict["id"] = idx + 1
            if not q_dict.get("id"):
                q_dict["id"] = idx + 1
            formatted_questions.append(q_dict)

        new_test = TeacherTest(
            title=test_data.title,
            description=test_data.description,
            teacher_id=current_user.id,
            test_type=TestType.MULTIPLE_CHOICE, # Can be dynamic
            questions=formatted_questions,
            category=test_data.category,
            tags=test_data.tags,
            is_active=True,
            total_points=sum(q.points for q in test_data.questions)
        )
        
        db.add(new_test)
        db.commit()
        db.refresh(new_test)
        
        # Return serializable dict instead of SQLAlchemy model
        return {
            "status": "success", 
            "test_id": str(new_test.id), 
            "test": {
                "id": str(new_test.id),
                "title": new_test.title,
                "description": new_test.description,
                "questions": new_test.questions,
                "category": new_test.category,
                "tags": new_test.tags,
                "total_points": new_test.total_points,
                "created_at": str(new_test.created_at) if new_test.created_at else None
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_tests(
    skip: int = 0, 
    limit: int = 50, 
    category: Optional[str] = None, 
    tag: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tests created by current teacher"""
    try:
        query = db.query(TeacherTest).filter(TeacherTest.teacher_id == current_user.id)
        
        if category:
            query = query.filter(TeacherTest.category == category)
        # Tag filtering in JSON might require specific dialect function or python filter
        # For simplicity/safety across DBs, we filter in python if complex
        # But postgres supports JSONB containment. For simple list in JSON:
        
        tests = query.offset(skip).limit(limit).all()
        
        if tag:
             tests = [t for t in tests if tag in getattr(t, 'tags', [])]

        return {
            "status": "success", 
            "tests": tests,
            "count": len(tests)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tests: {str(e)}")

@router.get("/{test_id}")
async def get_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific test"""
    test = db.query(TeacherTest).filter(TeacherTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return {"status": "success", "test": test}

@router.put("/{test_id}")
async def update_test(
    test_id: uuid.UUID,
    test_data: TestUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update test"""
    test = db.query(TeacherTest).filter(TeacherTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test.teacher_id != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized to update this test")

    try:
        if test_data.title:
            test.title = test_data.title
        if test_data.description:
            test.description = test_data.description
        if test_data.questions:
             # Reformat questions
            formatted_questions = []
            for idx, q in enumerate(test_data.questions):
                q_dict = q.dict()
                q_dict["id"] = idx + 1
                formatted_questions.append(q_dict)
            test.questions = formatted_questions
            test.total_points = sum(q.points for q in test_data.questions)
            
        if test_data.category:
            test.category = test_data.category
        if test_data.tags is not None:
            test.tags = test_data.tags
        if test_data.is_active is not None:
            test.is_active = test_data.is_active

        db.commit()
        db.refresh(test)
        return {"status": "success", "test": test}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{test_id}")
async def delete_test(
    test_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete test"""
    test = db.query(TeacherTest).filter(TeacherTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test.teacher_id != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized to delete this test")

    try:
        db.delete(test)
        db.commit()
        return {"status": "success", "message": "Test deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
