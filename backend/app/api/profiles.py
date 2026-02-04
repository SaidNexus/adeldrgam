from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from sqlmodel import Session, select, func
from app.db.session import get_session
from app.models.user import User
from app.models.profile import Profile, ProfileUpdate, ProfileRead
from app.models.article import Article
from app.models.article_like import ArticleLike
from app.core.security import get_current_user, get_current_user_optional
from app.core.cloudinary import delete_image_from_cloudinary
from app.models.user_follow import UserFollow, FollowRead
from app.api.notifications import manager
from app.models.notification import Notification
import json

router = APIRouter()

@router.get("", response_model=List[ProfileRead])
def list_profiles(
    search: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """List authors/publishers with optional search"""
    query = select(User).where(User.role.in_(["publisher", "admin"]))
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (User.username.ilike(search_term)) | 
            (User.full_name.ilike(search_term))
        )
    
    users = session.exec(query).all()
    
    result = []
    for user in users:
        profile = session.get(Profile, user.id)
        
        # Count followers/following
        followers_count = session.exec(select(func.count(UserFollow.follower_id)).where(UserFollow.followed_id == user.id)).one()
        following_count = session.exec(select(func.count(UserFollow.followed_id)).where(UserFollow.follower_id == user.id)).one()
        
        is_following = False
        if current_user:
            check = session.exec(select(UserFollow).where(
                UserFollow.follower_id == current_user.id,
                UserFollow.followed_id == user.id
            )).first()
            is_following = check is not None
            
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
            is_following=is_following
        ))
    
    return result

