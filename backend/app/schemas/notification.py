from pydantic import BaseModel
from typing import Optional

class NotificationPreferencesUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    in_app_notifications: Optional[bool] = None
    marketing_notifications: Optional[bool] = None
    security_notifications: Optional[bool] = None
