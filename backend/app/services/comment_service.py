from datetime import datetime
from fastapi import HTTPException, status
from sqlmodel import Session, select
import logging

from app.models.comment import Comment
from app.models.article import Article
from app.models.user import User

logger = logging.getLogger(__name__)

class CommentService:
    @staticmethod
    def get_comment_or_404(session: Session, comment_id: str) -> Comment:
        comment = session.get(Comment, comment_id)
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        return comment

    @staticmethod
    def update_comment(session: Session, comment_id: str, new_content: str, current_user: User) -> Comment:
        try:
            comment = CommentService.get_comment_or_404(session, comment_id)
            
            # RULE: Only comment owner can edit
            if comment.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the author can edit this comment"
                )

            if getattr(comment, "is_deleted", False):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot edit a deleted comment"
                )
            
            comment.content = new_content
            comment.updated_at = datetime.utcnow()
            
            session.add(comment)
            session.commit()
            session.refresh(comment)
            return comment
        except HTTPException:
            raise
        except Exception as e:
            session.rollback()
            logger.error(f"Comment update failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to update comment")

    @staticmethod
    def delete_comment(session: Session, comment_id: str, current_user: User) -> Comment:
        try:
            comment = CommentService.get_comment_or_404(session, comment_id)
            article = session.get(Article, comment.article_id)
            
            # PERMISSION MATRIX:
            # - Comment Owner: YES
            # - Article Author: YES
            # - Admin: YES
            is_owner = comment.user_id == current_user.id
            is_article_author = article and article.author_id == current_user.id
            is_admin = current_user.is_admin
            
            if not (is_owner or is_article_author or is_admin):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to delete this comment"
                )
            
            # Soft delete if column exists, else hard delete
            if hasattr(Comment, "is_deleted"):
                comment.is_deleted = True
                comment.content = "[تم حذف هذا التعليق]"
                comment.updated_at = datetime.utcnow()
                session.add(comment)
            else:
                session.delete(comment)
                
            session.commit()
            if hasattr(Comment, "is_deleted"):
                session.refresh(comment)
            return comment
        except HTTPException:
            raise
        except Exception as e:
            session.rollback()
            logger.error(f"Comment delete failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete comment")
