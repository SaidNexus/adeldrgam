from sqlmodel import SQLModel, Field, UniqueConstraint, Relationship
from typing import TYPE_CHECKING
from datetime import datetime
import uuid

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.article import Article

class ArticleLike(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "article_id"),)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    article_id: str = Field(foreign_key="article.id", ondelete="CASCADE", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="likes")
    article: "Article" = Relationship(back_populates="likes")
