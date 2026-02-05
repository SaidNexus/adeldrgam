from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, ForeignKey
from typing import Optional, Any
from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import JSONB

class NotificationBase(SQLModel):
    user_id: str = Field(
        sa_column=Column(
            String,
            ForeignKey("user.id", ondelete="CASCADE"),
            index=True
        )
    )
    type: str = Field(index=True)  # e.g., "comment", "like", "system", "security"
    title: str
    message: str
    is_read: bool = Field(default=False)
    metadata_: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

class Notification(NotificationBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: Optional["User"] = Relationship(back_populates="notifications")

class NotificationPreferencesBase(SQLModel):
    user_id: str = Field(
        sa_column=Column(
            String,
            ForeignKey("user.id", ondelete="CASCADE"),
            unique=True,
            index=True
        )
    )
    email_notifications: bool = Field(default=True)
    in_app_notifications: bool = Field(default=True)
    marketing_notifications: bool = Field(default=False)
    security_notifications: bool = Field(default=True)

class NotificationPreferences(NotificationPreferencesBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": datetime.utcnow})
    
    # Relationships
    user: Optional["User"] = Relationship(back_populates="notification_preferences")
