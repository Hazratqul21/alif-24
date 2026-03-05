"""Add platform_content table

Revision ID: 019
Revises: 018
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def _table_exists(conn, table_name):
    inspector = Inspector.from_engine(conn)
    return table_name in inspector.get_table_names()


def upgrade():
    conn = op.get_bind()

    if not _table_exists(conn, "platform_content"):
        op.create_table(
            "platform_content",
            sa.Column("id", sa.String(length=8), nullable=False),
            sa.Column("key", sa.String(length=100), nullable=False),
            sa.Column("value", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id")
        )
        op.create_index(op.f("ix_platform_content_key"), "platform_content", ["key"], unique=True)


def downgrade():
    conn = op.get_bind()
    if _table_exists(conn, "platform_content"):
        op.drop_index(op.f("ix_platform_content_key"), table_name="platform_content")
        op.drop_table("platform_content")
