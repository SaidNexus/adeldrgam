from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select, or_, func
from app.db.session import get_session
from app.models.user import User, UserCreate
from app.models.profile import Profile
from app.models.notification import NotificationPreferences
from app.models.token import RefreshToken
from datetime import datetime
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    decode_token,
    oauth2_scheme
)
from typing import Optional

router = APIRouter()

@router.post("/register")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
def register(request: Request, user_data: UserCreate, session: Session = Depends(get_session)):
    # Check if user exists (Case Insensitive)
    existing = session.exec(select(User).where(func.lower(User.email) == user_data.email.lower())).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    existing_username = session.exec(select(User).where(func.lower(User.username) == user_data.username.lower())).first()
    if existing_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
    
    # Create user
    user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password)
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Create profile
    profile = Profile(id=user.id)
    session.add(profile)
    
    # Create notification preferences
    prefs = NotificationPreferences(user_id=user.id)
    session.add(prefs)
    
    session.commit()
    
    return {"message": "User created successfully", "user_id": user.id}

@router.post("/login")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def login(
    request: Request, 
    session: Session = Depends(get_session)
):
    """
    Flexible Login endpoint:
    - Supports JSON and application/x-www-form-urlencoded
    - Try JSON first, fallback to Form data
    - Searches by email OR username
    """
    username = None
    password = None

    # 1. Try JSON body
    import json
    try:
        body = await request.json()
        if body:
            username = body.get("username")
            password = body.get("password")
    except (json.JSONDecodeError, Exception):
        pass

    # 2. Fallback to Form data
    if not username or not password:
        try:
            form = await request.form()
            if form:
                username = form.get("username")
                password = form.get("password")
        except Exception:
            pass

    # 3. Validation & Normalization
    if username:
        username = str(username).strip().lower()
    if password is not None:
        password = str(password)

    if not username or not password:
         raise HTTPException(
             status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
             detail="Missing 'username' or 'password'"
         )

    # Find user by email OR username (Case Insensitive)
    statement = select(User).where(
        or_(
            func.lower(User.email) == username, 
            func.lower(User.username) == username
        )
    )
    user = session.exec(statement).first()
    
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    # Store refresh token
    refresh_payload = decode_token(refresh_token)
    db_token = RefreshToken(
        jti=refresh_payload["jti"],
        user_id=user.id,
        expires_at=datetime.fromtimestamp(refresh_payload["exp"])
    )
    session.add(db_token)
    session.commit()

    # Normalize user and profile data
    profile = user.profile if hasattr(user, 'profile') and user.profile else None
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "bio": profile.bio if profile else None,
            "avatar_url": profile.avatar_url if profile else None,
            "avatar_public_id": profile.avatar_public_id if profile else None
        }
    }



@router.post("/refresh")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
def refresh_token(request: Request, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid refresh token")
    
    jti = payload.get("jti")
    db_token = session.exec(select(RefreshToken).where(RefreshToken.jti == jti)).first()
    
    if not db_token or db_token.revoked or db_token.expires_at < datetime.utcnow():
        if db_token:
            db_token.revoked = True
            session.add(db_token)
            session.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    
    user_id = payload.get("sub")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    db_token.revoked = True
    session.add(db_token)
    
    new_access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})
    
    new_payload = decode_token(new_refresh_token)
    new_db_token = RefreshToken(
        jti=new_payload["jti"],
        user_id=user.id,
        expires_at=datetime.fromtimestamp(new_payload["exp"])
    )
    session.add(new_db_token)
    session.commit()
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.get("/me")
def get_current_user_me(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    profile = session.get(Profile, user.id)
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "bio": profile.bio if profile else None,
            "avatar_url": profile.avatar_url if profile else None,
            "avatar_public_id": profile.avatar_public_id if profile else None
        }
    }


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}


# === PASSWORD RESET ENDPOINTS ===

from app.schemas.password_reset import ForgotPasswordRequest, ResetPasswordRequest
from app.services.password_reset_service import PasswordResetService
from app.services.email_service import get_email_service


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    session: Session = Depends(get_session)
):
    """
    Request a password reset email.
    Always returns success to prevent email enumeration.
    """
    service = PasswordResetService(session)
    raw_token, user = service.request_reset(data.email)
    
    if raw_token and user:
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
        email_service = get_email_service()
        email_service.send_password_reset_email(
            to_email=user.email,
            username=user.username,
            reset_url=reset_url
        )
    
    return {"message": "If the account exists, reset instructions were sent."}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password_endpoint(
    request: Request,
    data: ResetPasswordRequest,
    session: Session = Depends(get_session)
):
    """Reset password using the token from email."""
    service = PasswordResetService(session)
    success = service.reset_password(data.token, data.new_password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    return {"message": "Password reset successfully"}
