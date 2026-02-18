"""
Custom HTTP Exceptions for TestAI Platform
"""
from fastapi import HTTPException


class BadRequestError(HTTPException):
    """400 Bad Request"""
    def __init__(self, detail: str = "Bad request"):
        super().__init__(status_code=400, detail=detail)


class NotFoundError(HTTPException):
    """404 Not Found"""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=404, detail=detail)


class ForbiddenError(HTTPException):
    """403 Forbidden"""
    def __init__(self, detail: str = "Access forbidden"):
        super().__init__(status_code=403, detail=detail)


class UnauthorizedError(HTTPException):
    """401 Unauthorized"""
    def __init__(self, detail: str = "Authentication required"):
        super().__init__(status_code=401, detail=detail)


class ConflictError(HTTPException):
    """409 Conflict"""
    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(status_code=409, detail=detail)
