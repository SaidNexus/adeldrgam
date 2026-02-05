"""ensure share_count and views_count columns exist

Revision ID: f2a3b4c5d6e7
Revises: 135ccdbb00a0
Create Date: 2026-02-03 03:15:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, None] = '135ccdbb00a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Use a safe way to add columns if they might be missing
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('article')]
    
    if 'share_count' not in columns:
        op.add_column('article', sa.Column('share_count', sa.Integer(), nullable=False, server_default='0'))
    
    if 'views_count' not in columns:
        op.add_column('article', sa.Column('views_count', sa.Integer(), nullable=False, server_default='0'))
        
    # Ensure articleview table exists
    tables = inspector.get_table_names()
    if 'articleview' not in tables:
        op.create_table('articleview',
            sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column('article_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column('viewer_hash', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
            sa.Column('viewed_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['article_id'], ['article.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_articleview_article_id'), 'articleview', ['article_id'], unique=False)
        op.create_index(op.f('ix_articleview_viewer_hash'), 'articleview', ['viewer_hash'], unique=False)

def downgrade() -> None:
    # Downgrade is optional for this fix, but let's be responsible
    pass
