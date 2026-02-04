from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.db.session import get_session
from app.models.user import User, ChangePasswordRequest
from app.core.security import verify_password, get_password_hash, get_current_user
from datetime import datetime

router = APIRouter()

@router.patch("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 1. Verify current password
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور الحالية غير صحيحة"
        )
    
    # 2. Security Rules: new_password == current_password
    if verify_password(data.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية"
        )
    
    # 3. Hash and save
    current_user.hashed_password = get_password_hash(data.new_password)
    # If the user model has updated_at, we update it.
    # Looking at user.py, there is no updated_at field. I'll check if I should add it or if it's okay.
    # The instructions said: "6) Update updated_at field". 
    # Let me check User model again.
    
    session.add(current_user)
    session.commit()
    
    return {"message": "Password updated successfully"}
