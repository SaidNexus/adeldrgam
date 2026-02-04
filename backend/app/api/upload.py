from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlmodel import Session
from app.db.session import get_session
from app.models.user import User
from app.models.profile import Profile
from app.core.security import get_current_user
from app.core.cloudinary import upload_image_to_cloudinary, delete_image_from_cloudinary

router = APIRouter()

ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
MAX_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("")
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    
    try:
        result = upload_image_to_cloudinary(contents, folder="arabic-cms")
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "width": result.get("width"),
            "height": result.get("height")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    contents = await file.read()
    if len(contents) > (5 * 1024 * 1024):
        raise HTTPException(status_code=400, detail="الرسمة كبيرة جداً. الحد الأقصى 2 ميجابايت")
    
    try:
        # 1. Upload new image
        result = upload_image_to_cloudinary(
            contents,
            folder="avatars",
            transformations=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "face"},
                {"fetch_format": "webp", "quality": "auto"}
            ]
        )
        avatar_url = result["secure_url"]
        new_public_id = result["public_id"]
        
        # 2. Get profile and old public_id
        profile = session.get(Profile, user.id)
        if not profile:
            profile = Profile(id=user.id)
            session.add(profile)
        
        old_public_id = profile.avatar_public_id
        
        # 3. Delete old image (Success of upload is guaranteed by line 51)
        if old_public_id and old_public_id != new_public_id:
            delete_image_from_cloudinary(old_public_id)
            
        # 4. Save new values and Commit
        profile.avatar_url = avatar_url
        profile.avatar_public_id = new_public_id
        session.add(profile)
        session.commit()
        
        return {"url": avatar_url, "public_id": new_public_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{public_id}")
def delete_image(public_id: str, user: User = Depends(get_current_user)):
    try:
        result = delete_image_from_cloudinary(public_id)
        return {"message": "Image deleted", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
