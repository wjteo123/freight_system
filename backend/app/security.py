from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import JWTError, jwt

import bcrypt as _bcrypt

if not hasattr(_bcrypt, "__about__"):
    class _BcryptAbout:
        __version__ = getattr(_bcrypt, "__version__", "unknown")

    _bcrypt.__about__ = _BcryptAbout()

from passlib.context import CryptContext

from . import config

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_MAX_BCRYPT_BYTES = 72


def _ensure_bcrypt_limit(password: str) -> None:
    # Bcrypt truncates after 72 bytes; enforce here to avoid silent truncation.
    if len(password.encode("utf-8")) > _MAX_BCRYPT_BYTES:
        raise ValueError(f"Password cannot exceed {_MAX_BCRYPT_BYTES} bytes")


def hash_password(password: str) -> str:
    """Return a bcrypt hash for the provided password."""
    _ensure_bcrypt_limit(password)
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compare a plain password against its hash."""
    _ensure_bcrypt_limit(plain_password)
    return _pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or config.access_token_expiry_delta())
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT access token."""
    try:
        return jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
    except JWTError as exc:
        raise exc
