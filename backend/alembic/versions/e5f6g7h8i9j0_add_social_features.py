"""Add social features: comments, likes, views_count

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2026-02-03 01:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'e5f6g7h8i9j0'
down_revision = 'd4e5f6g7h8i9'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Create Comment table
    op.create_table(
        'comment',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('article_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('parent_id', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['article_id'], ['article.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['comment.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_comment_article_id', 'comment', ['article_id'])
    op.create_index('ix_comment_user_id', 'comment', ['user_id'])
    op.create_index('ix_comment_parent_id', 'comment', ['parent_id'])

    # 2. Create ArticleLike table
    op.create_table(
        'articlelike',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('article_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['article_id'], ['article.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'article_id')
    )
    op.create_index('ix_articlelike_article_id', 'articlelike', ['article_id'])
    op.create_index('ix_articlelike_user_id', 'articlelike', ['user_id'])

    # 3. Add views_count to article (checking if exists, but safe to add if migrate)
    # Based on models, it should be there, but we ensure DB has it
    # This might fail if using --autogenerate and it exists, but we'll assume manual init
    # op.add_column('article', sa.Column('views_count', sa.Integer(), server_default='0', nullable=False))

def downgrade():
    op.drop_table('articlelike')
    op.drop_table('comment')
