"""
Live Quiz Service - Kahoot/Quizizz style real-time quiz
Maximum 40 students per quiz session.
"""
from typing import Optional, List, Dict
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload
import secrets
import string

# Shared imports
import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from app.core.errors import BadRequestError, NotFoundError, ForbiddenError
from shared.database.models import (
    User, UserRole,
    TeacherProfile, StudentProfile,
    LiveQuiz, LiveQuizQuestion, LiveQuizParticipant, LiveQuizAnswer,
    LiveQuizStatus, ParticipantState,
    StudentCoin, CoinTransaction, TransactionType
)


class LiveQuizService:
    """Service for Live Quiz (Kahoot-style) operations"""
    
    MAX_PARTICIPANTS = 40  # One classroom
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ============================================================
    # TEACHER FUNCTIONS
    # ============================================================
    
    async def create_quiz(
        self,
        teacher_user_id: str,
        title: str,
        description: Optional[str] = None,
        time_per_question: int = 30,
        shuffle_questions: bool = False,
        shuffle_options: bool = False
    ) -> Dict:
        """Create a new live quiz."""
        # Get teacher profile
        res = await self.db.execute(select(TeacherProfile).where(TeacherProfile.user_id == teacher_user_id))
        teacher_profile = res.scalar_one_or_none()
        
        if not teacher_profile:
            raise ForbiddenError("O'qituvchi profili topilmadi")
        
        # Generate unique join code
        join_code = await self._generate_unique_code()
        
        quiz = LiveQuiz(
            teacher_id=teacher_profile.id,
            title=title,
            description=description,
            join_code=join_code,
            time_per_question=time_per_question,
            shuffle_questions=shuffle_questions,
            shuffle_options=shuffle_options,
            max_participants=self.MAX_PARTICIPANTS,
            status=LiveQuizStatus.created
        )
        
        self.db.add(quiz)
        await self.db.commit()
        await self.db.refresh(quiz)
        
        return {
            "message": "Live Quiz yaratildi",
            "quiz_id": quiz.id,
            "join_code": quiz.join_code,
            "title": quiz.title
        }
    
    async def add_questions(
        self,
        teacher_user_id: str,
        quiz_id: str,
        questions: List[Dict]
    ) -> Dict:
        """Add questions to quiz."""
        quiz = await self._get_quiz_for_teacher(quiz_id, teacher_user_id)
        
        if quiz.status != LiveQuizStatus.created:
            raise BadRequestError("Quiz allaqachon boshlangan")
        
        for i, q in enumerate(questions):
            question = LiveQuizQuestion(
                quiz_id=quiz_id,
                question_text=q.get("text"),
                question_image=q.get("image"),
                options=q.get("options", []),
                correct_answer=q.get("correct", 0),
                points=q.get("points", 100),
                time_limit=q.get("time_limit", quiz.time_per_question),
                order=i
            )
            self.db.add(question)
        
        await self.db.commit()
        
        return {"message": f"{len(questions)} ta savol qo'shildi"}
    
    async def open_lobby(self, teacher_user_id: str, quiz_id: str) -> Dict:
        """
        Open quiz lobby for students to join.
        Returns join code and QR code data.
        """
        quiz = await self._get_quiz_for_teacher(quiz_id, teacher_user_id)
        
        if len(quiz.questions) < 1:
            raise BadRequestError("Kamida 1 ta savol qo'shing")
        
        quiz.status = LiveQuizStatus.waiting
        await self.db.commit()
        
        # Generate QR code data (URL for joining)
        qr_data = f"https://alif24.uz/join-quiz?code={quiz.join_code}"
        
        return {
            "message": "Lobby ochildi! O'quvchilar qo'shilishi mumkin.",
            "join_code": quiz.join_code,
            "qr_data": qr_data,
            "max_participants": self.MAX_PARTICIPANTS,
            "current_participants": len(quiz.participants)
        }
    
    async def get_lobby_status(self, teacher_user_id: str, quiz_id: str) -> Dict:
        """Get current lobby status and participants."""
        quiz = await self._get_quiz_for_teacher(quiz_id, teacher_user_id)
        
        participants = [
            {
                "display_name": p.display_name,
                "avatar_emoji": p.avatar_emoji,
                "state": p.state.value,
                "joined_at": p.joined_at.isoformat()
            }
            for p in quiz.participants
        ]
        
        return {
            "status": quiz.status.value,
            "join_code": quiz.join_code,
            "participants_count": len(participants),
            "max_participants": self.MAX_PARTICIPANTS,
            "participants": participants
        }
    
    async def start_quiz(self, teacher_user_id: str, quiz_id: str) -> Dict:
        """Start the quiz - begin showing questions."""
        quiz = await self._get_quiz_for_teacher(quiz_id, teacher_user_id)
        
        if quiz.status != LiveQuizStatus.waiting:
            raise BadRequestError("Quiz lobby ochilmagan")
        
        if len(quiz.participants) == 0:
            raise BadRequestError("Kamida 1 ta qatnashchi kerak")
        
        quiz.status = LiveQuizStatus.active
        quiz.started_at = datetime.now(timezone.utc)
        quiz.current_question_index = 0
        
        # Mark all participants as ready
        for p in quiz.participants:
            p.state = ParticipantState.answering
        
        await self.db.commit()
        
        return {
            "message": "Quiz boshlandi!",
            "total_questions": len(quiz.questions),
            "current_question": 1
        }
    
    async def get_current_question(self, teacher_user_id: str, quiz_id: str) -> Dict:
        """Get current question for display."""
        quiz = await self._get_quiz_for_teacher(quiz_id, teacher_user_id)
        
        if quiz.status != LiveQuizStatus.active:
            raise BadRequestError("Quiz faol emas")
        
        if quiz.current_question_index >= len(quiz.questions):
            return {"message": "Barcha savollar tugadi", "finished": True}
        
        question = quiz.questions[quiz.current_question_index]
        
        return {
            "question_number": quiz.current_question_index + 1,
            "total_questions": len(quiz.questions),
            "question_id": question.id,
            "text": question.question_text,
            "image": question.question_image,
            "options": question.options,
            "time_limit": question.time_limit,
            "points": question.points
        }
    
    async def next_question(self, teacher_user_id: str, quiz_id: str) -> Dict:
        """Move to next question."""
        quiz = await self._get_quiz_for_teacher(quiz_id, teacher_user_id)
        
        if quiz.status != LiveQuizStatus.active:
            raise BadRequestError("Quiz faol emas")
        
        quiz.current_question_index += 1
        
        if quiz.current_question_index >= len(quiz.questions):
            # Quiz finished
            quiz.status = LiveQuizStatus.finished
            quiz.ended_at = datetime.now(timezone.utc)
            await self._calculate_rankings(quiz)
        
        await self.db.commit()
        
        return await self.get_current_question(teacher_user_id, quiz_id)
    
    async def get_question_results(self, teacher_user_id: str, quiz_id: str, question_id: str) -> Dict:
        """Get results for a specific question."""
        quiz = await self._get_quiz_for_teacher(quiz_id, teacher_user_id)
        
        res = await self.db.execute(select(LiveQuizQuestion).where(LiveQuizQuestion.id == question_id))
        question = res.scalar_one_or_none()
        
        if not question:
            raise NotFoundError("Savol topilmadi")
        
        res = await self.db.execute(select(LiveQuizAnswer).where(LiveQuizAnswer.question_id == question_id))
        answers = res.scalars().all()
        
        # Count answers per option
        option_counts = [0] * len(question.options)
        for a in answers:
            if a.selected_answer is not None and a.selected_answer < len(option_counts):
                option_counts[a.selected_answer] += 1
        
        correct_count = sum(1 for a in answers if a.is_correct)
        
        return {
            "question_text": question.question_text,
            "correct_answer": question.correct_answer,
            "options": question.options,
            "option_counts": option_counts,
            "correct_count": correct_count,
            "total_answers": len(answers)
        }
    
    async def get_leaderboard(self, teacher_user_id: str, quiz_id: str) -> List[Dict]:
        """Get current leaderboard."""
        quiz = await self._get_quiz_for_teacher(quiz_id, teacher_user_id)
        
        participants = sorted(
            quiz.participants,
            key=lambda p: (-p.total_score, -p.current_streak)
        )
        
        return [
            {
                "rank": i + 1,
                "display_name": p.display_name,
                "avatar_emoji": p.avatar_emoji,
                "total_score": p.total_score,
                "correct_count": p.correct_count,
                "current_streak": p.current_streak
            }
            for i, p in enumerate(participants)
        ]
    
    async def end_quiz(self, teacher_user_id: str, quiz_id: str) -> Dict:
        """End the quiz and finalize scores."""
        quiz = await self._get_quiz_for_teacher(quiz_id, teacher_user_id)
        
        quiz.status = LiveQuizStatus.finished
        quiz.ended_at = datetime.now(timezone.utc)
        
        await self._calculate_rankings(quiz)
        await self.db.commit()
        
        return {
            "message": "Quiz tugatildi!",
            "leaderboard": await self.get_leaderboard(teacher_user_id, quiz_id)
        }
    
    # ============================================================
    # STUDENT FUNCTIONS
    # ============================================================
    
    async def join_quiz(
        self,
        student_user_id: str,
        join_code: str,
        display_name: str,
        avatar_emoji: str = "🎮"
    ) -> Dict:
        """Student joins a quiz using join code."""
        res = await self.db.execute(
            select(LiveQuiz).where(LiveQuiz.join_code == join_code.upper())
            .options(selectinload(LiveQuiz.participants))
        )
        quiz = res.scalar_one_or_none()
        
        if not quiz:
            raise NotFoundError("Quiz topilmadi. Kodni tekshiring.")
        
        if quiz.status != LiveQuizStatus.waiting:
            raise BadRequestError("Quiz hali ochilmagan yoki allaqachon boshlangan")
        
        if len(quiz.participants) >= self.MAX_PARTICIPANTS:
            raise BadRequestError("Quiz to'la! Maksimum 40 o'quvchi.")
        
        # Get student profile
        res = await self.db.execute(select(StudentProfile).where(StudentProfile.user_id == student_user_id))
        student_profile = res.scalar_one_or_none()
        
        if not student_profile:
            raise NotFoundError("O'quvchi profili topilmadi")
        
        # Check if already joined
        res = await self.db.execute(
            select(LiveQuizParticipant).where(
                and_(
                    LiveQuizParticipant.quiz_id == quiz.id,
                    LiveQuizParticipant.student_id == student_profile.id
                )
            )
        )
        existing = res.scalar_one_or_none()
        
        if existing:
            return {
                "message": "Siz allaqachon qo'shilgansiz",
                "quiz_id": quiz.id,
                "quiz_title": quiz.title
            }
        
        # Join quiz
        participant = LiveQuizParticipant(
            quiz_id=quiz.id,
            student_id=student_profile.id,
            display_name=display_name[:50],
            avatar_emoji=avatar_emoji[:10],
            state=ParticipantState.joined
        )
        
        self.db.add(participant)
        await self.db.commit()
        
        return {
            "message": "Muvaffaqiyatli qo'shildingiz!",
            "quiz_id": quiz.id,
            "quiz_title": quiz.title,
            "participant_id": participant.id
        }
    
    async def get_student_question(self, student_user_id: str, quiz_id: str) -> Dict:
        """Get current question for student (without correct answer)."""
        participant = await self._get_participant(student_user_id, quiz_id)
        quiz = participant.quiz
        
        if quiz.status == LiveQuizStatus.waiting:
            return {"status": "waiting", "message": "O'qituvchini kuting..."}
        
        if quiz.status == LiveQuizStatus.finished:
            return {"status": "finished", "message": "Quiz tugadi!"}
        
        if quiz.current_question_index >= len(quiz.questions):
            return {"status": "finished", "message": "Barcha savollar tugadi!"}
        
        question = quiz.questions[quiz.current_question_index]
        
        # Check if already answered
        res = await self.db.execute(
            select(LiveQuizAnswer).where(
                and_(
                    LiveQuizAnswer.participant_id == participant.id,
                    LiveQuizAnswer.question_id == question.id
                )
            )
        )
        already_answered = res.scalar_one_or_none()
        
        return {
            "status": "active",
            "question_number": quiz.current_question_index + 1,
            "total_questions": len(quiz.questions),
            "question_id": question.id,
            "text": question.question_text,
            "image": question.question_image,
            "options": question.options,
            "time_limit": question.time_limit,
            "already_answered": already_answered is not None
        }
    
    async def submit_answer(
        self,
        student_user_id: str,
        quiz_id: str,
        question_id: str,
        selected_answer: int,
        time_to_answer_ms: int
    ) -> Dict:
        """Submit answer for current question."""
        participant = await self._get_participant(student_user_id, quiz_id)
        quiz = participant.quiz
        
        if quiz.status != LiveQuizStatus.active:
            raise BadRequestError("Quiz faol emas")
        
        # Get question
        res = await self.db.execute(select(LiveQuizQuestion).where(LiveQuizQuestion.id == question_id))
        question = res.scalar_one_or_none()
        
        if not question or question.quiz_id != quiz.id:
            raise NotFoundError("Savol topilmadi")
        
        # Check if already answered
        res = await self.db.execute(
            select(LiveQuizAnswer).where(
                and_(
                    LiveQuizAnswer.participant_id == participant.id,
                    LiveQuizAnswer.question_id == question_id
                )
            )
        )
        existing = res.scalar_one_or_none()
        
        if existing:
            raise BadRequestError("Bu savolga allaqachon javob berdingiz")
        
        # Calculate score (faster = more points)
        is_correct = (selected_answer == question.correct_answer)
        points = 0
        
        if is_correct:
            # Base points reduced by time taken (max 1000ms penalty)
            time_penalty = min(time_to_answer_ms / (question.time_limit * 10), question.points * 0.5)
            points = max(int(question.points - time_penalty), question.points // 2)
            
            participant.correct_count += 1
            participant.current_streak += 1
            participant.best_streak = max(participant.best_streak, participant.current_streak)
        else:
            participant.wrong_count += 1
            participant.current_streak = 0
        
        participant.total_score += points
        
        # Save answer
        answer = LiveQuizAnswer(
            participant_id=participant.id,
            question_id=question_id,
            selected_answer=selected_answer,
            is_correct=is_correct,
            points_earned=points,
            time_to_answer_ms=time_to_answer_ms
        )
        
        self.db.add(answer)
        await self.db.commit()
        
        return {
            "is_correct": is_correct,
            "points_earned": points,
            "total_score": participant.total_score,
            "current_streak": participant.current_streak
        }
    
    async def get_student_results(self, student_user_id: str, quiz_id: str) -> Dict:
        """Get final results for student."""
        participant = await self._get_participant(student_user_id, quiz_id)
        
        return {
            "quiz_title": participant.quiz.title,
            "rank": participant.rank,
            "total_score": participant.total_score,
            "correct_count": participant.correct_count,
            "wrong_count": participant.wrong_count,
            "best_streak": participant.best_streak,
            "coins_earned": participant.coins_earned
        }
    
    # ============================================================
    # HELPER METHODS
    # ============================================================
    
    async def _generate_unique_code(self, length: int = 6) -> str:
        """Generate unique join code."""
        while True:
            code = ''.join(secrets.choice(string.digits) for _ in range(length))
            res = await self.db.execute(select(LiveQuiz).where(LiveQuiz.join_code == code))
            existing = res.scalar_one_or_none()
            if not existing:
                return code
    
    async def _get_quiz_for_teacher(self, quiz_id: str, teacher_user_id: str) -> LiveQuiz:
        """Get quiz and verify teacher ownership."""
        res = await self.db.execute(select(TeacherProfile).where(TeacherProfile.user_id == teacher_user_id))
        teacher_profile = res.scalar_one_or_none()
        
        if not teacher_profile:
            raise ForbiddenError("O'qituvchi profili topilmadi")
        
        res = await self.db.execute(
            select(LiveQuiz).where(
                and_(LiveQuiz.id == quiz_id, LiveQuiz.teacher_id == teacher_profile.id)
            ).options(
                selectinload(LiveQuiz.questions),
                selectinload(LiveQuiz.participants)
            )
        )
        quiz = res.scalar_one_or_none()
        
        if not quiz:
            raise NotFoundError("Quiz topilmadi")
        
        return quiz
    
    async def _get_participant(self, student_user_id: str, quiz_id: str) -> LiveQuizParticipant:
        """Get participant by student user ID."""
        res = await self.db.execute(select(StudentProfile).where(StudentProfile.user_id == student_user_id))
        student_profile = res.scalar_one_or_none()
        
        if not student_profile:
            raise NotFoundError("O'quvchi profili topilmadi")
        
        res = await self.db.execute(
            select(LiveQuizParticipant).where(
                and_(
                    LiveQuizParticipant.quiz_id == quiz_id,
                    LiveQuizParticipant.student_id == student_profile.id
                )
            ).options(selectinload(LiveQuizParticipant.quiz).selectinload(LiveQuiz.questions))
        )
        participant = res.scalar_one_or_none()
        
        if not participant:
            raise NotFoundError("Siz bu quizga qo'shilmagansiz")
        
        return participant
    
    async def _calculate_rankings(self, quiz: LiveQuiz):
        """Calculate final rankings and award coins."""
        participants = sorted(
            quiz.participants,
            key=lambda p: (-p.total_score, -p.best_streak)
        )
        
        for rank, participant in enumerate(participants, 1):
            participant.rank = rank
            participant.state = ParticipantState.finished
            
            # Award coins for participation and performance
            base_coins = 2 * participant.correct_count  # 2 coins per correct answer
            participant.coins_earned = base_coins
            
            # Add coins to student balance
            await self._add_coins(participant.student_id, base_coins)
        
        await self.db.commit()
    
    async def _add_coins(self, student_id: str, amount: int):
        """Add coins to student balance."""
        res = await self.db.execute(select(StudentCoin).where(StudentCoin.student_id == student_id))
        coin_balance = res.scalar_one_or_none()
        
        if not coin_balance:
            coin_balance = StudentCoin(student_id=student_id)
            self.db.add(coin_balance)
            await self.db.flush()
        
        coin_balance.total_earned += amount
        coin_balance.current_balance += amount
        
        transaction = CoinTransaction(
            student_coin_id=coin_balance.id,
            type=TransactionType.quiz_correct,
            amount=amount,
            description="Live Quiz mukofoti"
        )
        self.db.add(transaction)
