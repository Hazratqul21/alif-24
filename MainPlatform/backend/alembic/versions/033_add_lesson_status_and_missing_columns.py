"""Add missing columns to lessons table (status, language, etc.)

Revision ID: 033
Revises: 032
Create Date: 2026-04-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '033'
down_revision = '032'
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

    # 1. Create Enum type for status if it doesn't exist
    # PostgreSQL specific: check if type exists
    status_enum = sa.Enum("draft", "published", "archived", name="lessonstatus")
    
    # 2. Add columns if missing
    # status
    if not _column_exists(conn, 'lessons', 'status'):
        # Ensure type exists first for PG
        status_enum.create(conn, checkfirst=True)
        op.add_column('lessons', sa.Column(
            'status', status_enum, 
            server_default='published', nullable=False
        ))

    # language
    if not _column_exists(conn, 'lessons', 'language'):
        op.add_column('lessons', sa.Column(
            'language', sa.String(10), server_default='uz', nullable=True
        ))

    # attachments
    if not _column_exists(conn, 'lessons', 'attachments'):
        op.add_column('lessons', sa.Column(
            'attachments', sa.JSON, nullable=True
        ))

    # video_url
    if not _column_exists(conn, 'lessons', 'video_url'):
        op.add_column('lessons', sa.Column(
            'video_url', sa.String(500), nullable=True
        ))

    # subject
    if not _column_exists(conn, 'lessons', 'subject'):
        op.add_column('lessons', sa.Column(
            'subject', sa.String(100), nullable=True
        ))

    # grade_level
    if not _column_exists(conn, 'lessons', 'grade_level'):
        op.add_column('lessons', sa.Column(
            'grade_level', sa.String(20), nullable=True
        ))

    # content
    if not _column_exists(conn, 'lessons', 'content'):
        op.add_column('lessons', sa.Column(
            'content', sa.Text, nullable=True
        ))

    # organization_id
    if not _column_exists(conn, 'lessons', 'organization_id'):
        op.add_column('lessons', sa.Column(
            'organization_id', sa.String(8),
            sa.ForeignKey('organization_profiles.id', ondelete='SET NULL'),
            nullable=True
        ))


def downgrade():
    conn = op.get_bind()
    
    # Drop columns if they exist
    cols = ['organization_id', 'content', 'grade_level', 'subject', 'video_url', 'attachments', 'language', 'status']
    for col in cols:
        if _column_exists(conn, 'lessons', col):
            op.drop_column('lessons', col)
            
    # Drop enum type
    conn.execute(text("DROP TYPE IF EXISTS lessonstatus"))
