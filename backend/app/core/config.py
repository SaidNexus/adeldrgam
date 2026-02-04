from pydantic_settings import BaseSettings
from typing import List
import secrets

class Settings(BaseSettings):
    PROJECT_NAME: str = "Arabic CMS API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Database - NO DEFAULT, must be set in .env
    DATABASE_URL: str
    
    # JWT - Generate secure default if not provided
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Security
    RATE_LIMIT_PER_MINUTE: int = 10
    BCRYPT_MAX_PASSWORD_LENGTH: int = 72
    
    # Frontend URL for password reset links
    FRONTEND_URL: str = "http://localhost:5173"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Generate secure secret key if not provided
        if not self.SECRET_KEY or len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY must be set in .env and be at least 32 characters long")

settings = Settings()
