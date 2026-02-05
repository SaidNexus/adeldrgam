from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from pydantic import ConfigDict

if TYPE_CHECKING:
    from app.models.user import User

class ProfileUpdate(SQLModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_public_id: Optional[str] = None
    full_name: Optional[str] = None
    username: Optional[str] = None

class ProfileBase(SQLModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_public_id: Optional[str] = None

class Profile(ProfileBase, table=True):
    id: str = Field(foreign_key="user.id", ondelete="CASCADE", primary_key=True)
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_public_id: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="profile")


class ProfileRead(ProfileBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    username: str
    email: str
    full_name: Optional[str]
    role: str
    is_admin: bool = False
    created_at: datetime
    followers_count: int = 0
    following_count: int = 0
    is_following: Optional[bool] = None

class UserListResponse(SQLModel):
    users: list[ProfileRead]
    total: int
    limit: int
    offset: int
