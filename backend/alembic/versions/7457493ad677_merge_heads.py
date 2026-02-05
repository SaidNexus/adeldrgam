"""merge heads

Revision ID: 7457493ad677
Revises: 9a1b2c3d4e5f, g2h3i4j5k6l7
Create Date: 2026-02-03 16:08:21.028951
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '7457493ad677'
down_revision: Union[str, None] = ('9a1b2c3d4e5f', 'g2h3i4j5k6l7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
