"""merge multiple heads

Revision ID: 6371a517f7b5
Revises: 46bf1e69ff96, s1t2e3s4t5a6
Create Date: 2026-02-04 05:02:29.176030
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '6371a517f7b5'
down_revision: Union[str, None] = ('46bf1e69ff96', 's1t2e3s4t5a6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
