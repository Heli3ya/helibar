"""
Urban Bill of Lading - Security & JWT Authentication utilities
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Any
import hashlib
import hmac
import jwt
from backend.models import UserRole
from backend.schemas import TokenPayload

SECRET_KEY = os.getenv("JWT_SECRET", "tarabar-super-secret-production-key-change-in-env-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 Days


def get_password_hash(password: str) -> str:
    """
    PBKDF2-HMAC-SHA256 password hashing with salt.
    Guarantees cross-platform zero-dependency security.
    """
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"pbkdf2_sha256${salt.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against the stored pbkdf2 hash.
    """
    try:
        parts = hashed_password.split("$")
        if len(parts) != 3 or parts[0] != "pbkdf2_sha256":
            return False
        salt = bytes.fromhex(parts[1])
        expected_key = bytes.fromhex(parts[2])
        actual_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(expected_key, actual_key)
    except Exception:
        return False


def create_access_token(
    subject: str,
    username: str,
    role: UserRole,
    expires_delta: Optional[timedelta] = None,
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "username": username,
        "role": role.value,
        "exp": int(expire.timestamp()),
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenPayload]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenPayload(
            sub=payload["sub"],
            username=payload["username"],
            role=UserRole(payload["role"]),
            exp=payload["exp"],
        )
    except Exception:
        return None
