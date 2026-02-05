import cloudinary
import cloudinary.uploader
from app.core.config import settings

# Configure Cloudinary globally
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET
)

def upload_image_to_cloudinary(file_content, folder="arabic-cms", transformations=None):
    """
    Generic helper to upload images to Cloudinary.
    """
    try:
        options = {
            "folder": folder,
            "resource_type": "image"
        }
        if transformations:
            options["transformation"] = transformations
            
        return cloudinary.uploader.upload(file_content, **options)
    except Exception as e:
        raise Exception(f"Cloudinary upload error: {str(e)}")

def delete_image_from_cloudinary(public_id):
    """
    Helper to delete images from Cloudinary.
    """
    if not public_id:
        return None
    try:
        return cloudinary.uploader.destroy(public_id)
    except Exception as e:
        print(f"Cloudinary delete error (ignored): {str(e)}")
        return None
