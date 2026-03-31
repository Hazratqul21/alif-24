"""Add is_published to olympiad_lessons and olympiad_stories

Revision ID: 023
Revises: 022
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    lessons_cols = [c["name"] for c in inspector.get_columns("olympiad_lessons")]
    if "is_published" not in lessons_cols:
        op.add_column("olympiad_lessons", sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"))

    stories_cols = [c["name"] for c in inspector.get_columns("olympiad_stories")]
    if "is_published" not in stories_cols:
        op.add_column("olympiad_stories", sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"))


def downgrade():
    op.drop_column("olympiad_stories", "is_published")
    op.drop_column("olympiad_lessons", "is_published")
