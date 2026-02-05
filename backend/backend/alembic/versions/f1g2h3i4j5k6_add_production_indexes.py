"""add production indexes

Revision ID: f1g2h3i4j5k6
Revises: 135ccdbb00a0
Create Date: 2026-02-03 02:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f1g2h3i4j5k6'
down_revision: Union[str, None] = '135ccdbb00a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add composite index for article lookups
    op.create_index('ix_article_status_created', 'article', ['status', 'created_at'], unique=False)
    
    # Add composite index for articlelike lookups (prevent duplicate likes)
    op.create_index('ix_articlelike_composite', 'articlelike', ['user_id', 'article_id'], unique=True)
    
    # Add index for comment lookups by article
    op.create_index('ix_comment_article_created', 'comment', ['article_id', 'created_at'], unique=False)
    
    # Add index for view tracking
    op.create_index('ix_articleview_composite', 'articleview', ['article_id', 'viewer_hash', 'viewed_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_articleview_composite', table_name='articleview')
    op.drop_index('ix_comment_article_created', table_name='comment')
    op.drop_index('ix_articlelike_composite', table_name='articlelike')
    op.drop_index('ix_article_status_created', table_name='article')
