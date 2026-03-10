"""Add organization profile fields

Revision ID: 021
Revises: 020
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "021"
down_revision = "020"
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
    if not _column_exists(conn, "organization_profiles", "organization_type"):
        op.add_column("organization_profiles", sa.Column("organization_type", sa.String(100), nullable=True))
    if not _column_exists(conn, "organization_profiles", "organization_role"):
        op.add_column("organization_profiles", sa.Column("organization_role", sa.String(100), nullable=True))


def downgrade():
    conn = op.get_bind()
    if _column_exists(conn, "organization_profiles", "organization_type"):
        op.drop_column("organization_profiles", "organization_type")
    if _column_exists(conn, "organization_profiles", "organization_role"):
        op.drop_column("organization_profiles", "organization_role")
