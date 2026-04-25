import re
import io
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from shared.database import get_db
from shared.database.models import User, UserRole, SavedTest
from shared.database.models.saved_test import SavedTestStatus
from shared.database.models.classroom import Classroom, ClassroomStudent, ClassroomStudentStatus
from shared.database.models.assignment import (
    Assignment, AssignmentTarget, AssignmentSubmission,
    AssignmentType, AssignmentTargetType, SubmissionStatus, AssignmentCreatorRole,
)
from shared.database.models.in_app_notification import InAppNotifType
from app.middleware.auth import get_current_user
from app.api.v1.assignments import create_notification, notify_telegram

logger = logging.getLogger(__name__)
router = APIRouter()

# ============================================================
# SCHEMAS
# ============================================================

class SaveTestRequest(BaseModel):
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    questions: List[dict]
    difficulty: str = "medium"
    language: str = "uz"

class TestConfig(BaseModel):
    question_count: Optional[int] = None
    question_selection: str = "all"  # all | first_n | random
    time_type: str = "none"  # none | total | per_question
    total_time_minutes: Optional[int] = None
    per_question_seconds: Optional[int] = None
    shuffle_questions: bool = False

class AssignTestRequest(BaseModel):
    test_id: str
    class_name: Optional[str] = None
    student_ids: Optional[List[str]] = None
    due_date: Optional[datetime] = None
    test_config: Optional[TestConfig] = None

# ============================================================
# PARSING LOGIC (Regex based)
# ============================================================

def _parse_questions(text: str) -> list:
    """
    Parses questions from text. Supports:
    1. Question text
    A) Option 1
    B) Option 2
    ...
    Javob: A
    """
    # Remove emoji variation selectors
    text = re.sub(r'[\uFE00-\uFE0F\u20E3]', '', text)
    questions = []
    
    # Split by numbers followed by . or )
    blocks = re.split(r'\n\s*(?=\d+\s*[\.\)])\s*', '\n' + text.strip())
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
            
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines:
            continue
            
        # Question line
        q_line = re.sub(r'^\d+\s*[\.\)]\s*', '', lines[0]).strip()
        if not q_line:
            continue
            
        options = []
        correct_idx = 0
        correct_letter = None
        
        for line in lines[1:]:
            # Check for "Javob: A" or similar
            m_ans = re.search(r'(?:javob|answer|to.g.ri|correct)\s*[:\-]\s*([A-Da-d])', line, re.I)
            if m_ans:
                correct_letter = m_ans.group(1).upper()
                continue
                
            # Check for options A) or A.
            m_opt = re.match(r'^([A-Da-d])[\.)\s]\s*(.+)', line)
            if m_opt:
                options.append(m_opt.group(2).strip())
        
        if len(options) < 2:
            continue
            
        if correct_letter:
            correct_idx = ord(correct_letter) - ord('A')
            if correct_idx >= len(options):
                correct_idx = 0
        
        # Ensure 4 options
        while len(options) < 4:
            options.append("")
            
        questions.append({
            "question": q_line,
            "options": options[:4],
            "correct": correct_idx,
            "correct_answer": chr(ord('a') + correct_idx) # For common use
        })
        
    return questions

# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/testai/parse/text")
async def parse_text(data: dict, current_user: User = Depends(get_current_user)):
    text = data.get("text", "")
    if not text:
        raise HTTPException(400, "Matn kiritilmadi")
    
    questions = _parse_questions(text)
    return {"success": True, "tests": questions}

@router.post("/testai/parse/file")
async def parse_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    content = await file.read()
    filename = file.filename.lower()
    text = ""
    
    try:
        if filename.endswith(".pdf"):
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        elif filename.endswith(".docx"):
            from docx import Document
            doc = Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs)
        elif filename.endswith(".txt"):
            text = content.decode("utf-8")
        else:
            raise HTTPException(400, "Qo'llab-quvvatlanmaydigan fayl formati")
    except Exception as e:
        logger.error(f"File parsing error: {e}")
        raise HTTPException(500, f"Faylni o'qishda xatolik: {str(e)}")
        
    questions = _parse_questions(text)
    return {"success": True, "tests": questions}

