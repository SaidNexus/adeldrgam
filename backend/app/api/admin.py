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
from app.core.security import get_current_user, get_current_active_superuser

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
        "total_users": int(u),
        "total_articles": int(a),
        "total_likes": int(l),
        "pending_approvals": int(p)
    }

@router.get("/users", response_model=dict)
def list_all_users(
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    current_user: User = Depends(get_current_active_superuser),
    session: Session = Depends(get_session)
):
    try:
        # Verify database connection
        print(f"DEBUG: Database URL: {session.bind.url}")
        print(f"DEBUG: Received request - Search: '{search}', Limit: {limit}, Offset: {offset}")
        
        # Base query
        query = select(User)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                (User.username.ilike(search_term)) | 
                (User.full_name.ilike(search_term)) |
                (User.email.ilike(search_term))
            )
        
        # Get total count for pagination
        if search:
            search_term = f"%{search}%"
            count_query = select(func.count(User.id)).where(
                (User.username.ilike(search_term)) | 
                (User.full_name.ilike(search_term)) |
                (User.email.ilike(search_term))
            )
        else:
            count_query = select(func.count(User.id))
            
        total = session.scalar(count_query) or 0
        print(f"DEBUG: Admin Users Query - Total in DB: {total}, Search: {search}")
        
        # Get paginated users
        users = session.exec(query.offset(offset).limit(limit)).all()
        print(f"DEBUG: Admin Users Query - Fetched: {len(users)}, Offset: {offset}, Limit: {limit}")
        
        # Enrich with profile data for ProfileRead
        from app.models.profile import Profile, ProfileRead
        from app.models.user_follow import UserFollow
        
        result_users = []
        for user in users:
            try:
                print(f"DEBUG: Processing user {user.id} ({user.username})...")
                
                # Get profile data
                profile = session.get(Profile, user.id)
                print(f"DEBUG:   - Profile found: {profile is not None}")
                
                # Get follower/following counts
                followers_count = session.scalar(select(func.count()).select_from(UserFollow).where(UserFollow.followed_id == user.id)) or 0
                following_count = session.scalar(select(func.count()).select_from(UserFollow).where(UserFollow.follower_id == user.id)) or 0
                print(f"DEBUG:   - Followers: {followers_count}, Following: {following_count}")
                
                # Construct ProfileRead object with explicit field mapping
                user_data = {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "full_name": user.full_name,
                    "bio": profile.bio if profile else None,
                    "avatar_url": profile.avatar_url if profile else None,
                    "avatar_public_id": profile.avatar_public_id if profile else None,
                    "role": user.role,
                    "is_admin": user.is_admin,
                    "created_at": user.created_at,
                    "followers_count": followers_count,
                    "following_count": following_count,
                    "is_following": False
                }
                
                # Validate and create ProfileRead using Pydantic's validation
                profile_read = ProfileRead(**user_data)
                result_users.append(profile_read)
                print(f"DEBUG:   ✓ Successfully enriched user: {user.username}")
                
            except Exception as e:
                # Log detailed error - DO NOT silently skip
                print(f"ERROR: Failed to enrich user {user.id} ({user.username}): {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
                
                # Try to include a minimal version without enrichment
                try:
                    minimal_user = ProfileRead(
                        id=user.id,
                        username=user.username,
                        email=user.email,
                        full_name=user.full_name,
                        bio=None,
                        avatar_url=None,
                        avatar_public_id=None,
                        role=user.role,
                        is_admin=user.is_admin,
                        created_at=user.created_at,
                        followers_count=0,
                        following_count=0,
                        is_following=False
                    )
                    result_users.append(minimal_user)
                    print(f"DEBUG:   ⚠ Added minimal version of user: {user.username}")
                except Exception as fallback_error:
                    print(f"ERROR: Even minimal user creation failed for {user.username}: {fallback_error}")
                    # Now we continue to skip this user only if even minimal version fails
                    continue

        print(f"DEBUG: Final enriched users count: {len(result_users)}")

        return {
            "users": result_users,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        print(f"DEBUG: Admin users fetch failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    role: str,
    current_user: User = Depends(get_current_active_superuser),
    session: Session = Depends(get_session)
):
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
    current_user: User = Depends(get_current_active_superuser),
    session: Session = Depends(get_session)
):
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
    current_user: User = Depends(get_current_active_superuser),
    session: Session = Depends(get_session)
):
    """Ban/Unban user"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = is_active
    session.add(user)
    session.commit()
    return {"message": f"User status updated to {'active' if is_active else 'inactive'}"}
