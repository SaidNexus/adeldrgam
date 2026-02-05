from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from app.core.config import settings
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.api import auth, profiles, articles, upload, comments, categories, publisher_requests, users, notifications, admin, stats
from app.core.limiter import limiter
from sqlmodel import SQLModel
from app.models import *
import logging

logger = logging.getLogger(__name__)

# Request body size limit middleware
class LimitRequestBodySize(BaseHTTPMiddleware):
    MAX_BODY_SIZE = 10 * 1024 * 1024  # 10MB max request body
    
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get('content-length')
        if content_length and int(content_length) > self.MAX_BODY_SIZE:
            raise HTTPException(status_code=413, detail="Request body too large")
        return await call_next(request)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.ENVIRONMENT != "production" else None
)

# Global exception handlers
@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    logger.error(f"Database integrity error: {exc.orig}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "Database constraint violation. The operation could not be completed."}
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A database error occurred. Please try again later."}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code >= 500:
        logger.error(f"HTTP {exc.status_code}: {exc.detail}")
    else:
        logger.warning(f"HTTP {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Request size limit middleware
app.add_middleware(LimitRequestBodySize)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    max_age=600
)

# Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(profiles.router, prefix=f"{settings.API_V1_STR}/profiles", tags=["profiles"])
app.include_router(articles.router, prefix=f"{settings.API_V1_STR}/articles", tags=["articles"])
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(upload.router, prefix=f"{settings.API_V1_STR}/upload", tags=["upload"])
app.include_router(comments.router, prefix=f"{settings.API_V1_STR}/comments", tags=["comments"])
app.include_router(publisher_requests.router, prefix=f"{settings.API_V1_STR}/publisher-requests", tags=["publisher-requests"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(stats.router, prefix=f"{settings.API_V1_STR}/stats", tags=["stats"])
app.include_router(stats.router, prefix=f"{settings.API_V1_STR}/visitors", tags=["visitors"])

@app.get("/health")
def health_check():
    return {
        "status": "ok", 
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.PROJECT_NAME} in {settings.ENVIRONMENT} mode")
    
    # Log database URL for debugging
    print(f"\n{'='*80}")
    print(f"DATABASE CONNECTION INFO:")
    print(f"Database URL: {settings.SQLALCHEMY_DATABASE_URI}")
    print(f"{'='*80}\n")
    
    # Verify DB connectivity
    from sqlalchemy import text
    from app.db.session import engine
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Successfully connected to the database")
        
        # Create/Update tables
        logger.info("Creating database tables if they don't exist...")
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables verified/created")
        
    except Exception as e:
        logger.error(f"Failed to connect to the database: {e}")
        if settings.ENVIRONMENT == "development":
            print(f"\nCRITICAL DATABASE ERROR: {e}\n")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down application")

