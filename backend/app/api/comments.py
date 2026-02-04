from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
import logging

from app.db.session import get_session
from app.models.user import User
from app.models.comment import CommentRead
from app.core.security import get_current_user
from app.services.comment_service import CommentService
from app.models.profile import Profile
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

class CommentUpdateRequest(BaseModel):
    content: str

@router.put("/{comment_id}", response_model=CommentRead)
def update_comment(
    comment_id: str,
    data: CommentUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        comment = CommentService.update_comment(
            session=session,
            comment_id=comment_id,
            new_content=data.content,
            current_user=current_user
        )
        
        profile = session.get(Profile, comment.user_id)
        return CommentRead(
            **comment.dict(),
            author_name=current_user.username,
            author_avatar=profile.avatar_url if profile else None,
            replies=[]
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Comment update API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{comment_id}")
def delete_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        CommentService.delete_comment(
            session=session,
            comment_id=comment_id,
            current_user=current_user
        )
        return {"message": "Comment deleted successfully", "id": comment_id}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Comment delete API failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
