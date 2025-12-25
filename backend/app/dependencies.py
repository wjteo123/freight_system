from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError

from . import database, crud, security

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )
    try:
        payload = security.decode_access_token(token)
    except JWTError:
        raise credentials_exception

    user_id = payload.get("sub")
    session_id = payload.get("sid")
    if not user_id or not session_id:
        raise credentials_exception

    user = crud.get_user_by_id(db, user_id=int(user_id))
    if not user:
        raise credentials_exception

    crud.cleanup_expired_session(db, user)
    if not user.active_session_token or user.active_session_token != session_id:
        raise credentials_exception
    if not crud.is_user_session_active(user):
        raise credentials_exception

    return user
