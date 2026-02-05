from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, ForeignKey
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
import uuid

if TYPE_CHECKING:
    from app.models.user import User

class UserFollow(SQLModel, table=True):
    follower_id: str = Field(
        sa_column=Column(
            String,
            ForeignKey("user.id", ondelete="CASCADE"),
            primary_key=True
        )
    )
    followed_id: str = Field(
        sa_column=Column(
            String,
            ForeignKey("user.id", ondelete="CASCADE"),
            primary_key=True
        )
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FollowRead(SQLModel):
    follower_id: str
    followed_id: str
    created_at: datetime
