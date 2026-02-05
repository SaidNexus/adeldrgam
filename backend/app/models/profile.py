from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime
import uuid
from sqlalchemy import Column, String, ForeignKey

if TYPE_CHECKING:
    from app.models.user import User

class ProfileBase(SQLModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None

class Profile(ProfileBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(
        sa_column=Column(
            String,
            ForeignKey("user.id", ondelete="CASCADE"),
            unique=True,
            index=True
        )
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship
    user: "User" = Relationship(back_populates="profile")
