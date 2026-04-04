"""Add difficulty column to olympiads table

Revision ID: 025
Revises: 024
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    cols = [c["name"] for c in inspector.get_columns("olympiads")]
    if "difficulty" not in cols:
        op.add_column("olympiads", sa.Column("difficulty", sa.String(20), server_default="medium", nullable=True))


def downgrade():
    op.drop_column("olympiads", "difficulty")
