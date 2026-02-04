"""Convert Article.content to JSONB

Revision ID: a1b2c3d4e5f6
Revises: 063456035ff3
Create Date: 2026-02-02 05:06:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '063456035ff3'
branch_labels = None
depends_on = None


def upgrade():
    # Convert content from TEXT to JSONB with safe cast
    # Handle NULL and empty strings gracefully
    op.execute("""
        ALTER TABLE article 
        ALTER COLUMN content TYPE JSONB 
        USING CASE 
            WHEN content IS NULL THEN NULL
            WHEN content = '' THEN NULL
            WHEN content ~ '^[\\s]*$' THEN NULL
            ELSE content::jsonb
        END
    """)
    
    # Add DB default for views_count
    op.execute("ALTER TABLE article ALTER COLUMN views_count SET DEFAULT 0")
    
    # Add DB default for created_at
    op.execute("ALTER TABLE article ALTER COLUMN created_at SET DEFAULT NOW()")


def downgrade():
    # Convert back to TEXT
    op.execute("ALTER TABLE article ALTER COLUMN content TYPE TEXT USING content::text")
    
    # Remove defaults
    op.execute("ALTER TABLE article ALTER COLUMN views_count DROP DEFAULT")
    op.execute("ALTER TABLE article ALTER COLUMN created_at DROP DEFAULT")
