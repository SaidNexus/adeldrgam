"""Add site_stats table for visitor tracking.

Revision ID: s1t2e3s4t5a6
Revises: d4e5f6g7h8i9
Create Date: 2026-02-04
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers
revision = 's1t2e3s4t5a6'
down_revision = 'd4e5f6g7h8i9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create site_stats table
    op.create_table(
        'site_stats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('stat_key', sa.String(), nullable=False),
        sa.Column('stat_value', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_updated', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_site_stats_stat_key', 'site_stats', ['stat_key'], unique=True)
    
    # Seed with initial visitor count of 56,000
    op.execute(
        "INSERT INTO site_stats (stat_key, stat_value, last_updated) "
        f"VALUES ('visitors_count', 56000, '{datetime.utcnow().isoformat()}')"
    )


def downgrade() -> None:
    op.drop_index('ix_site_stats_stat_key', table_name='site_stats')
    op.drop_table('site_stats')
