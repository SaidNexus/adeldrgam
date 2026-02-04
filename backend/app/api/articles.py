from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime
import logging
import json

from app.db.session import get_session
from app.models.article import Article, ArticleCreate, ArticleUpdate, ArticleRead, AuthorInfo, ArticleView
from app.models.user import User
from app.models.profile import Profile
from app.models.comment import Comment, CommentCreate, CommentRead
from app.models.article_like import ArticleLike
from app.core.security import get_current_user, get_current_user_optional
from app.core.cloudinary import delete_image_from_cloudinary
from app.core.slug_utils import generate_unique_slug
from app.services.article_social_service import ArticleSocialService
from app.models.notification import Notification
from app.models.user_follow import UserFollow
from app.api.notifications import manager
import json
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter()


def _safe_get_stats(session: Session, article_id: str, user_id: Optional[str], article: Article) -> dict:
    """Get social stats safely - never throws"""
    try:
        service = ArticleSocialService(session)
        return service.get_article_stats(article_id, user_id)
    except Exception as e:
        logger.warning(f"Stats fetch failed for {article_id}: {e}")
        return {
            "likes_count": 0,
            "comments_count": 0,
            "views_count": getattr(article, "views_count", 0) or 0,
            "share_count": getattr(article, "share_count", 0) or 0,
            "liked_by_me": False
        }


def _safe_get_author(session: Session, author_id: str, current_user_id: Optional[str], hide_bio_for_owner: bool) -> AuthorInfo:
    """Get author info safely - never throws"""
    try:
        author = session.get(User, author_id)
        profile = session.get(Profile, author_id)
        
        show_bio = True
        if hide_bio_for_owner and current_user_id and current_user_id == author_id:
            show_bio = False
        
        is_following = False
        if current_user_id:
            from app.models.user_follow import UserFollow
            check = session.exec(select(UserFollow).where(
                UserFollow.follower_id == current_user_id,
                UserFollow.followed_id == author_id
            )).first()
            is_following = check is not None

        return AuthorInfo(
            id=author.id if author else "",
            username=author.username if author else "Unknown",
            full_name=author.full_name if author else None,
            avatar_url=profile.avatar_url if profile else None,
            bio=(profile.bio if profile and show_bio else None),
            is_following=is_following
        )
    except Exception as e:
        logger.warning(f"Author fetch failed for {author_id}: {e}")
        return AuthorInfo(id=author_id or "", username="Unknown", full_name=None, avatar_url=None, bio=None)


def _enrich_article(
    article: Article, 
    session: Session, 
    current_user_id: Optional[str] = None,
    hide_bio_for_owner: bool = False
) -> ArticleRead:
    """Enrich article - bulletproof, never throws 500"""
    stats = _safe_get_stats(session, article.id, current_user_id, article)
    author_info = _safe_get_author(session, article.author_id, current_user_id, hide_bio_for_owner)
    
    try:
        data = article.dict()
    except Exception:
        data = {
            "id": article.id,
            "title": getattr(article, "title", ""),
            "slug": getattr(article, "slug", ""),
            "excerpt": getattr(article, "excerpt", None),
            "content": getattr(article, "content", None),
            "featured_image_url": getattr(article, "featured_image_url", None),
            "cover_public_id": getattr(article, "cover_public_id", None),
            "status": getattr(article, "status", "published"),
            "views_count": getattr(article, "views_count", 0) or 0,
            "share_count": getattr(article, "share_count", 0) or 0,
            "author_id": getattr(article, "author_id", ""),
            "category_id": getattr(article, "category_id", None),
            "created_at": getattr(article, "created_at", datetime.utcnow()),
            "updated_at": getattr(article, "updated_at", datetime.utcnow()),
        }
    
    data.update({
        "author": author_info,
        "likes_count": stats.get("likes_count", 0),
        "comments_count": stats.get("comments_count", 0),
        "views_count": stats.get("views_count", 0),
        "share_count": stats.get("share_count", 0),
        "liked_by_me": stats.get("liked_by_me", False)
    })
    
    return ArticleRead(**data)


