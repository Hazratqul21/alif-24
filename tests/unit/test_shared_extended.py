import pytest
import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from shared.database.id_generator import generate_8_digit_id
from shared.auth import create_access_token, verify_token
from shared.database.models import User, AccountStatus

def test_id_generator():
    """Test ID generation format"""
    new_id = generate_8_digit_id()
    assert len(new_id) == 8
    assert new_id.isdigit(), "ID must be digits only"

def test_token_creation_and_verify():
    """Test JWT token flow"""
    data = {"sub": "12345678", "role": "student"}
    token = create_access_token(data)
    assert token is not None
    assert isinstance(token, str)
    
    payload = verify_token(token)
    assert payload is not None
    assert payload["sub"] == "12345678"
    assert payload["role"] == "student"

def test_user_model_instantiation():
    """Test User model creation"""
    user = User(
        phone="998901234567",
        first_name="Test",
        last_name="User",
        status=AccountStatus.active
    )
    assert user.phone == "998901234567"
    assert user.status == AccountStatus.active
