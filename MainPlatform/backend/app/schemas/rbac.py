"""
RBAC Schemas - MainPlatform
"""

from pydantic import BaseModel
from typing import Optional

class ChildLoginRequest(BaseModel):
    """Child login with username + PIN"""
    username: str
    pin: str