async def _notify_followers(article: Article, author: User, session: Session):
    """Notify all followers about a new article"""
    try:
        followers = session.exec(select(UserFollow).where(UserFollow.followed_id == author.id)).all()
        author_profile = session.get(Profile, author.id)
        for f in followers:
            notif = Notification(
                user_id=f.follower_id,
                type="new_article",
                title="مقال جديد",
                message=f"نشر {author.full_name or author.username} مقالاً جديداً: {article.title}",
                metadata_={
                    "article_id": article.id,
                    "article_slug": article.slug,
                    "article_title": article.title,
                    "author_id": author.id,
                    "author_name": author.full_name or author.username,
                    "author_avatar": author_profile.avatar_url if author_profile else None
                }
            )
            session.add(notif)
            session.commit()
            session.refresh(notif)
            
            # Broadcast real-time
            await manager.send_personal_message({
                "type": "NEW_NOTIFICATION",
                "notification": json.loads(notif.json())
            }, f.follower_id)
    except Exception as e:
        logger.error(f"Error notifying followers: {e}")


@router.get("", response_model=List[ArticleRead])
def get_articles(
    status: Optional[str] = Query("published"),
    author_type: Optional[str] = Query(None),
    author_id: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    category_slug: Optional[str] = Query(None),
    is_pinned: Optional[bool] = Query(None),
    is_featured: Optional[bool] = Query(None),
    feed_type: Optional[str] = Query("for_you"), # for_you, following
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    try:
        query = select(Article)
        
        # 1. Filtering by status
        if status:
            query = query.where(Article.status == status)
            
        # 2. Filtering by category (ID or Slug)
        if category_id:
            query = query.where(Article.category_id == category_id)
        elif category_slug:
            from app.models.article import Category
            query = query.join(Category, Article.category_id == Category.id)
            query = query.where(Category.slug == category_slug)
            
        # 3. Feed Logic (For You vs Following)
        if feed_type == "following" and current_user:
            from app.models.user_follow import UserFollow
            # Get IDs of users the current user follows
            followed_ids_stmt = select(UserFollow.followed_id).where(UserFollow.follower_id == current_user.id)
            query = query.where(Article.author_id.in_(followed_ids_stmt))
            
        # 4. Filtering by Author (Specific ID or Type)
        if author_id:
            query = query.where(Article.author_id == author_id)
        elif author_type == "admin":
            if User not in [t.entity_namespace for t in query.get_final_froms()]:
                query = query.join(User, Article.author_id == User.id)
            query = query.where(User.role == "admin")
        elif author_type == "others" and current_user:
            if User not in [t.entity_namespace for t in query.get_final_froms()]:
                query = query.join(User, Article.author_id == User.id)
            query = query.where(Article.author_id != current_user.id)
            query = query.where(User.role != "admin")
        
        # 4. Filtering by Pinned/Featured
        if is_pinned is not None:
            query = query.where(Article.is_pinned == is_pinned)
        if is_featured is not None:
            query = query.where(Article.is_featured == is_featured)
        
        query = query.offset(offset).limit(limit).order_by(Article.created_at.desc())
        articles = session.exec(query).all()
        user_id = current_user.id if current_user else None
        return [_enrich_article(a, session, user_id, hide_bio_for_owner=True) for a in articles]
    except Exception as e:
        logger.error(f"Error fetching articles: {e}", exc_info=True)
        return []


@router.get("/id/{article_id}", response_model=ArticleRead)
def get_article_by_id(
    article_id: str,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    article = session.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    user_id = current_user.id if current_user else None
    return _enrich_article(article, session, user_id, hide_bio_for_owner=True)


@router.get("/my", response_model=List[ArticleRead])
def get_my_articles(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    try:
        query = select(Article).where(Article.author_id == user.id).order_by(Article.created_at.desc())
        articles = session.exec(query).all()
        return [_enrich_article(a, session, user.id) for a in articles]
    except Exception as e:
        logger.error(f"Error in get_my_articles: {e}")
        return []


@router.get("/liked", response_model=List[ArticleRead])
def get_liked_articles(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    try:
        # Join Article with ArticleLike to find articles the user liked
        query = select(Article).join(ArticleLike, Article.id == ArticleLike.article_id).where(ArticleLike.user_id == user.id).order_by(ArticleLike.created_at.desc())
        articles = session.exec(query).all()
        return [_enrich_article(a, session, user.id) for a in articles]
    except Exception as e:
        logger.error(f"Error in get_liked_articles: {e}")
        return []

@router.get("/{slug}", response_model=ArticleRead)
def get_article_by_slug(
    slug: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get single article - BULLETPROOF - never returns 500"""
    article = None
    user_id = None
    
    try:
        user_id = current_user.id if current_user else None
    except Exception:
        user_id = None
    
    try:
        slug_normalized = (slug or "").strip().lower()
        article = session.exec(select(Article).where(Article.slug == slug_normalized)).first()
    except Exception as e:
        logger.error(f"Article query failed for {slug}: {e}")
        raise HTTPException(status_code=404, detail="Article not found")
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    try:
        if article.status != "published":
            is_owner = user_id and article.author_id == user_id
            is_admin = current_user and getattr(current_user, 'is_admin', False)
            if not is_owner and not is_admin:
                raise HTTPException(status_code=404, detail="Article not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Permission check failed for {slug}: {e}")
    
    try:
        service = ArticleSocialService(session)
        client_ip = request.client.host if request.client else None
        service.increment_views(article, user_id, client_ip)
    except Exception as ve:
        logger.warning(f"View increment failed for {slug}: {ve}")
    
    return _enrich_article(article, session, user_id, hide_bio_for_owner=True)


@router.post("", response_model=ArticleRead, status_code=status.HTTP_201_CREATED)
def create_article(
    article_data: ArticleCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role not in ["publisher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to publish articles. Please request to become a publisher."
        )
    try:
        # Validate category_id if provided
        if article_data.category_id:
            from app.models.article import Category
            category = session.get(Category, article_data.category_id)
            if not category:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid category selected. Category ID '{article_data.category_id}' does not exist."
                )
        
        slug_base = article_data.slug or article_data.title
        target_status = article_data.status or "draft"
        slug = generate_unique_slug(session, slug_base, status=target_status)
        
        content = article_data.content
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except:
                pass

        article = Article(
            **article_data.dict(exclude={"content", "slug"}),
            author_id=user.id,
            content=content,
            slug=slug,
            created_by=user.id,
            views_count=0,
            share_count=0
        )
        
        session.add(article)
        session.commit()
        session.refresh(article)

        if target_status == "published":
            asyncio.create_task(_notify_followers(article, user, session))

        return _enrich_article(article, session, user.id)
    except HTTPException:
        raise
    except IntegrityError as e:
        session.rollback()
        error_str = str(e.orig).lower() if e.orig else str(e).lower()
        logger.error(f"Integrity Error creating article: {e}")
        
        # Distinguish between slug and FK errors
        if "category_id" in error_str or "foreign key" in error_str:
            raise HTTPException(status_code=400, detail="Invalid category selected")
        elif "slug" in error_str or "unique" in error_str:
            raise HTTPException(status_code=400, detail="Slug already exists. Please choose a different title.")
        else:
            raise HTTPException(status_code=400, detail="Data integrity error")
    except Exception as e:
        session.rollback()
        logger.error(f"Creation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create article")


@router.put("/{article_id}", response_model=ArticleRead)
def update_article(
    article_id: str,
    updates: ArticleUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        if article.author_id != user.id and user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_dict = updates.dict(exclude_unset=True)
        
        # Validate category_id if being updated
        if "category_id" in update_dict and update_dict["category_id"]:
            from app.models.article import Category
            category = session.get(Category, update_dict["category_id"])
            if not category:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid category selected. Category ID '{update_dict['category_id']}' does not exist."
                )
        
        # Handle slug update if title or slug changes
        target_status = update_dict.get("status") or article.status
        if "slug" in update_dict or "title" in update_dict:
            new_slug_base = update_dict.get("slug") or update_dict.get("title") or article.title
            article.slug = generate_unique_slug(session, new_slug_base, exclude_id=article_id, status=target_status)

        old_status = article.status
        for key, value in update_dict.items():
            if key == "slug": continue # Already handled
            
            # Guard: Only admin can change is_pinned or is_featured
            if key in ["is_pinned", "is_featured"] and user.role != "admin":
                continue
                
            if key == "content" and isinstance(value, str):
                try:
                    value = json.loads(value)
                except:
                    pass
            setattr(article, key, value)

        article.updated_at = datetime.utcnow()
        article.updated_by = user.id
        
        session.add(article)
        session.commit()
        session.refresh(article)

        if old_status != "published" and article.status == "published":
            asyncio.create_task(_notify_followers(article, user, session))

        return _enrich_article(article, session, user.id)
    except HTTPException:
        raise
    except IntegrityError as e:
        session.rollback()
        error_str = str(e.orig).lower() if e.orig else str(e).lower()
        logger.error(f"Integrity Error updating article: {e}")
        
        if "category_id" in error_str or "foreign key" in error_str:
            raise HTTPException(status_code=400, detail="Invalid category selected")
        elif "slug" in error_str or "unique" in error_str:
            raise HTTPException(status_code=400, detail="Slug already exists. Please choose a different title.")
        else:
            raise HTTPException(status_code=400, detail="Data integrity error")
    except Exception as e:
        session.rollback()
        logger.error(f"Update failed: {e}")
        raise HTTPException(status_code=500, detail="Update failed")


@router.delete("/{article_id}")
def delete_article(
    article_id: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        if article.author_id != user.id and user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if article.cover_public_id:
            try:
                delete_image_from_cloudinary(article.cover_public_id)
            except:
                pass
        
        try:
            views = session.exec(select(ArticleView).where(ArticleView.article_id == article_id)).all()
            for v in views:
                session.delete(v)
        except:
            pass
        
        try:
            likes = session.exec(select(ArticleLike).where(ArticleLike.article_id == article_id)).all()
            for l in likes:
                session.delete(l)
        except:
            pass
        
        try:
            comments = session.exec(select(Comment).where(Comment.article_id == article_id)).all()
            for c in comments:
                session.delete(c)
        except:
            pass
        
        session.delete(article)
        session.commit()
        return {"message": "Deleted", "id": article_id}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Deletion failed: {e}")
        raise HTTPException(status_code=500, detail="Delete failed")


@router.post("/{article_id}/like")
def toggle_like(
    article_id: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        service = ArticleSocialService(session)
        return service.toggle_like(article_id, user.id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Like failed: {e}")
        raise HTTPException(status_code=500, detail="Action failed")


@router.post("/{article_id}/view")
def increment_view(
    article_id: str,
    request: Request,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    try:
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        service = ArticleSocialService(session)
        user_id = current_user.id if current_user else None
        client_ip = request.client.host if request.client else None
        counted = service.increment_views(article, user_id, client_ip)
        
        return {"counted": counted, "views_count": article.views_count or 0}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"View increment failed: {e}")
        return {"counted": False, "views_count": 0}


@router.post("/{article_id}/share")
def increment_share(
    article_id: str,
    session: Session = Depends(get_session)
):
    try:
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        service = ArticleSocialService(session)
        return service.increment_shares(article_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Share failed: {e}")
        return {"success": False, "share_count": 0}


@router.post("/{article_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def create_comment(
    article_id: str,
    comment_data: CommentCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        if comment_data.parent_id:
            parent = session.get(Comment, comment_data.parent_id)
            if not parent or parent.article_id != article_id or parent.is_deleted:
                raise HTTPException(status_code=400, detail="Invalid parent")
            
        service = ArticleSocialService(session)
        comment = service.create_comment(
            article_id=article_id,
            user_id=user.id,
            content=comment_data.content,
            parent_id=comment_data.parent_id
        )
        
        profile = session.get(Profile, user.id)
        return CommentRead(
            **comment.dict(),
            author_name=user.username,
            author_avatar=profile.avatar_url if profile else None,
            replies=[]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comment creation failed: {e}")
        raise HTTPException(status_code=500, detail="Comment failed")


@router.get("/{article_id}/comments")
def get_article_comments(article_id: str, session: Session = Depends(get_session)):
    try:
        article = session.get(Article, article_id)
        if not article:
            return []
        service = ArticleSocialService(session)
        return service.get_comments_tree(article_id)
    except Exception as e:
        logger.error(f"Comment fetch failed: {e}")
        return []
@router.patch("/{article_id}/status")
def update_article_status(
    article_id: str,
    status: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update article status")
    
    db_article = session.get(Article, article_id)
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    db_article.status = status
    session.add(db_article)
    session.commit()
    return {"message": f"Article status updated to {status}", "status": status}
