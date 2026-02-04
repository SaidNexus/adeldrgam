"""Add password_reset_token table

Revision ID: d4e5f6g7h8i9
Revises: b2c3d4e5f6g7
Create Date: 2026-02-03 00:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6g7h8i9'
down_revision = 'b2c3d4e5f6g7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'passwordresettoken',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_passwordresettoken_token_hash', 'passwordresettoken', ['token_hash'])
    op.create_index('ix_passwordresettoken_user_id', 'passwordresettoken', ['user_id'])


def downgrade():
    op.drop_index('ix_passwordresettoken_user_id', table_name='passwordresettoken')
    op.drop_index('ix_passwordresettoken_token_hash', table_name='passwordresettoken')
    op.drop_table('passwordresettoken')