@router.post("/testai/save")
async def save_test(data: SaveTestRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    test = SavedTest(
        creator_id=current_user.id,
        title=data.title,
        description=data.description,
        subject=data.subject,
        topic=data.topic,
        difficulty=data.difficulty,
        language=data.language,
        questions=data.questions,
        questions_count=len(data.questions),
        status=SavedTestStatus.published.value, # Publish immediately for teachers
        source_platform="admin_teacher_panel"
    )
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return {"success": True, "data": test}

@router.get("/teacher-tests")
@router.get("/testai/my-tests")
async def get_my_tests(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(SavedTest)
        .where(SavedTest.creator_id == current_user.id)
        .order_by(SavedTest.created_at.desc())
    )
    tests = res.scalars().all()
    return {"success": True, "tests": tests}

@router.delete("/testai/test/{test_id}")
@router.delete("/testai/tests/{test_id}")
async def delete_test(test_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(SavedTest).where(SavedTest.id == test_id, SavedTest.creator_id == current_user.id))
    await db.commit()
    return {"success": True}

@router.post("/testai/assign")
async def assign_test(data: AssignTestRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Connects a SavedTest to a Classroom or Students by creating an Assignment.
    """
    # 1. Fetch the test details
    res = await db.execute(select(SavedTest).where(SavedTest.id == data.test_id))
    test = res.scalars().first()
    if not test:
        raise HTTPException(404, "Test topilmadi")
        
    # 2. Prepare assignment content (JSON string for automated grading)
    # The submit-test-assignment endpoint expects content to have a 'questions' key
    content_data = {"questions": test.questions}
    
    # Apply test_config if provided
    if data.test_config:
        tc = data.test_config
        content_data["test_config"] = tc.model_dump()
        
        # Select questions based on config
        questions = list(test.questions)
        q_count = tc.question_count or len(questions)
        
        if tc.question_selection == "random" and q_count < len(questions):
            import random
            questions = random.sample(questions, q_count)
        elif tc.question_selection == "first_n" and q_count < len(questions):
            questions = questions[:q_count]
        
        content_data["questions"] = questions
    
    assignment_content = json.dumps(content_data)
    
    # 3. Create the assignment
    teacher_name = f"{current_user.first_name} {current_user.last_name}".strip()
    
    assignment = Assignment(
        created_by=current_user.id,
        creator_role=AssignmentCreatorRole.teacher,
        title=f"Test: {test.title}",
        description=test.description,
        assignment_type=AssignmentType.test,
        content=assignment_content,
        reference_id=test.id,
        reference_type="saved_test",
        max_score=100,
        due_date=data.due_date,
        is_published=True
    )
    db.add(assignment)
    await db.flush()
    
    # 4. Handle targets
    notified_students = set()
    
    if data.class_name:
        from shared.database.models import TeacherProfile
        tp_res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
        tp = tp_res.scalars().first()
        if tp:
            cls_res = await db.execute(
                select(Classroom).where(Classroom.name == data.class_name, Classroom.teacher_id == tp.id)
            )
            classroom = cls_res.scalars().first()
            if classroom:
                db.add(AssignmentTarget(
                    assignment_id=assignment.id,
                    target_type=AssignmentTargetType.classroom,
                    target_id=classroom.id
                ))
                mem_res = await db.execute(
                    select(ClassroomStudent.student_user_id).where(
                        ClassroomStudent.classroom_id == classroom.id,
                        ClassroomStudent.status == ClassroomStudentStatus.active
                    )
                )
                for row in mem_res.fetchall():
                    notified_students.add(row[0])
                    
    if data.student_ids:
        for sid in data.student_ids:
            db.add(AssignmentTarget(
                assignment_id=assignment.id,
                target_type=AssignmentTargetType.student,
                target_id=sid
            ))
            notified_students.add(sid)
            
    due_text = data.due_date.strftime("%d.%m.%Y %H:%M") if data.due_date else "Belgilanmagan"
    for student_id in notified_students:
        db.add(AssignmentSubmission(
            assignment_id=assignment.id,
            student_user_id=student_id,
            status=SubmissionStatus.pending
        ))
        await create_notification(
            db, student_id,
            f"📝 Yangi test: {test.title}",
            f"{teacher_name} sizga yangi test topshirig'ini yubordi.\nMuddati: {due_text}",
            InAppNotifType.assignment_new,
            "assignment", assignment.id, current_user.id
        )
        
    await db.commit()
    
    for student_id in notified_students:
        tg_text = (
            f"📝 *Yangi test topshirig'i!*\n\n"
            f"*{test.title}*\n"
            f"O'qituvchi: {teacher_name}\n"
            f"Muddati: {due_text}\n\n"
            f"Platformaga kiring va testni yeching."
        )
        await notify_telegram(db, student_id, tg_text)
        
    return {"success": True, "assignment_id": assignment.id, "student_count": len(notified_students)}


# ============================================================
# ADVANCED ASSIGN (with test_config)
# ============================================================

class AssignTestAdvancedRequest(BaseModel):
    test_id: str
    classroom_id: Optional[str] = None
    student_ids: Optional[List[str]] = None
    due_date: Optional[datetime] = None
    test_config: Optional[dict] = None  # {question_count, question_selection, time_type, ...}

@router.post("/testai/assign-advanced")
async def assign_test_advanced(data: AssignTestAdvancedRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Advanced test assignment with test_config (time settings, shuffle, question count).
    """
    res = await db.execute(select(SavedTest).where(SavedTest.id == data.test_id))
    test = res.scalars().first()
    if not test:
        raise HTTPException(404, "Test topilmadi")
    
    # Build content with test_config embedded
    content_data = {
        "questions": test.questions,
        "test_config": data.test_config or {}
    }
    assignment_content = json.dumps(content_data)
    
    teacher_name = f"{current_user.first_name} {current_user.last_name}".strip()
    
    assignment = Assignment(
        created_by=current_user.id,
        creator_role=AssignmentCreatorRole.teacher,
        title=f"Test: {test.title}",
        description=test.description,
        assignment_type=AssignmentType.test,
        content=assignment_content,
        reference_id=test.id,
        reference_type="saved_test",
        max_score=100,
        due_date=data.due_date,
        is_published=True
    )
    db.add(assignment)
    await db.flush()
    
    notified_students = set()
    
    # By Classroom ID
    if data.classroom_id:
        from shared.database.models import TeacherProfile
        tp_res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
        tp = tp_res.scalars().first()
        if tp:
            cls_res = await db.execute(
                select(Classroom).where(Classroom.id == data.classroom_id, Classroom.teacher_id == tp.id)
            )
            classroom = cls_res.scalars().first()
            if classroom:
                db.add(AssignmentTarget(
                    assignment_id=assignment.id,
                    target_type=AssignmentTargetType.classroom,
                    target_id=classroom.id
                ))
                mem_res = await db.execute(
                    select(ClassroomStudent.student_user_id).where(
                        ClassroomStudent.classroom_id == classroom.id,
                        ClassroomStudent.status == ClassroomStudentStatus.active
                    )
                )
                for row in mem_res.fetchall():
                    notified_students.add(row[0])
    
    # By Student IDs
    if data.student_ids:
        for sid in data.student_ids:
            db.add(AssignmentTarget(
                assignment_id=assignment.id,
                target_type=AssignmentTargetType.student,
                target_id=sid
            ))
            notified_students.add(sid)
    
    due_text = data.due_date.strftime("%d.%m.%Y %H:%M") if data.due_date else "Belgilanmagan"
    for student_id in notified_students:
        db.add(AssignmentSubmission(
            assignment_id=assignment.id,
            student_user_id=student_id,
            status=SubmissionStatus.pending
        ))
        await create_notification(
            db, student_id,
            f"📝 Yangi test: {test.title}",
            f"{teacher_name} sizga yangi test topshirig'ini yubordi.\nMuddati: {due_text}",
            InAppNotifType.assignment_new,
            "assignment", assignment.id, current_user.id
        )
    
    await db.commit()
    
    for student_id in notified_students:
        tg_text = (
            f"📝 *Yangi test topshirig'i!*\n\n"
            f"*{test.title}*\n"
            f"O'qituvchi: {teacher_name}\n"
            f"Muddati: {due_text}\n\n"
            f"Platformaga kiring va testni yeching."
        )
        await notify_telegram(db, student_id, tg_text)
    
    return {"success": True, "assignment_id": assignment.id, "student_count": len(notified_students)}


# ============================================================
# RESULTS + LEADERBOARD
# ============================================================

@router.get("/testai/results/{test_id}")
async def get_test_results(test_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Returns results for all students who took an assignment tied to this test.
    """
    # 1. Find assignments tied to this test
    a_res = await db.execute(
        select(Assignment).where(Assignment.reference_id == test_id, Assignment.reference_type == "saved_test")
    )
    assignments = a_res.scalars().all()
    if not assignments:
        return {"success": True, "results": []}
        
    a_ids = [a.id for a in assignments]
    
    # 2. Fetch submissions with student names
    sub_res = await db.execute(
        select(AssignmentSubmission).where(AssignmentSubmission.assignment_id.in_(a_ids))
    )
    submissions = sub_res.scalars().all()
    
    results = []
    for s in submissions:
        # Get student name
        u_res = await db.execute(select(User).where(User.id == s.student_user_id))
        u = u_res.scalars().first()
        student_name = f"{u.first_name} {u.last_name}".strip() if u else f"ID: {s.student_user_id}"
        
        # Extract detailed info from submission content
        correct_answers = 0
        total_questions = 0
        time_spent = 0
        content_data = None
        
        if s.content:
            try:
                content_data = json.loads(s.content)
                correct_answers = content_data.get("correct_count", 0)
                total_questions = content_data.get("total", 0)
                time_spent = content_data.get("time_spent_seconds", 0)
            except (json.JSONDecodeError, TypeError):
                pass
        
        if s.meta_data:
            correct_answers = s.meta_data.get("correct", correct_answers)
            total_questions = s.meta_data.get("total", total_questions)
            time_spent = s.meta_data.get("time_spent_seconds", time_spent)
        
        results.append({
            "id": s.id,
            "student_id": s.student_user_id,
            "student_name": student_name,
            "score": s.score or 0,
            "status": s.status.value,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "correct_answers": correct_answers,
            "total_questions": total_questions,
            "time_spent": time_spent,
            "content": s.content,
        })
        
    return {"success": True, "results": results}


@router.get("/testai/results/{test_id}/leaderboard")
async def get_test_leaderboard(test_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Leaderboard: ranked by score DESC, then time_spent ASC.
    Also returns question-level analytics (most correct/incorrect).
    """
    # 1. Find assignments tied to this test
    a_res = await db.execute(
        select(Assignment).where(Assignment.reference_id == test_id, Assignment.reference_type == "saved_test")
    )
    assignments = a_res.scalars().all()
    if not assignments:
        return {"success": True, "data": {"leaderboard": [], "question_stats": {}}}
    
    a_ids = [a.id for a in assignments]
    
    # 2. Fetch graded submissions
    sub_res = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id.in_(a_ids),
            AssignmentSubmission.status == SubmissionStatus.graded,
        )
    )
    submissions = sub_res.scalars().all()
    
    # 3. Build leaderboard entries
    entries = []
    all_results = []  # for analytics
    
    for s in submissions:
        meta = s.meta_data or {}
        correct = meta.get("correct", 0)
        total = meta.get("total", 0)
        time_spent = meta.get("time_spent_seconds", 0)
        
        # Parse content for detailed results
        student_results = []
        try:
            if s.content:
                content_data = json.loads(s.content)
                student_results = content_data.get("results", [])
        except (json.JSONDecodeError, TypeError):
            pass
        
        # Get student name
        u_res = await db.execute(select(User).where(User.id == s.student_user_id))
        u = u_res.scalars().first()
        student_name = f"{u.first_name} {u.last_name}".strip() if u else "Noma'lum"
        
        entries.append({
            "student_id": s.student_user_id,
            "student_name": student_name,
            "score": correct,
            "total": total,
            "time_spent_seconds": time_spent,
            "percentage": round((correct / max(total, 1)) * 100),
            "results": student_results,
        })
        all_results.append(student_results)
    
    # 4. Sort: score DESC, time ASC (teng ball'da kam vaqt sarflagan ustun)
    entries.sort(key=lambda e: (-e["score"], e["time_spent_seconds"]))
    
    # 5. Assign ranks
    for i, entry in enumerate(entries):
        entry["rank"] = i + 1
    
    # 6. Question analytics
    question_stats = {}
    if all_results:
        # Count correct per question index
        q_correct_counts = {}
        q_total_counts = {}
        for results_list in all_results:
            for idx, r in enumerate(results_list):
                q_total_counts[idx] = q_total_counts.get(idx, 0) + 1
                if r.get("is_correct"):
                    q_correct_counts[idx] = q_correct_counts.get(idx, 0) + 1
        
        # Calculate percentages
        correct_percentages = {}
        for idx in q_total_counts:
            correct_percentages[idx] = round((q_correct_counts.get(idx, 0) / q_total_counts[idx]) * 100) if q_total_counts[idx] > 0 else 0
        
        # Sort by percentage
        sorted_by_pct = sorted(correct_percentages.items(), key=lambda x: x[1], reverse=True)
        
        most_correct = [idx for idx, pct in sorted_by_pct[:5] if pct > 0]
        most_incorrect = [idx for idx, pct in sorted_by_pct[-5:] if pct < 100]
        most_incorrect.reverse()
        
        question_stats = {
            "most_correct": most_correct,
            "most_incorrect": most_incorrect,
            "correct_percentages": correct_percentages,
        }
    
    return {
        "success": True,
        "data": {
            "leaderboard": entries,
            "question_stats": question_stats,
        }
    }

