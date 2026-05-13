"""Add missing columns to ertaklar table (teacher_id, image_url, questions, updated_at)

Revision ID: 034
Revises: 033
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '034'
down_revision = '033'
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

    # 1. teacher_id
    if not _column_exists(conn, 'ertaklar', 'teacher_id'):
        op.add_column('ertaklar', sa.Column(
            'teacher_id', sa.String(8),
            sa.ForeignKey('teacher_profiles.id', ondelete='SET NULL'),
            nullable=True
        ))

    # 2. image_url
    if not _column_exists(conn, 'ertaklar', 'image_url'):
        op.add_column('ertaklar', sa.Column(
            'image_url', sa.String(500), nullable=True
        ))

    # 3. questions
    if not _column_exists(conn, 'ertaklar', 'questions'):
        op.add_column('ertaklar', sa.Column(
            'questions', sa.JSON, nullable=True, server_default='[]'
        ))

    # 4. updated_at
    if not _column_exists(conn, 'ertaklar', 'updated_at'):
        op.add_column('ertaklar', sa.Column(
            'updated_at', sa.DateTime(timezone=True), nullable=True
        ))


def downgrade():
    conn = op.get_bind()
    
    # Drop columns if they exist
    cols = ['updated_at', 'questions', 'image_url', 'teacher_id']
    for col in cols:
        if _column_exists(conn, 'ertaklar', col):
            op.drop_column('ertaklar', col)
