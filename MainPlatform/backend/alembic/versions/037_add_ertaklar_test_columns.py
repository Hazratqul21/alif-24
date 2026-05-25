"""Add test and test_score columns to ertaklar and story_reading_records

Revision ID: 037
Revises: 036
Create Date: 2026-05-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '037'
down_revision = '036'
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

    # 1. test in ertaklar
    if not _column_exists(conn, 'ertaklar', 'test'):
        op.add_column('ertaklar', sa.Column(
            'test', sa.JSON, nullable=True, server_default='[]'
        ))

    # 2. test_score in story_reading_records
    if not _column_exists(conn, 'story_reading_records', 'test_score'):
        op.add_column('story_reading_records', sa.Column(
            'test_score', sa.Integer, nullable=True
        ))


def downgrade():
    conn = op.get_bind()
    
    if _column_exists(conn, 'ertaklar', 'test'):
        op.drop_column('ertaklar', 'test')

    if _column_exists(conn, 'story_reading_records', 'test_score'):
        op.drop_column('story_reading_records', 'test_score')
