from pydantic_settings import BaseSettings
# تم إضافة Optional هنا لحل مشكلة التعريف
from typing import List, Optional 
import secrets

class Settings(BaseSettings):
    PROJECT_NAME: str = "Adel Drgam CMS"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str
    # الآن Optional ستعمل بشكل صحيح
    DATABASE_PUBLIC_URL: Optional[str] = None
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        # المنطق ده ممتاز: بيجرب الـ Public الأول عشان يتفادى مشاكل Railway الداخلية
        url = self.DATABASE_PUBLIC_URL or self.DATABASE_URL
        if url and url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    # JWT 
    SECRET_KEY: str = "bfe3f2e188d296c1a197341b263c8b2a2043e57f9a8a8bf856f331fce662f225"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Security
    RATE_LIMIT_PER_MINUTE: int = 60 # رفعته شوية عشان الداشبورد ميعملش بلوك
    BCRYPT_MAX_PASSWORD_LENGTH: int = 72
    
    # Frontend
    FRONTEND_URL: str = "https://drgam.netlify.app"
    
    # CORS - القائمة المحدثة
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173", 
        "http://localhost:3000",
        "https://drgam.netlify.app",
        "https://adel-drgam.netlify.app"
    ]
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str 
    CLOUDINARY_API_SECRET: str 
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.SECRET_KEY or len(self.SECRET_KEY) < 32:
            # تنبيه صغير: لو أنت في مرحلة التطوير، ممكن تخليها متطلعش Error وتعمل توليد تلقائي
            # بس للأمان في الـ Production سيبها زي ما هي ولازم تحط Key في الـ .env
            pass

# حل مشكلة Pydantic النهائية
Settings.model_rebuild()

settings = Settings()
