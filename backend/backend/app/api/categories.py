from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
import uuid
from app.db.session import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.article import Category

router = APIRouter()

PRIORITY_ORDER = [
    "عادل ضرغام",
    "كتاب آخرون",
    "الرواية",
    "الشعر",
    "القصة القصيرة",
    "حوارات"
]

# Default categories to seed if table is empty
DEFAULT_CATEGORIES = [
    {"name_ar": "الرواية", "slug": "novel", "description_ar": "الروايات والأعمال السردية الطويلة"},
    {"name_ar": "الشعر", "slug": "poetry", "description_ar": "الشعر العربي والقصائد"},
    {"name_ar": "القصة القصيرة", "slug": "short-story", "description_ar": "القصص القصيرة والنثر الأدبي"},
    {"name_ar": "حوارات", "slug": "interviews", "description_ar": "المقابلات والحوارات الثقافية"},
]


def seed_categories_if_empty(session: Session) -> bool:
    """Seed categories if table is empty. Returns True if seeded."""
    existing = session.exec(select(Category)).first()
    if existing:
        return False
    
    for cat_data in DEFAULT_CATEGORIES:
        category = Category(
            id=str(uuid.uuid4()),
            name_ar=cat_data["name_ar"],
            slug=cat_data["slug"],
            description_ar=cat_data.get("description_ar")
        )
        session.add(category)
    
    session.commit()
    return True


@router.get("", response_model=List[Category])
def get_categories(session: Session = Depends(get_session)):
    """Get all categories ordered by priority. Auto-seeds if empty."""
    # Auto-seed if table is empty
    seed_categories_if_empty(session)
    
    categories = session.exec(select(Category)).all()
    
    # Sort by priority
    def sort_key(cat: Category):
        try:
            return PRIORITY_ORDER.index(cat.name_ar)
        except ValueError:
            return len(PRIORITY_ORDER)
            
    return sorted(categories, key=sort_key)


@router.post("", response_model=Category)
def create_category(
    category_data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create categories")
    
    name_ar = category_data.get("name_ar")
    slug = category_data.get("slug")
    
    if not slug and name_ar:
        # Simple slugification: replace spaces with hyphens
        slug = name_ar.strip().replace(" ", "-")
    
    db_category = Category(
        id=str(uuid.uuid4()),
        name_ar=name_ar,
        slug=slug,
        description_ar=category_data.get("description_ar")
    )
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category

@router.patch("/{category_id}", response_model=Category)
def update_category(
    category_id: str,
    category_data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update categories")
    
    db_category = session.get(Category, category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for key, value in category_data.items():
        if hasattr(db_category, key):
            setattr(db_category, key, value)
    
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category

@router.delete("/{category_id}")
def delete_category(
    category_id: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete categories")
    
    db_category = session.get(Category, category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    session.delete(db_category)
    session.commit()
    return {"message": "Category deleted"}

@router.post("/seed")
def seed_categories(session: Session = Depends(get_session)):
    """Manually seed categories if needed."""
    seeded = seed_categories_if_empty(session)
    if seeded:
        return {"message": "Categories seeded successfully", "count": len(DEFAULT_CATEGORIES)}
    return {"message": "Categories already exist", "count": 0}
