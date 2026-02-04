import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlmodel import Session, select
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.core.security import get_password_hash

TOKEN_EXPIRY_MINUTES = 30
TOKEN_BYTES = 32


class PasswordResetService:
    """Handles password reset token generation and validation."""
    
    def __init__(self, session: Session):
        self.session = session
    
    @staticmethod
    def _hash_token(token: str) -> str:
        """SHA256 hash the token for secure storage."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    @staticmethod
    def _generate_token() -> str:
        """Generate cryptographically secure URL-safe token."""
        return secrets.token_urlsafe(TOKEN_BYTES)
    
    def request_reset(self, email: str) -> Tuple[Optional[str], Optional[User]]:
        """
        Generate a reset token for the given email.
        Returns (raw_token, user) if user exists, (None, None) otherwise.
        """
        user = self.session.exec(
            select(User).where(User.email == email)
        ).first()
        
        if not user:
            return None, None
        
        # Invalidate existing unused tokens for this user
        existing_tokens = self.session.exec(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used == False
            )
        ).all()
        for token in existing_tokens:
            token.used = True
            self.session.add(token)
        
        # Generate new token
        raw_token = self._generate_token()
        token_hash = self._hash_token(raw_token)
        
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRY_MINUTES)
        )
        self.session.add(reset_token)
        self.session.commit()
        
        return raw_token, user
    
    def verify_token(self, raw_token: str) -> Optional[PasswordResetToken]:
        """Verify a reset token is valid, not expired, and not used."""
        token_hash = self._hash_token(raw_token)
        
        reset_token = self.session.exec(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash
            )
        ).first()
        
        if not reset_token:
            return None
        
        if reset_token.expires_at < datetime.utcnow():
            return None
        
        if reset_token.used:
            return None
        
        return reset_token
    
    def reset_password(self, raw_token: str, new_password: str) -> bool:
        """Reset the user's password using the provided token."""
        reset_token = self.verify_token(raw_token)
        if not reset_token:
            return False
        
        user = self.session.get(User, reset_token.user_id)
        if not user:
            return False
        
        user.hashed_password = get_password_hash(new_password)
        reset_token.used = True
        
        self.session.add(user)
        self.session.add(reset_token)
        self.session.commit()
        
        return True
