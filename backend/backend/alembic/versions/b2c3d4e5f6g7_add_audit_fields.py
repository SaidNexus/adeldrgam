"""Add audit fields to Article

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-02 05:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6g7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Add optional audit fields
    op.add_column('article', sa.Column('created_by', sa.String(), nullable=True))
    op.add_column('article', sa.Column('updated_by', sa.String(), nullable=True))
    
    # Add foreign key constraints
    op.create_foreign_key('fk_article_created_by', 'article', 'user', ['created_by'], ['id'])
    op.create_foreign_key('fk_article_updated_by', 'article', 'user', ['updated_by'], ['id'])


def downgrade():
    op.drop_constraint('fk_article_updated_by', 'article', type_='foreignkey')
    op.drop_constraint('fk_article_created_by', 'article', type_='foreignkey')
    op.drop_column('article', 'updated_by')
    op.drop_column('article', 'created_by')
