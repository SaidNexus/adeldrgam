"""add cascade delete constraints

Revision ID: g2h3i4j5k6l7
Revises: f1g2h3i4j5k6
Create Date: 2026-02-03 02:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'g2h3i4j5k6l7'
down_revision: Union[str, None] = 'f1g2h3i4j5k6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing FK constraints and recreate with ON DELETE CASCADE
    
    # articlelike -> article
    op.drop_constraint('articlelike_article_id_fkey', 'articlelike', type_='foreignkey')
    op.create_foreign_key(
        'articlelike_article_id_fkey', 
        'articlelike', 'article', 
        ['article_id'], ['id'], 
        ondelete='CASCADE'
    )
    
    # articlelike -> user  
    op.drop_constraint('articlelike_user_id_fkey', 'articlelike', type_='foreignkey')
    op.create_foreign_key(
        'articlelike_user_id_fkey',
        'articlelike', 'user',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # comment -> article
    op.drop_constraint('comment_article_id_fkey', 'comment', type_='foreignkey')
    op.create_foreign_key(
        'comment_article_id_fkey',
        'comment', 'article',
        ['article_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # comment -> user
    op.drop_constraint('comment_user_id_fkey', 'comment', type_='foreignkey')
    op.create_foreign_key(
        'comment_user_id_fkey',
        'comment', 'user',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # comment -> parent comment (self-referential)
    op.drop_constraint('comment_parent_id_fkey', 'comment', type_='foreignkey')
    op.create_foreign_key(
        'comment_parent_id_fkey',
        'comment', 'comment',
        ['parent_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # articleview -> article
    op.drop_constraint('articleview_article_id_fkey', 'articleview', type_='foreignkey')
    op.create_foreign_key(
        'articleview_article_id_fkey',
        'articleview', 'article',
        ['article_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    # Revert to FK constraints without CASCADE
    
    op.drop_constraint('articleview_article_id_fkey', 'articleview', type_='foreignkey')
    op.create_foreign_key('articleview_article_id_fkey', 'articleview', 'article', ['article_id'], ['id'])
    
    op.drop_constraint('comment_parent_id_fkey', 'comment', type_='foreignkey')
    op.create_foreign_key('comment_parent_id_fkey', 'comment', 'comment', ['parent_id'], ['id'])
    
    op.drop_constraint('comment_user_id_fkey', 'comment', type_='foreignkey')
    op.create_foreign_key('comment_user_id_fkey', 'comment', 'user', ['user_id'], ['id'])
    
    op.drop_constraint('comment_article_id_fkey', 'comment', type_='foreignkey')
    op.create_foreign_key('comment_article_id_fkey', 'comment', 'article', ['article_id'], ['id'])
    
    op.drop_constraint('articlelike_user_id_fkey', 'articlelike', type_='foreignkey')
    op.create_foreign_key('articlelike_user_id_fkey', 'articlelike', 'user', ['user_id'], ['id'])
    
    op.drop_constraint('articlelike_article_id_fkey', 'articlelike', type_='foreignkey')
    op.create_foreign_key('articlelike_article_id_fkey', 'articlelike', 'article', ['article_id'], ['id'])
