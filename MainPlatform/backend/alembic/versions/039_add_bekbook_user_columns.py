"""Add Bekbook user columns to users table

Revision ID: 039
Revises: 038
Create Date: 2026-05-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '039'
down_revision = '038'
branch_labels = None
depends_on = None


def _column_exists(conn, table, column):
    result = conn.execute(text(
        f"SELECT column_name FROM information_schema.columns "
        f"WHERE table_name='{table}' AND column_name='{column}'"
    ))
    return result.fetchone() is not None


def upgrade():
    conn = op.get_bind()

    # 1. reader_id
    if not _column_exists(conn, 'users', 'reader_id'):
        op.add_column('users', sa.Column(
            'reader_id', sa.String(8), nullable=True, unique=True
        ))

    # 2. lat
    if not _column_exists(conn, 'users', 'lat'):
        op.add_column('users', sa.Column(
            'lat', sa.Float, nullable=True
        ))

    # 3. lng
    if not _column_exists(conn, 'users', 'lng'):
        op.add_column('users', sa.Column(
            'lng', sa.Float, nullable=True
        ))

    # 4. address
    if not _column_exists(conn, 'users', 'address'):
        op.add_column('users', sa.Column(
            'address', sa.Text, nullable=True
        ))

    # 5. category
    if not _column_exists(conn, 'users', 'category'):
        op.add_column('users', sa.Column(
            'category', sa.String(50), nullable=False, server_default='regular'
        ))

    # 6. is_blacklisted
    if not _column_exists(conn, 'users', 'is_blacklisted'):
        op.add_column('users', sa.Column(
            'is_blacklisted', sa.Boolean, nullable=False, server_default='false'
        ))


def downgrade():
    conn = op.get_bind()
    
    if _column_exists(conn, 'users', 'reader_id'):
        op.drop_column('users', 'reader_id')

    if _column_exists(conn, 'users', 'lat'):
        op.drop_column('users', 'lat')

    if _column_exists(conn, 'users', 'lng'):
        op.drop_column('users', 'lng')

    if _column_exists(conn, 'users', 'address'):
        op.drop_column('users', 'address')

    if _column_exists(conn, 'users', 'category'):
        op.drop_column('users', 'category')

    if _column_exists(conn, 'users', 'is_blacklisted'):
        op.drop_column('users', 'is_blacklisted')
