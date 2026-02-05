from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select, desc, func
from typing import List, Optional
from app.db.session import get_session
from app.models.user import User
from app.models.notification import Notification, NotificationPreferences
from app.schemas.notification import NotificationPreferencesUpdate
from app.core.security import get_current_user, decode_token
from app.core.websocket import manager
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: Optional[str] = Query(None)
):
    """WebSocket endpoint for real-time notifications."""
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = decode_token(token)
        if payload.get("sub") != user_id:
            logger.warning(f"WS Auth failed: Token sub {payload.get('sub')} != user_id {user_id}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        await manager.connect(user_id, websocket)
        try:
            while True:
                # Keep connection alive and listen for client messages if needed
                data = await websocket.receive_text()
                # Potential handle client-side ping/pong or actions here
        except WebSocketDisconnect:
            manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(user_id, websocket)
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)

@router.get("/me")
def get_my_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    unread_only: bool = Query(False),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Fetch user notifications ordered by newest first."""
    statement = select(Notification).where(Notification.user_id == user.id)
    
    if unread_only:
        statement = statement.where(Notification.is_read == False)
        
    statement = statement.order_by(desc(Notification.created_at))
    
    # Pagination
    offset = (page - 1) * limit
    notifications = session.exec(statement.offset(offset).limit(limit)).all()
    
    # Total count
    total_statement = select(func.count()).select_from(Notification).where(Notification.user_id == user.id)
    if unread_only:
        total_statement = total_statement.where(Notification.is_read == False)
    total = session.exec(total_statement).one()
    
    # Unread count (always return total unread count)
    unread_total = session.exec(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user.id)
        .where(Notification.is_read == False)
    ).one()

    return {
        "items": notifications,
        "total": total,
        "unread_count": unread_total,
        "page": page,
        "limit": limit
    }

@router.patch("/preferences")
def update_notification_preferences(
    preferences_data: NotificationPreferencesUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update user notification preferences."""
    preferences = session.exec(
        select(NotificationPreferences).where(NotificationPreferences.user_id == user.id)
    ).first()
    
    if not preferences:
        # Should exist due to auto-creation, but handle just in case
        preferences = NotificationPreferences(user_id=user.id)
        session.add(preferences)
    
    data = preferences_data.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(preferences, key, value)
    
    session.add(preferences)
    session.commit()
    session.refresh(preferences)
    return preferences

@router.get("/preferences")
def get_notification_preferences(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get user notification preferences."""
    preferences = session.exec(
        select(NotificationPreferences).where(NotificationPreferences.user_id == user.id)
    ).first()
    
    if not preferences:
        preferences = NotificationPreferences(user_id=user.id)
        session.add(preferences)
        session.commit()
        session.refresh(preferences)
        
    return preferences

@router.post("/test")
async def create_test_notification(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create a test notification (development only)."""
    notification = Notification(
        user_id=user.id,
        type="system",
        title="إشعار تجريبي",
        message="هذا إشعار تجريبي للتأكد من عمل النظام بشكل صحيح.",
        metadata_={"test": True}
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    
    # Broadcast through WebSocket
    await manager.send_personal_message({
        "type": "NEW_NOTIFICATION",
        "notification": json.loads(notification.json())
    }, user.id)
    
    return notification

@router.patch("/{notification_id}/read")
async def mark_notification_as_read(
        notification_id: str,
        user: User = Depends(get_current_user),
        session: Session = Depends(get_session)
):
    """Mark a specific notification as read."""
    notification = session.exec(
        select(Notification)
        .where(Notification.id == notification_id)
        .where(Notification.user_id == user.id)
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.is_read = True
    session.add(notification)
    session.commit()
    
    # Optional: Sync unread count across tabs
    await manager.send_personal_message({
        "type": "NOTIFICATION_READ",
        "notification_id": notification_id
    }, user.id)
    
    return {"status": "success"}

    return {"status": "success", "count": len(unread_notifications)}

@router.patch("/read-all")
async def mark_all_notifications_as_read(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Mark all notifications for the current user as read."""
    unread_notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == user.id)
        .where(Notification.is_read == False)
    ).all()
    
    for notification in unread_notifications:
        notification.is_read = True
        session.add(notification)
        
    session.commit()
    
    # Optional: Sync state across tabs
    await manager.send_personal_message({
        "type": "ALL_NOTIFICATIONS_READ",
        "count": len(unread_notifications)
    }, user.id)
    
    return {"status": "success", "count": len(unread_notifications)}

@router.get("/unread-count")
def get_unread_count(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Quick check for unread notification count."""
    count = session.exec(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user.id)
        .where(Notification.is_read == False)
    ).one()
    return {"unread_count": count}

@router.post("/mark-all-read")
async def mark_all_read_alias(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Alias for mark_all_notifications_as_read using POST."""
    return await mark_all_notifications_as_read(user, session)

