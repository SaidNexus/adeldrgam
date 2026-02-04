from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
import uuid
from pydantic import BaseModel, EmailStr, Field as PydanticField

if TYPE_CHECKING:
    from app.models.profile import Profile
    from app.models.article import Article
    from app.models.article_like import ArticleLike
    from app.models.comment import Comment
    from app.models.notification import Notification, NotificationPreferences
    from app.models.user_follow import UserFollow

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True)
    full_name: Optional[str] = None

class User(UserBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    role: str = Field(default="user") # user, publisher, admin
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})

    @property
    def is_superuser(self) -> bool:
        return self.is_admin or self.role == "admin"

    # Relationships
    profile: Optional["Profile"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={
            "uselist": False,
            "cascade": "all, delete-orphan"
        }
    )
    articles: List["Article"] = Relationship(
        back_populates="author",
        sa_relationship_kwargs={
            "foreign_keys": "[Article.author_id]",
            "cascade": "all, delete-orphan"
        }
    )
    comments: List["Comment"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    likes: List["ArticleLike"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    notifications: List["Notification"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    notification_preferences: Optional["NotificationPreferences"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={
            "uselist": False,
            "cascade": "all, delete-orphan"
        }
    )

    # Follow System
    followers: List["UserFollow"] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "User.id==UserFollow.followed_id",
            "backref": "followed",
            "cascade": "all, delete-orphan"
        }
    )
    following: List["UserFollow"] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "User.id==UserFollow.follower_id",
            "backref": "follower",
            "cascade": "all, delete-orphan"
        }
    )

class UserCreate(BaseModel):
    email: EmailStr
    username: str = PydanticField(min_length=3, max_length=50)
    password: str = PydanticField(min_length=8, max_length=72)
    full_name: Optional[str] = None
    
    @classmethod
    def validate_username(cls, v: str) -> str:
        return v.strip().lower()

    if TYPE_CHECKING:
        from pydantic import validator
    else:
        try:
            from pydantic import field_validator
            @field_validator("username")
            @classmethod
            def normalize_username(cls, v: str) -> str:
                return v.strip().lower()
        except ImportError:
            from pydantic import validator
            @validator("username")
            def normalize_username(cls, v: str) -> str:
                return v.strip().lower()

class UserLogin(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = PydanticField(min_length=8, max_length=72)
