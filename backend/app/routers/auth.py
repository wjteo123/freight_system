from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from uuid import uuid4
from .. import schemas, crud, database, security, config, dependencies

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: schemas.UserCreate, db: Session = Depends(database.get_db)):
    existing_user = crud.get_user_by_username(db, username=payload.username)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    try:
        return crud.create_user(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/login", response_model=schemas.AuthResponse)
def login_user(credentials: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    try:
        user = crud.authenticate_user(db, username=credentials.username, password=credentials.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    crud.cleanup_expired_session(db, user)
    if crud.is_user_session_active(user):
        if not credentials.force:
            expires_at = None
            if user.active_session_expires_at:
                expires_at = user.active_session_expires_at.isoformat()
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail={
                    "code": "active_session",
                    "message": "Account is already active on another device",
                    "active_session": {
                        "expires_at": expires_at
                    }
                }
            )
        crud.clear_user_session(db, user)

    expires_delta = config.access_token_expiry_delta()
    session_id = uuid4().hex
    user = crud.set_user_session(db, user, session_id, expires_delta)
    token = security.create_access_token({"sub": str(user.id), "sid": session_id}, expires_delta=expires_delta)
    return schemas.AuthResponse(
        access_token=token,
        user=user,
        expires_in=int(expires_delta.total_seconds())
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_user(current_user = Depends(dependencies.get_current_user), db: Session = Depends(database.get_db)):
    crud.clear_user_session(db, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/forgot-password")
def reset_password(payload: schemas.PasswordResetRequest, db: Session = Depends(database.get_db)):
    user = crud.get_user_by_username(db, username=payload.username)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        crud.update_user_password(db, user, payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return {"detail": "Password updated successfully. Please sign in with your new password."}
