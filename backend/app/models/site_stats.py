"""Site statistics model for visitor tracking."""
from sqlmodel import SQLModel, Field
from datetime import datetime


class SiteStats(SQLModel, table=True):
    """Stores site-wide statistics like visitor count."""
    __tablename__ = "site_stats"
    
    id: int = Field(default=None, primary_key=True)
    stat_key: str = Field(unique=True, index=True)  # e.g., "visitors_count"
    stat_value: int = Field(default=0)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
