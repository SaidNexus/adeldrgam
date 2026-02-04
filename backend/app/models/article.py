from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy.dialects.postgresql import JSONB
from typing import Optional, Any, List, TYPE_CHECKING
from datetime import datetime
import uuid
from pydantic import ConfigDict

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.article_like import ArticleLike
    from app.models.comment import Comment

class CategoryBase(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    name_ar: str
    slug: str = Field(unique=True, index=True)
    description_ar: Optional[str] = None

class Category(CategoryBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)

class ArticleBase(SQLModel):
    title: str
    slug: str = Field(unique=True, index=True)
    excerpt: Optional[str] = None
    featured_image_url: Optional[str] = None
    cover_public_id: Optional[str] = None
    status: str = Field(default="published")
    views_count: int = Field(default=0)
    share_count: int = Field(default=0)
    is_featured: bool = Field(default=False)
    is_pinned: bool = Field(default=False)

class Article(ArticleBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    content: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    author_id: str = Field(foreign_key="user.id")
    category_id: Optional[str] = Field(default=None, foreign_key="category.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = Field(default=None)
    updated_by: Optional[str] = Field(default=None)

    author: "User" = Relationship(
        back_populates="articles",
        sa_relationship_kwargs={"foreign_keys": "[Article.author_id]"}
    )
    comments: List["Comment"] = Relationship(
        back_populates="article",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    likes: List["ArticleLike"] = Relationship(
        back_populates="article",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class ArticleView(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    article_id: str = Field(foreign_key="article.id", index=True)
    viewer_hash: str = Field(index=True)
    viewed_at: datetime = Field(default_factory=datetime.utcnow)

class ArticleCreate(SQLModel):
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: Optional[Any] = None
    featured_image_url: Optional[str] = None
    cover_public_id: Optional[str] = None
    status: Optional[str] = "draft"
    category_id: Optional[str] = None

    if TYPE_CHECKING:
        from pydantic import validator
    else:
        try:
            from pydantic import field_validator
            @field_validator("slug")
            @classmethod
            def normalize_slug_val(cls, v: Optional[str]) -> Optional[str]:
                if v:
                    return v.strip().lower()
                return v
        except ImportError:
            from pydantic import validator
            @validator("slug")
            def normalize_slug_val(cls, v: Optional[str]) -> Optional[str]:
                if v:
                    return v.strip().lower()
                return v

class ArticleUpdate(SQLModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[Any] = None
    featured_image_url: Optional[str] = None
    cover_public_id: Optional[str] = None
    status: Optional[str] = None
    category_id: Optional[str] = None

class AuthorInfo(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_following: bool = False

class ArticleRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: Optional[Any] = None
    featured_image_url: Optional[str] = None
    cover_public_id: Optional[str] = None
    status: str = "draft"
    views_count: int = 0
    share_count: int = 0
    author_id: str
    category_id: Optional[str] = None
    is_featured: bool = False
    is_pinned: bool = False
    created_at: datetime
    updated_at: datetime
    author: Optional[AuthorInfo] = None
    likes_count: int = 0
    comments_count: int = 0
    liked_by_me: bool = False
