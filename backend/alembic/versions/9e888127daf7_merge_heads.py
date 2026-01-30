"""merge_heads

Revision ID: 9e888127daf7
Revises: f227baaebb9c, simple_initial
Create Date: 2026-01-29 11:03:57.595171

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9e888127daf7'
down_revision = ('f227baaebb9c', 'simple_initial')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

