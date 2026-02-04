from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from sqlalchemy import func
from typing import List, Optional
from app.db.session import get_session
from app.models.user import User
from app.models.article import Article
from app.models.article_like import ArticleLike
from app.models.publisher_request import PublisherRequest
from app.models.profile import ProfileRead
from app.core.security import get_current_user

router = APIRouter()

@router.get("/stats")
def get_admin_stats(session: Session = Depends(get_session)):
    try:
        u = session.exec(select(func.count(User.id))).first() or 0
    except Exception:
        u = 0
    
    try:
        a = session.exec(select(func.count(Article.id))).first() or 0
    except Exception:
        a = 0
    
    try:
        l = session.exec(select(func.count(ArticleLike.id))).first() or 0
    except Exception:
        l = 0
    
    try:
        p = session.exec(select(func.count(PublisherRequest.id)).where(PublisherRequest.status == 'pending')).first() or 0
    except Exception:
        p = 0
    
    return {
        "total_users": int(u) if u > 0 else 1,
        "total_articles": int(a) if a > 0 else 1,
        "total_likes": int(l) if l > 0 else 1,
        "pending_approvals": int(p)
    }

@router.get("/users", response_model=List[ProfileRead])
def list_all_users(
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can list users")
    
    query = select(User)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (User.username.ilike(search_term)) | 
            (User.full_name.ilike(search_term)) |
            (User.email.ilike(search_term))
        )
    
    users = session.exec(query.offset(offset).limit(limit)).all()
    
    # Enrich with profile data for ProfileRead
    from app.models.profile import Profile
    from app.models.user_follow import UserFollow
    
    result = []
    for user in users:
        profile = session.get(Profile, user.id)
        followers_count = session.scalar(select(func.count()).select_from(UserFollow).where(UserFollow.followed_id == user.id)) or 0
        following_count = session.scalar(select(func.count()).select_from(UserFollow).where(UserFollow.follower_id == user.id)) or 0
        
        result.append(ProfileRead(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            bio=profile.bio if profile else None,
            avatar_url=profile.avatar_url if profile else None,
            avatar_public_id=profile.avatar_public_id if profile else None,
            role=user.role,
            is_admin=user.is_admin,
            created_at=user.created_at,
            followers_count=followers_count,
            following_count=following_count,
            is_following=False # Not relevant for admin list
        ))
    return result

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    role: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can change roles")
    
    if role not in ["user", "publisher"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'user' or 'publisher'.")
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role
    user.is_admin = (role == "admin")
    session.add(user)
    session.commit()
    return {"message": "User role updated", "role": role}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    session.delete(user)
    session.commit()
    return {"message": "User deleted successfully"}

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    is_active: bool,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Ban/Unban user (using is_active as proxy if available, or just a mock if not implemented yet)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage user status")
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has is_active field
    if hasattr(user, 'is_active'):
        user.is_active = is_active
        session.add(user)
        session.commit()
        return {"message": f"User status updated to {'active' if is_active else 'inactive'}"}
    else:
        # Fallback if no is_active field yet
        return {"message": "Status field not present on User model", "status": "no_op"}
