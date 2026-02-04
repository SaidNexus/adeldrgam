from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
import uuid

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.article import Article

class Comment(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    article_id: str = Field(foreign_key="article.id", index=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    parent_id: Optional[str] = Field(default=None, foreign_key="comment.id", index=True)
    content: str
    is_deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="comments")
    article: "Article" = Relationship(back_populates="comments")
    parent: Optional["Comment"] = Relationship(
        back_populates="replies",
        sa_relationship_kwargs={"remote_side": "Comment.id"}
    )
    replies: List["Comment"] = Relationship(back_populates="parent")

class CommentCreate(SQLModel):
    content: str
    parent_id: Optional[str] = None

class CommentRead(SQLModel):
    id: str
    article_id: str
    user_id: str
    parent_id: Optional[str]
    content: str
    created_at: datetime
    author_name: str
    author_avatar: Optional[str]
    replies: List["CommentRead"] = []
