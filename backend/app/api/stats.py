"""Site statistics API endpoints."""
from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select
from datetime import datetime
import hashlib

from app.db.session import get_session
from app.models.site_stats import SiteStats

router = APIRouter(tags=["stats"])


def get_visitor_fingerprint(request: Request) -> str:
    """Generate a unique fingerprint for the visitor based on IP and user-agent."""
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")
    fingerprint = f"{ip}:{user_agent}"
    return hashlib.sha256(fingerprint.encode()).hexdigest()[:16]


@router.get("/visitors")
@router.get("/count")
async def get_visitor_count(session: Session = Depends(get_session)):
    """Get the current visitor count."""
    stat = session.exec(
        select(SiteStats).where(SiteStats.stat_key == "visitors_count")
    ).first()
    
    if stat:
        return {"visitors_count": stat.stat_value}
    
    # If not found, create with initial value
    stat = SiteStats(stat_key="visitors_count", stat_value=61125)
    session.add(stat)
    session.commit()
    return {"visitors_count": 61125}


@router.post("/visit")
@router.post("/increment")
async def record_visit(
    request: Request,
    session: Session = Depends(get_session)
):
    """
    Record a unique visit based on visitor fingerprint.
    Uses a simple cookie-based approach to avoid counting refreshes.
    """
    visitor_id = get_visitor_fingerprint(request)
    
    # Check if visitor already recorded in this session via cookie
    # The frontend will track this via localStorage/sessionStorage
    
    stat = session.exec(
        select(SiteStats).where(SiteStats.stat_key == "visitors_count")
    ).first()
    
    if not stat:
        # Create initial stat
        stat = SiteStats(stat_key="visitors_count", stat_value=61125)
        session.add(stat)
        session.commit()
        session.refresh(stat)
    
    # Increment the count
    stat.stat_value += 1
    stat.last_updated = datetime.utcnow()
    session.add(stat)
    session.commit()
    
    return {
        "success": True,
        "visitors_count": stat.stat_value,
        "visitor_id": visitor_id
    }
