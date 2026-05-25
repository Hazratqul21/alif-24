"""Add questions_limit and test_limit columns to ertaklar table

Revision ID: 038
Revises: 037
Create Date: 2026-05-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '038'
down_revision = '037'
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

    # 1. questions_limit in ertaklar
    if not _column_exists(conn, 'ertaklar', 'questions_limit'):
        op.add_column('ertaklar', sa.Column(
            'questions_limit', sa.Integer, nullable=True, server_default='3'
        ))

    # 2. test_limit in ertaklar
    if not _column_exists(conn, 'ertaklar', 'test_limit'):
        op.add_column('ertaklar', sa.Column(
            'test_limit', sa.Integer, nullable=True
        ))


def downgrade():
    conn = op.get_bind()
    
    if _column_exists(conn, 'ertaklar', 'questions_limit'):
        op.drop_column('ertaklar', 'questions_limit')

    if _column_exists(conn, 'ertaklar', 'test_limit'):
        op.drop_column('ertaklar', 'test_limit')