@router.get("/me", response_model=ProfileRead)
def get_my_profile(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    profile = session.get(Profile, user.id)
    
    # Count followers/following
    followers_count = session.exec(select(func.count(UserFollow.follower_id)).where(UserFollow.followed_id == user.id)).one()
    following_count = session.exec(select(func.count(UserFollow.followed_id)).where(UserFollow.follower_id == user.id)).one()

    return ProfileRead(
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
        is_following=False
    )

@router.get("/{user_id}", response_model=ProfileRead)
def get_profile(
    user_id: str, 
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    profile = session.get(Profile, user_id)
    
    # Count followers/following
    followers_count = session.exec(select(func.count(UserFollow.follower_id)).where(UserFollow.followed_id == user_id)).one()
    following_count = session.exec(select(func.count(UserFollow.followed_id)).where(UserFollow.follower_id == user_id)).one()
    
    is_following = False
    if current_user:
        follow_check = session.exec(select(UserFollow).where(
            UserFollow.follower_id == current_user.id,
            UserFollow.followed_id == user_id
        )).first()
        is_following = follow_check is not None

    return ProfileRead(
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
        is_following=is_following
    )

@router.patch("/me", response_model=ProfileRead)
def update_my_profile(
    updates: ProfileUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # 1. Update User fields (username, full_name)
    if updates.username is not None and updates.username != user.username:
        # Check uniqueness
        existing = session.exec(select(User).where(User.username == updates.username)).first()
        if existing:
            raise HTTPException(status_code=400, detail="اسم المستخدم هذا مأخوذ بالفعل")
        user.username = updates.username
    
    if updates.full_name is not None:
        user.full_name = updates.full_name
    
    # 2. Update Profile fields (bio, avatar_url, avatar_public_id)
    profile = session.get(Profile, user.id)
    if not profile:
        profile = Profile(id=user.id)
        session.add(profile)
    
    if updates.bio is not None:
        profile.bio = updates.bio
        
    if updates.avatar_url is not None:
        # If we have a new avatar_url AND a new avatar_public_id is provided, 
        # it means the frontend uploaded a new one. 
        # Delete the OLD one if it exists.
        if updates.avatar_public_id and profile.avatar_public_id and updates.avatar_public_id != profile.avatar_public_id:
            delete_image_from_cloudinary(profile.avatar_public_id)
        
        profile.avatar_url = updates.avatar_url
        if updates.avatar_public_id:
            profile.avatar_public_id = updates.avatar_public_id
    
    session.add(user)
    session.commit()
    session.refresh(user)
    session.refresh(profile)
    
    # Count followers/following (consistent return)
    followers_count = session.exec(select(func.count(UserFollow.follower_id)).where(UserFollow.followed_id == user.id)).one()
    following_count = session.exec(select(func.count(UserFollow.followed_id)).where(UserFollow.follower_id == user.id)).one()

    return ProfileRead(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        avatar_public_id=profile.avatar_public_id,
        role=user.role,
        is_admin=user.is_admin,
        created_at=user.created_at,
        followers_count=followers_count,
        following_count=following_count,
        is_following=False
    )

@router.post("/{user_id}/follow")
async def toggle_follow(
    user_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="لا يمكنك متابعة نفسك")
    
    followed_user = session.get(User, user_id)
    if not followed_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing_follow = session.exec(select(UserFollow).where(
        UserFollow.follower_id == current_user.id,
        UserFollow.followed_id == user_id
    )).first()
    
    if existing_follow:
        session.delete(existing_follow)
        session.commit()
        return {"is_following": False}
    else:
        new_follow = UserFollow(follower_id=current_user.id, followed_id=user_id)
        session.add(new_follow)
        
        # Create notification
        notif = Notification(
            user_id=user_id,
            type="follow",
            title="متابع جديد",
            message=f"قام {current_user.full_name or current_user.username} بمتابعتك الآن.",
            metadata_={
                "follower_id": current_user.id,
                "follower_username": current_user.username,
                "follower_avatar": session.get(Profile, current_user.id).avatar_url if session.get(Profile, current_user.id) else None
            }
        )
        session.add(notif)
        session.commit()
        session.refresh(notif)
        
        # Broadcast real-time
        await manager.send_personal_message({
            "type": "NEW_NOTIFICATION",
            "notification": json.loads(notif.json())
        }, user_id)
        
        return {"is_following": True}
@router.get("/stats/{user_id}")
def get_profile_stats(
    user_id: str,
    session: Session = Depends(get_session)
):
    try:
        # Count total articles
        articles_count_stmt = select(func.count(Article.id)).where(Article.author_id == user_id, Article.status == "published")
        articles_count = session.exec(articles_count_stmt).one()
        
        # Count total likes received across all articles
        likes_received_stmt = select(func.count(ArticleLike.id)).join(Article, Article.id == ArticleLike.article_id).where(Article.author_id == user_id)
        likes_received = session.exec(likes_received_stmt).one()
        
        # Get user join date
        user = session.get(User, user_id)
        
        return {
            "articles_count": articles_count,
            "likes_received": likes_received,
            "created_at": user.created_at if user else None
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error fetching profile stats: {e}")
        return {
            "articles_count": 0,
            "likes_received": 0,
            "created_at": None
        }

@router.get("/{user_id}/followers", response_model=List[ProfileRead])
def get_followers(
    user_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    # Select users who follow user_id
    stmt = select(User).join(UserFollow, User.id == UserFollow.follower_id).where(UserFollow.followed_id == user_id)
    followers = session.exec(stmt).all()
    
    result = []
    for f_user in followers:
        profile = session.get(Profile, f_user.id)
        
        # Check if current user is following this follower
        is_following = False
        if current_user:
            check = session.exec(select(UserFollow).where(
                UserFollow.follower_id == current_user.id,
                UserFollow.followed_id == f_user.id
            )).first()
            is_following = check is not None
            
        followers_count = session.exec(select(func.count(UserFollow.follower_id)).where(UserFollow.followed_id == f_user.id)).one()
        following_count = session.exec(select(func.count(UserFollow.followed_id)).where(UserFollow.follower_id == f_user.id)).one()

        result.append(ProfileRead(
            id=f_user.id,
            username=f_user.username,
            email=f_user.email,
            full_name=f_user.full_name,
            bio=profile.bio if profile else None,
            avatar_url=profile.avatar_url if profile else None,
            avatar_public_id=profile.avatar_public_id if profile else None,
            role=f_user.role,
            is_admin=f_user.is_admin,
            created_at=f_user.created_at,
            followers_count=followers_count,
            following_count=following_count,
            is_following=is_following
        ))
    return result

@router.get("/{user_id}/following", response_model=List[ProfileRead])
def get_following(
    user_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    # Select users that user_id follows
    stmt = select(User).join(UserFollow, User.id == UserFollow.followed_id).where(UserFollow.follower_id == user_id)
    following = session.exec(stmt).all()
    
    result = []
    for f_user in following:
        profile = session.get(Profile, f_user.id)
        
        # Check if current user is following this user
        is_following = False
        if current_user:
            check = session.exec(select(UserFollow).where(
                UserFollow.follower_id == current_user.id,
                UserFollow.followed_id == f_user.id
            )).first()
            is_following = check is not None
            
        followers_count = session.exec(select(func.count(UserFollow.follower_id)).where(UserFollow.followed_id == f_user.id)).one()
        following_count = session.exec(select(func.count(UserFollow.followed_id)).where(UserFollow.follower_id == f_user.id)).one()

        result.append(ProfileRead(
            id=f_user.id,
            username=f_user.username,
            email=f_user.email,
            full_name=f_user.full_name,
            bio=profile.bio if profile else None,
            avatar_url=profile.avatar_url if profile else None,
            avatar_public_id=profile.avatar_public_id if profile else None,
            role=f_user.role,
            is_admin=f_user.is_admin,
            created_at=f_user.created_at,
            followers_count=followers_count,
            following_count=following_count,
            is_following=is_following
        ))
    return result

