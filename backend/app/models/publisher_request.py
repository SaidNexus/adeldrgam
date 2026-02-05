from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
import uuid

if TYPE_CHECKING:
    from app.models.user import User

class PublisherRequest(SQLModel, table=True):
    __tablename__ = "publisher_requests"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    status: str = Field(default="pending") # pending, approved, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = Field(default=None, foreign_key="user.id", ondelete="SET NULL")

    # Relationships
    user: "User" = Relationship(sa_relationship_kwargs={"foreign_keys": "[PublisherRequest.user_id]"})
    reviewer: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "[PublisherRequest.reviewed_by]"})
