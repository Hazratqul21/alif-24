"""
Custom Error Classes for MainPlatform
"""

from fastapi import HTTPException, status
from typing import Optional

class AppError(HTTPException):
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR"
    ):
        self.error_code = error_code
        super().__init__(status_code=status_code, detail=message)

class BadRequestError(AppError):
    def __init__(self, message: str = "Bad Request"):
        super().__init__(message, status_code=400, error_code="BAD_REQUEST")

class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401, error_code="UNAUTHORIZED")

class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status_code=403, error_code="FORBIDDEN")

class NotFoundError(AppError):
    def __init__(self, message: str = "Not Found"):
        super().__init__(message, status_code=404, error_code="NOT_FOUND")

class ConflictError(AppError):
    def __init__(self, message: str = "Conflict"):
        super().__init__(message, status_code=409, error_code="CONFLICT")

class TokenExpiredError(UnauthorizedError):
    def __init__(self, message: str = "Token has expired"):
        super().__init__(message)
        self.error_code = "TOKEN_EXPIRED"
