"""merge heads

Revision ID: f227baaebb9c
Revises: add_reading_analysis, add_rbac_models
Create Date: 2026-01-28 20:31:50.719045

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f227baaebb9c'
down_revision = 'add_rbac_models'
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

