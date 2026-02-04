import asyncio
import json
import logging
from datetime import datetime
from sqlmodel import select, Session

from app.db.session import engine
from app.models.user import User
from app.models.profile import Profile
from app.models.article import Article
from app.models.notification import Notification
from app.models.user_follow import UserFollow
from app.models.comment import Comment
from app.core.websocket import manager

logger = logging.getLogger(__name__)

def get_session_local():
    return Session(engine)

def notify_followers_task(article_id: str, author_id: str):
    """
    Background task to notify followers about a new article.
    Runs in a separate thread, opens a new DB session.
    """
    logger.info(f"Starting background notification for article {article_id}")
    with get_session_local() as session:
        try:
            article = session.get(Article, article_id)
            author = session.get(User, author_id)
            
            if not article or not author:
                logger.warning(f"Article {article_id} or Author {author_id} not found in background task")
                return

            followers = session.exec(select(UserFollow).where(UserFollow.followed_id == author.id)).all()
            author_profile = session.get(Profile, author.id)
            
            notifications_to_send = []
            
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
                notifications_to_send.append((f.follower_id, notif))
                
            # Send WebSockets
            async def send_ws():
                for user_id, notif in notifications_to_send:
                    await manager.send_personal_message({
                        "type": "NEW_NOTIFICATION",
                        "notification": json.loads(notif.json())
                    }, user_id)
            
            asyncio.run(send_ws())
            
        except Exception as e:
            logger.error(f"Error in notify_followers_task: {e}", exc_info=True)

def notify_comment_task(article_id: str, commenter_id: str, comment_id: str, content_preview: str):
    """
    Background task to notify author about a new comment.
    """
    with get_session_local() as session:
        try:
            article = session.get(Article, article_id)
            if not article: 
                return
            
            # Don't notify if author commented on their own article
            if article.author_id == commenter_id:
                return

            commenter = session.get(User, commenter_id)
            commenter_profile = session.get(Profile, commenter_id)
            commenter_name = commenter.full_name or commenter.username if commenter else "Unknown"
            
            new_notif = Notification(
                user_id=article.author_id,
                type="comment",
                title="تعليق جديد",
                message=f"علق {commenter_name} على مقالك: {content_preview}...",
                metadata_={
                    "article_id": article_id,
                    "article_title": article.title,
                    "comment_id": comment_id,
                    "commenter_id": commenter_id,
                    "commenter_name": commenter_name,
                    "commenter_avatar": commenter_profile.avatar_url if commenter_profile else None
                }
            )
            session.add(new_notif)
            session.commit()
            session.refresh(new_notif)
            
            async def send_ws():
                await manager.send_personal_message({
                    "type": "NEW_NOTIFICATION",
                    "notification": json.loads(new_notif.json())
                }, article.author_id)
            
            asyncio.run(send_ws())
            
        except Exception as e:
            logger.error(f"Error in notify_comment_task: {e}", exc_info=True)

def notify_like_task(article_id: str, liker_id: str):
    """
    Background task to notify author about a like.
    Handles grouping logic.
    """
    with get_session_local() as session:
        try:
            article = session.get(Article, article_id)
            if not article or article.author_id == liker_id:
                return

            # Grouping Logic
            existing_notif = session.exec(
                select(Notification).where(
                    Notification.user_id == article.author_id,
                    Notification.type == "like",
                    Notification.is_read == False,
                    Notification.metadata_["article_id"].astext == article_id
                )
            ).first()

            liker = session.get(User, liker_id)
            liker_profile = session.get(Profile, liker_id)
            liker_name = liker.full_name or liker.username if liker else "Unknown"
            
            notif_to_send = None

            if existing_notif:
                # Update existing notification for grouping
                count = existing_notif.metadata_.get("count", 1) + 1
                existing_notif.metadata_ = {
                    **existing_notif.metadata_,
                    "count": count,
                    "last_liker_id": liker_id,
                    "last_liker_name": liker_name,
                    "last_liker_avatar": liker_profile.avatar_url if liker_profile else None
                }
                existing_notif.message = f"{liker_name} و {count - 1} آخرون أعجبوا بمقالك: {article.title}"
                existing_notif.created_at = datetime.utcnow()
                session.add(existing_notif)
                session.commit()
                session.refresh(existing_notif)
                notif_to_send = existing_notif
            else:
                # Create new notification
                new_notif = Notification(
                    user_id=article.author_id,
                    type="like",
                    title="إعجاب جديد",
                    message=f"أعجب {liker_name} بمقالك: {article.title}",
                    metadata_={
                        "article_id": article_id,
                        "article_title": article.title,
                        "liker_id": liker_id,
                        "liker_name": liker_name,
                        "liker_avatar": liker_profile.avatar_url if liker_profile else None,
                        "count": 1
                    }
                )
                session.add(new_notif)
                session.commit()
                session.refresh(new_notif)
                notif_to_send = new_notif
            
            # Send WebSocket
            async def send_ws():
                await manager.send_personal_message({
                    "type": "NEW_NOTIFICATION",
                    "notification": json.loads(notif_to_send.json())
                }, article.author_id)
            
            asyncio.run(send_ws())

        except Exception as e:
            logger.error(f"Error in notify_like_task: {e}", exc_info=True)
