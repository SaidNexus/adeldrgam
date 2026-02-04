import logging
from typing import Optional

logger = logging.getLogger(__name__)


class EmailService:
    """Console email service for development."""
    
    def send_password_reset_email(
        self,
        to_email: str,
        username: str,
        reset_url: str
    ) -> bool:
        """Print reset link to console."""
        logger.info("=" * 50)
        logger.info("📧 PASSWORD RESET EMAIL")
        logger.info(f"TO: {to_email}")
        logger.info(f"USER: {username}")
        logger.info(f"RESET URL: {reset_url}")
        logger.info("=" * 50)
        print(f"\n🔗 PASSWORD RESET LINK: {reset_url}\n")
        return True


def get_email_service() -> EmailService:
    """Factory function for dependency injection."""
    return EmailService()
