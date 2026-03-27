from fastapi import Request, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from shared.auth import verify_token

security = HTTPBearer(auto_error=False)

def get_current_user_data(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """Extract token from cookies or Authorization header."""
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials
        
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token noto'g'ri yoki muddati o'tgan")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token formati bekor")

    return {"user_id": user_id}
