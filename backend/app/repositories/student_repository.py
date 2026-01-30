from typing import Optional
from sqlalchemy.orm import Session
from app.models.student import Student
from app.repositories.base_repository import BaseRepository

class StudentRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(Student, db)
    
    def find_by_user_id(self, user_id: str) -> Optional[Student]:
        """Find student by user ID"""
        return self.find_one({"user_id": user_id})
    
    def find_with_user(self, id: str):
        """Find student with user details"""
        return self.db.query(Student).filter(Student.id == id).first()
    
    def find_by_level(self, level: int):
        """Find students by level"""
        return self.find_all({"level": level})
    
    def add_points(self, student_id: str, points: int):
        """Update student points"""
        student = self.find_by_id(student_id)
        if not student:
            return None
        
        student.total_points += points
        self.db.flush()
        return student
    
    def update_level(self, student_id: str, new_level: int):
        """Update student level"""
        return self.update(student_id, {"level": new_level})
    
    def increment_lessons_completed(self, student_id: str):
        """Increment completed lessons count"""
        student = self.find_by_id(student_id)
        if not student:
            return None
        
        student.total_lessons_completed += 1
        self.db.flush()
        return student
    
    def increment_games_played(self, student_id: str):
        """Increment games played count"""
        student = self.find_by_id(student_id)
        if not student:
            return None
        
        student.total_games_played += 1
        self.db.flush()
        return student
    
    def update_average_score(self, student_id: str, new_score: float):
        """Update average score"""
        student = self.find_by_id(student_id)
        if not student:
            return None
        
        total_activities = student.total_lessons_completed + student.total_games_played
        if total_activities == 0:
            student.average_score = new_score
        else:
            student.average_score = ((student.average_score * total_activities) + new_score) / (total_activities + 1)
        
        self.db.flush()
        return student

