from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from app.db.session import get_session
from app.models.user import User
from app.models.publisher_request import PublisherRequest
from app.core.security import get_current_user
from app.models.notification import Notification
from app.core.websocket import manager
import json

router = APIRouter()

@router.post("", status_code=status.HTTP_201_CREATED)
def create_publisher_request(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role in ["publisher", "admin"]:
        raise HTTPException(status_code=400, detail="User is already a publisher or admin")
    
    # Check for existing pending request
    existing = session.exec(
        select(PublisherRequest).where(
            PublisherRequest.user_id == user.id,
            PublisherRequest.status == "pending"
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request")
    
    db_request = PublisherRequest(user_id=user.id)
    session.add(db_request)
    session.commit()
    session.refresh(db_request)
    return db_request

@router.get("/me")
def get_my_publisher_request(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    request = session.exec(
        select(PublisherRequest)
        .where(PublisherRequest.user_id == user.id)
        .order_by(PublisherRequest.created_at.desc())
    ).first()
    
    if not request:
        return {"status": "none"}
    
    return request

@router.get("")
def list_publisher_requests(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can list requests")
    
    # Use scalar_select or simple select to avoid relationship overhead if any
    requests = session.exec(
        select(PublisherRequest)
        .where(PublisherRequest.status == "pending")
        .order_by(PublisherRequest.created_at.desc())
    ).all()
    
    result = []
    for req in requests:
        try:
            req_user = session.get(User, req.user_id)
            result.append({
                "id": str(req.id),
                "user_id": str(req.user_id),
                "username": req_user.username if req_user else "Unknown",
                "email": req_user.email if req_user else "Unknown",
                "status": str(req.status),
                "created_at": req.created_at.isoformat() if req.created_at else None
            })
        except Exception as e:
            print(f"Error processing request {req.id}: {e}")
            continue
            
    return result

@router.patch("/{request_id}/approve")
async def approve_publisher_request(
    request_id: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can approve requests")
    
    db_request = session.get(PublisherRequest, request_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if db_request.status != "pending":
        raise HTTPException(status_code=400, detail="Request is already processed")
    
    # Update request
    db_request.status = "approved"
    db_request.reviewed_at = datetime.utcnow()
    db_request.reviewed_by = user.id
    
    # Update user role
    target_user = session.get(User, db_request.user_id)
    if target_user:
        target_user.role = "publisher"
        session.add(target_user)
    
    session.add(db_request)
    
    # Create notification for target user
    notification = Notification(
        user_id=db_request.user_id,
        type="system",
        title="تم قبول طلب الانضمام",
        message="تهانينا! تم قبول طلبك لتصبح ناشراً في منصة نبض.",
        metadata_={"request_id": request_id, "action": "approved"}
    )
    session.add(notification)
    
    session.commit()
    session.refresh(notification)

    # Broadcast through WebSocket
    try:
        # Pydantic v2 uses model_dump_json, v1 uses .json()
        if hasattr(notification, 'model_dump_json'):
            msg_data = json.loads(notification.model_dump_json())
        else:
            msg_data = json.loads(notification.json())
            
        await manager.send_personal_message({
            "type": "NEW_NOTIFICATION",
            "notification": msg_data
        }, db_request.user_id)
    except Exception as e:
        print(f"WS notification failed: {e}")

    return {"message": "Request approved", "user_id": db_request.user_id}

@router.patch("/{request_id}/reject")
async def reject_publisher_request(
    request_id: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reject requests")
    
    db_request = session.get(PublisherRequest, request_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if db_request.status != "pending":
        raise HTTPException(status_code=400, detail="Request is already processed")
    
    db_request.status = "rejected"
    db_request.reviewed_at = datetime.utcnow()
    db_request.reviewed_by = user.id
    
    session.add(db_request)
    
    # Create notification for target user
    notification = Notification(
        user_id=db_request.user_id,
        type="system",
        title="تحديث بخصوص طلب الانضمام",
        message="نعتذر، لم يتم قبول طلبك للانضمام كناشر في الوقت الحالي.",
        metadata_={"request_id": request_id, "action": "rejected"}
    )
    session.add(notification)
    
    session.commit()
    session.refresh(notification)

    # Broadcast through WebSocket
    try:
        if hasattr(notification, 'model_dump_json'):
            msg_data = json.loads(notification.model_dump_json())
        else:
            msg_data = json.loads(notification.json())
            
        await manager.send_personal_message({
            "type": "NEW_NOTIFICATION",
            "notification": msg_data
        }, db_request.user_id)
    except Exception as e:
        print(f"WS notification failed: {e}")

    return {"message": "Request rejected"}
