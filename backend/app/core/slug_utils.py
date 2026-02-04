import re
import random
import string
from typing import Optional
from sqlmodel import Session, select
from app.models.article import Article

def normalize_slug(slug: str) -> str:
    """
    Normalize slug: lowercase, trimmed, spaces to hyphens, remove invalid chars.
    """
    if not slug:
        return ""
    # Remove non-word characters (except hyphens) and replace spaces with hyphens
    # Also handle Arabic characters which \w might not handle perfectly depending on env, 
    # but re.sub with unicode works for most modern pythons.
    slug = slug.strip().lower()
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'[^\w\u0600-\u06FF\-]', '', slug) # Keep Arabic range
    slug = re.sub(r'-+', '-', slug) # Remove double hyphens
    return slug.strip('-')

def generate_unique_slug(
    session: Session, 
    slug_base: str, 
    exclude_id: Optional[str] = None,
    status: str = "draft"
) -> str:
    """
    Generate a unique slug based on article status.
    
    Business Rules:
    - Draft articles: Always get unique slug (auto-suffix if needed)
    - Published articles: Must have unique slug (error if duplicate)
    """
    slug = normalize_slug(slug_base)
    if not slug:
        slug = "article"
        
    # Check if exact match exists, excluding the current article if updating
    query = select(Article).where(Article.slug == slug)
    if exclude_id:
        query = query.where(Article.id != exclude_id)
        
    existing = session.exec(query).first()
    if not existing:
        return slug
    
    # For drafts: always auto-generate unique suffix
    # For published: also auto-generate (we'll validate published uniqueness separately)
    while True:
        suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        new_slug = f"{slug}-{suffix}"
        
        query = select(Article).where(Article.slug == new_slug)
        if exclude_id:
            query = query.where(Article.id != exclude_id)
            
        existing = session.exec(query).first()
        if not existing:
            return new_slug
