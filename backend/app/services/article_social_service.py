from typing import List, Optional, Any
from fastapi import BackgroundTasks
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
from app.tasks.background import notify_comment_task, notify_like_task

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

    def toggle_like(self, article_id: str, user_id: str, background_tasks: Optional[BackgroundTasks] = None) -> dict:
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
            
            if liked and background_tasks:
                background_tasks.add_task(notify_like_task, article_id, user_id)

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
        parent_id: Optional[str] = None,
        background_tasks: Optional[BackgroundTasks] = None
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

            if background_tasks:
                 background_tasks.add_task(notify_comment_task, article_id, user_id, comment.id, content[:50])

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
