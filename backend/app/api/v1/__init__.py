from fastapi import APIRouter
from app.api.v1 import auth, users, students, lessons, games, profiles, avatars, teacher_tests, rbac_endpoints

from app.api.v1.endpoints import testai

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(students.router, prefix="/students", tags=["students"])
router.include_router(lessons.router, prefix="/lessons", tags=["lessons"])
router.include_router(games.router, prefix="/games", tags=["games"])
router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
router.include_router(avatars.router, prefix="/avatars", tags=["avatars"])
router.include_router(teacher_tests.router, prefix="/teacher-tests", tags=["teacher-tests"])
router.include_router(testai.router, prefix="/testai", tags=["testai"])

# RBAC Routers
router.include_router(rbac_endpoints.parent_router)
router.include_router(rbac_endpoints.teacher_router)
router.include_router(rbac_endpoints.admin_router)

