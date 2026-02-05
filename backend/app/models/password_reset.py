from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
import uuid


class PasswordResetToken(SQLModel, table=True):
    """Stores hashed password reset tokens."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(index=True)
    expires_at: datetime
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
