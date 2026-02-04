from typing import List, Optional
from sqlmodel import Session, select, func
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import hashlib
import logging

from app.models.article import Article, ArticleView
from app.models.article_like import ArticleLike
from app.models.comment import Comment
from app.models.user import User
from app.models.profile import Profile
from app.models.notification import Notification
from app.api.notifications import manager
import json

logger = logging.getLogger(__name__)


class ArticleSocialService:
    def __init__(self, session: Session):
        self.session = session

    def _generate_viewer_hash(self, article_id: str, user_id: Optional[str], ip_address: Optional[str]) -> str:
        base = f"{article_id}:{user_id or 'anon'}:{ip_address or 'unknown'}"
        return hashlib.sha256(base.encode()).hexdigest()

    def increment_views(
        self,
        article: Article,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        try:
            viewer_hash = self._generate_viewer_hash(article.id, user_id, ip_address)
            cooldown_time = datetime.utcnow() - timedelta(minutes=10)
            
            recent_view = self.session.exec(
                select(ArticleView).where(
                    ArticleView.article_id == article.id,
                    ArticleView.viewer_hash == viewer_hash,
                    ArticleView.viewed_at > cooldown_time
                )
            ).first()
            
            if recent_view:
                return False
            
            article.views_count = (article.views_count or 0) + 1
            self.session.add(article)
            
            view_record = ArticleView(
                article_id=article.id,
                viewer_hash=viewer_hash,
                viewed_at=datetime.utcnow()
            )
            self.session.add(view_record)
            
            self.session.commit()
            self.session.refresh(article)
            return True
        except Exception as e:
            logger.warning(f"View increment failed: {e}")
            self.session.rollback()
            return False

    def increment_shares(self, article_id: str) -> dict:
        try:
            article = self.session.get(Article, article_id)
            if not article:
                return {"success": False, "share_count": 0}
            
            article.share_count = (article.share_count or 0) + 1
            self.session.add(article)
            self.session.commit()
            self.session.refresh(article)
            
            return {
                "success": True,
                "share_count": article.share_count
            }
        except Exception as e:
            logger.error(f"Share increment failed: {e}")
            self.session.rollback()
            return {"success": False, "share_count": 0}

    def toggle_like(self, article_id: str, user_id: str) -> dict:
        try:
            statement = select(ArticleLike).where(
                ArticleLike.article_id == article_id,
                ArticleLike.user_id == user_id
            )
            existing_like = self.session.exec(statement).first()

            if existing_like:
                self.session.delete(existing_like)
                liked = False
            else:
                new_like = ArticleLike(article_id=article_id, user_id=user_id)
                self.session.add(new_like)
                liked = True
            
            if liked:
                article = self.session.get(Article, article_id)
                if article and article.author_id != user_id:
                    # Notification Logic with Grouping
                    existing_notif = self.session.exec(
                        select(Notification).where(
                            Notification.user_id == article.author_id,
                            Notification.type == "like",
                            Notification.is_read == False,
                            Notification.metadata_["article_id"].astext == article_id
                        )
                    ).first()

                    liker = self.session.get(User, user_id)
                    liker_profile = self.session.get(Profile, user_id)
                    liker_name = liker.full_name or liker.username
                    
                    if existing_notif:
                        # Update existing notification for grouping
                        count = existing_notif.metadata_.get("count", 1) + 1
                        existing_notif.metadata_ = {
                            **existing_notif.metadata_,
                            "count": count,
                            "last_liker_id": user_id,
                            "last_liker_name": liker_name,
                            "last_liker_avatar": liker_profile.avatar_url if liker_profile else None
                        }
                        existing_notif.message = f"{liker_name} و {count - 1} آخرون أعجبوا بمقالك: {article.title}"
                        existing_notif.created_at = datetime.utcnow()
                        self.session.add(existing_notif)
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
                                "liker_id": user_id,
                                "liker_name": liker_name,
                                "liker_avatar": liker_profile.avatar_url if liker_profile else None,
                                "count": 1
                            }
                        )
                        self.session.add(new_notif)
                        self.session.commit()
                        self.session.refresh(new_notif)
                        notif_to_send = new_notif
                    
                    # Broadcast real-time
                    import asyncio
                    asyncio.create_task(manager.send_personal_message({
                        "type": "NEW_NOTIFICATION",
                        "notification": json.loads(notif_to_send.json())
                    }, article.author_id))

            self.session.commit()
            
            count_stmt = select(func.count()).select_from(ArticleLike).where(ArticleLike.article_id == article_id)
            likes_count = self.session.exec(count_stmt).one()
            
            return {
                "liked": liked,
                "likes_count": likes_count
            }
        except IntegrityError:
            self.session.rollback()
            count_stmt = select(func.count()).select_from(ArticleLike).where(ArticleLike.article_id == article_id)
            likes_count = self.session.exec(count_stmt).one()
            return {"liked": True, "likes_count": likes_count}
        except Exception as e:
            logger.error(f"Like toggle failed: {e}")
            self.session.rollback()
            return {"liked": False, "likes_count": 0}

    def get_article_stats(self, article_id: str, user_id: Optional[str] = None) -> dict:
        try:
            likes_count_stmt = select(func.count()).select_from(ArticleLike).where(ArticleLike.article_id == article_id)
            comments_count_stmt = select(func.count()).select_from(Comment).where(
                Comment.article_id == article_id,
                func.coalesce(Comment.is_deleted, False) == False
            )
            
            likes_count = self.session.exec(likes_count_stmt).one()
            comments_count = self.session.exec(comments_count_stmt).one()
            
            article = self.session.get(Article, article_id)
            views_count = getattr(article, 'views_count', 0) or 0
            share_count = getattr(article, 'share_count', 0) or 0
            
            liked_by_me = False
            if user_id:
                liked_stmt = select(ArticleLike).where(
                    ArticleLike.article_id == article_id,
                    ArticleLike.user_id == user_id
                )
                liked_by_me = self.session.exec(liked_stmt).first() is not None
                
            return {
                "likes_count": likes_count,
                "comments_count": comments_count,
                "views_count": views_count,
                "share_count": share_count,
                "liked_by_me": liked_by_me
            }
        except Exception as e:
            logger.error(f"Error fetching article stats: {e}")
            return {
                "likes_count": 0, "comments_count": 0, "views_count": 0, "share_count": 0, "liked_by_me": False
            }

    def create_comment(
        self,
        article_id: str,
        user_id: str,
        content: str,
        parent_id: Optional[str] = None
    ) -> Comment:
        try:
            now = datetime.utcnow()
            comment = Comment(
                article_id=article_id,
                user_id=user_id,
                content=content,
                parent_id=parent_id,
                created_at=now,
                updated_at=now,
                is_deleted=False
            )
            self.session.add(comment)
            self.session.commit()
            self.session.refresh(comment)

            # Notification Logic
            article = self.session.get(Article, article_id)
            if article and article.author_id != user_id:
                commenter = self.session.get(User, user_id)
                commenter_profile = self.session.get(Profile, user_id)
                commenter_name = commenter.full_name or commenter.username
                
                new_notif = Notification(
                    user_id=article.author_id,
                    type="comment",
                    title="تعليق جديد",
                    message=f"علق {commenter_name} على مقالك: {content[:50]}...",
                    metadata_={
                        "article_id": article_id,
                        "article_title": article.title,
                        "comment_id": comment.id,
                        "commenter_id": user_id,
                        "commenter_name": commenter_name,
                        "commenter_avatar": commenter_profile.avatar_url if commenter_profile else None
                    }
                )
                self.session.add(new_notif)
                self.session.commit()
                self.session.refresh(new_notif)
                
                # Broadcast real-time
                import asyncio
                asyncio.create_task(manager.send_personal_message({
                    "type": "NEW_NOTIFICATION",
                    "notification": json.loads(new_notif.json())
                }, article.author_id))

            return comment
        except Exception as e:
            logger.error(f"Comment creation failed: {e}")
            self.session.rollback()
            raise

    def get_comments_tree(self, article_id: str) -> List[dict]:
        try:
            statement = select(Comment).where(
                Comment.article_id == article_id,
                func.coalesce(Comment.is_deleted, False) == False
            ).order_by(Comment.created_at.asc())
            
            comments = self.session.exec(statement).all()
            
            comment_map = {}
            tree = []
            
            for comment in comments:
                user = self.session.get(User, comment.user_id)
                profile = self.session.get(Profile, comment.user_id)
                
                comment_data = {
                    "id": comment.id,
                    "article_id": comment.article_id,
                    "content": comment.content,
                    "created_at": comment.created_at.isoformat() if comment.created_at else None,
                    "user_id": comment.user_id,
                    "parent_id": comment.parent_id,
                    "user": {
                        "username": user.username if user else "Unknown",
                        "full_name": user.full_name if user else None,
                        "avatar_url": profile.avatar_url if profile else None
                    },
                    "replies": []
                }
                comment_map[comment.id] = comment_data
                
            for comment_id, data in comment_map.items():
                parent_id = data.get("parent_id")
                if parent_id and parent_id in comment_map:
                    comment_map[parent_id]["replies"].append(data)
                else:
                    tree.append(data)
                    
            return tree
        except Exception as e:
            logger.error(f"Error building comment tree: {e}")
            return []
