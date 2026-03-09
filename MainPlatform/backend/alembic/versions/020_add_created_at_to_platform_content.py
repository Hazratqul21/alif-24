"""Add created_at to platform_content

Revision ID: 020
Revises: 019
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def _column_exists(conn, table_name, column_name):
    inspector = Inspector.from_engine(conn)
    if table_name not in inspector.get_table_names():
        return False
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    conn = op.get_bind()
    if not _column_exists(conn, "platform_content", "created_at"):
        op.add_column("platform_content", sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))


def downgrade():
    conn = op.get_bind()
    if _column_exists(conn, "platform_content", "created_at"):
        op.drop_column("platform_content", "created_at")
