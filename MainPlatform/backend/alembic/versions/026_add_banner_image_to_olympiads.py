"""Add banner_image column to olympiads table

Revision ID: 026
Revises: 025
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    cols = [c["name"] for c in inspector.get_columns("olympiads")]
    if "banner_image" not in cols:
        op.add_column("olympiads", sa.Column("banner_image", sa.String(500), nullable=True))


def downgrade():
    op.drop_column("olympiads", "banner_image")
