"""ensure social columns exist production safe

Revision ID: 9a1b2c3d4e5f
Revises: f2a3b4c5d6e7
Create Date: 2026-02-03 03:37:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '9a1b2c3d4e5f'
down_revision: Union[str, None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. COMMENT table - is_deleted
    op.execute("ALTER TABLE comment ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE")
    op.execute("UPDATE comment SET is_deleted = FALSE WHERE is_deleted IS NULL")
    op.execute("ALTER TABLE comment ALTER COLUMN is_deleted SET NOT NULL")

    # 2. ARTICLE table - share_count
    op.execute("ALTER TABLE article ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0")
    op.execute("UPDATE article SET share_count = 0 WHERE share_count IS NULL")
    op.execute("ALTER TABLE article ALTER COLUMN share_count SET NOT NULL")

    # 3. ARTICLEVIEW table
    op.execute("""
        CREATE TABLE IF NOT EXISTS articleview (
            id TEXT PRIMARY KEY,
            article_id TEXT NOT NULL REFERENCES article(id) ON DELETE CASCADE,
            viewer_hash TEXT NOT NULL,
            viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 4. INDEXES
    op.execute("CREATE INDEX IF NOT EXISTS ix_articleview_article_id ON articleview (article_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_articleview_viewer_hash ON articleview (viewer_hash)")

def downgrade() -> None:
    pass
