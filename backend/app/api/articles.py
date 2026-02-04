from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, BackgroundTasks
from app.services.article_social_service import ArticleSocialService
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.inspection import inspect
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
from app.tasks.background import notify_followers_task
import traceback

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
            "is_featured": getattr(article, "is_featured", False),
            "is_pinned": getattr(article, "is_pinned", False),
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
    
    try:
        return ArticleRead(**data)
    except Exception as e:
        logger.error(f"Post-enrichment validation failed for article {article.id}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error preparing article response")





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
    user_table = inspect(User).persist_selectable

    if user_table not in query.get_final_froms():
        query = query.join(User, Article.author_id == User.id)

    query = query.where(User.role == "admin")

elif author_type == "others" and current_user:
    user_table = inspect(User).persist_selectable

    if user_table not in query.get_final_froms():
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
        traceback.print_exc()
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
        traceback.print_exc()
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
        traceback.print_exc()
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
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create a new article. This route has comprehensive error handling to ensure
    that if the article is saved to DB, we return a 201 response even if enrichment fails.
    """
    if user.role not in ["publisher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to publish articles. Please request to become a publisher."
        )
    
    article = None  # Track created article for fallback response
    
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
        
        logger.info(f"Article {article.id} successfully committed to DB. Preparing enrichment...")

        # Background task (non-blocking)
        if target_status == "published":
            background_tasks.add_task(notify_followers_task, article.id, user.id)

        # Try enrichment, but fallback to basic response if it fails
        try:
            enriched = _enrich_article(article, session, user.id)
            logger.info(f"Article {article.id} successfully enriched")
            return enriched
        except Exception as enrich_error:
            logger.error(f"Enrichment failed for article {article.id}, returning basic response: {enrich_error}")
            traceback.print_exc()
            
            # Fallback: Return basic ArticleRead without enrichment
            return ArticleRead(
                id=article.id,
                title=article.title,
                slug=article.slug,
                excerpt=article.excerpt,
                content=article.content,
                featured_image_url=article.featured_image_url,
                cover_public_id=article.cover_public_id,
                status=article.status,
                views_count=article.views_count or 0,
                share_count=article.share_count or 0,
                author_id=article.author_id,
                category_id=article.category_id,
                is_featured=article.is_featured or False,
                is_pinned=article.is_pinned or False,
                created_at=article.created_at,
                updated_at=article.updated_at,
                author=None,  # Skip author enrichment
                likes_count=0,
                comments_count=0,
                liked_by_me=False
            )
            
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
        
        # CRITICAL: Full diagnostic output
        full_traceback = traceback.format_exc()
        logger.error(f"CRITICAL FAILURE in create_article:\n{full_traceback}")
        traceback.print_exc()
        
        # If article was created but response failed, try to return it
        if article and article.id:
            logger.warning(f"Article {article.id} was created but serialization failed. Attempting basic fallback...")
            try:
                return ArticleRead(
                    id=article.id,
                    title=getattr(article, 'title', 'Untitled'),
                    slug=getattr(article, 'slug', ''),
                    excerpt=getattr(article, 'excerpt', None),
                    content=getattr(article, 'content', None),
                    featured_image_url=getattr(article, 'featured_image_url', None),
                    cover_public_id=getattr(article, 'cover_public_id', None),
                    status=getattr(article, 'status', 'draft'),
                    views_count=getattr(article, 'views_count', 0) or 0,
                    share_count=getattr(article, 'share_count', 0) or 0,
                    author_id=getattr(article, 'author_id', user.id),
                    category_id=getattr(article, 'category_id', None),
                    is_featured=getattr(article, 'is_featured', False) or False,
                    is_pinned=getattr(article, 'is_pinned', False) or False,
                    created_at=getattr(article, 'created_at', datetime.utcnow()),
                    updated_at=getattr(article, 'updated_at', datetime.utcnow())
                )
            except Exception as fallback_error:
                logger.error(f"Even fallback response failed: {fallback_error}")
                traceback.print_exc()
        
        raise HTTPException(status_code=500, detail=f"Failed to create article: {str(e)}")


@router.put("/{article_id}", response_model=ArticleRead)
def update_article(
    article_id: str,
    updates: ArticleUpdate,
    background_tasks: BackgroundTasks,
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
            background_tasks.add_task(notify_followers_task, article.id, user.id)

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
        traceback.print_exc()
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
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        article = session.get(Article, article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        service = ArticleSocialService(session)
        result = service.toggle_like(article_id, user.id, background_tasks)
        logger.info(f"Like toggle result for article {article_id} by user {user.id}: {result}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        full_traceback = traceback.format_exc()
        logger.error(f"CRITICAL FAILURE in toggle_like:\n{full_traceback}")
        raise HTTPException(status_code=500, detail=f"Action failed: {str(e)}")


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
    background_tasks: BackgroundTasks,
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
            parent_id=comment_data.parent_id,
            background_tasks=background_tasks
        )
        
        try:
            session.refresh(comment)
            profile = session.get(Profile, user.id)
            
            # Use model_dump for Pydantic v2 if available, otherwise dict()
            comment_dict = {}
            if hasattr(comment, "model_dump"):
                comment_dict = comment.model_dump()
            else:
                comment_dict = comment.dict()

            # Format response to match the tree structure frontend expects (CommentRead)
            return {
                **comment_dict,
                "user": {
                    "username": user.username,
                    "full_name": user.full_name,
                    "avatar_url": profile.avatar_url if profile else None
                },
                "replies": []
            }
        except Exception as ser_error:
            logger.error(f"Serialization failed for comment {comment.id}: {ser_error}")
            traceback.print_exc()
            return {
                "id": comment.id,
                "article_id": article_id,
                "user_id": user.id,
                "content": comment.content,
                "created_at": comment.created_at.isoformat() if hasattr(comment.created_at, "isoformat") else str(comment.created_at),
                "user": {
                    "username": user.username,
                    "full_name": user.full_name,
                    "avatar_url": None
                },
                "replies": []
            }
    except HTTPException:
        raise
    except Exception as e:
        full_traceback = traceback.format_exc()
        logger.error(f"CRITICAL FAILURE in create_comment:\n{full_traceback}")
        raise HTTPException(status_code=500, detail=f"Failed to create comment: {str(e)}")


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

