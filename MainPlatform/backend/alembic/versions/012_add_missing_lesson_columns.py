"""Add missing columns to lessons table (teacher_id, language, organization_id)

The lessons table may have been created by another service (Lessions platform)
without teacher_id, language, or organization_id columns. Migration 003 skipped
creation because the table already existed (has_table check).

Revision ID: 012
Revises: 011
Create Date: 2026-02-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '012'
down_revision = '011'
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

    # 1. Add teacher_id if missing
    if not _column_exists(conn, 'lessons', 'teacher_id'):
        op.add_column('lessons', sa.Column(
            'teacher_id', sa.String(8),
            sa.ForeignKey('teacher_profiles.id', ondelete='SET NULL'),
            nullable=True
        ))
        op.create_index('ix_lessons_teacher_id', 'lessons', ['teacher_id'])

    # 2. Add organization_id if missing
    if not _column_exists(conn, 'lessons', 'organization_id'):
        op.add_column('lessons', sa.Column(
            'organization_id', sa.String(8),
            sa.ForeignKey('organization_profiles.id'),
            nullable=True
        ))

    # 3. Add language if missing
    if not _column_exists(conn, 'lessons', 'language'):
        op.add_column('lessons', sa.Column(
            'language', sa.String(10), server_default='uz', nullable=True
        ))

    # 4. Add video_url if missing
    if not _column_exists(conn, 'lessons', 'video_url'):
        op.add_column('lessons', sa.Column(
            'video_url', sa.String(500), nullable=True
        ))

    # 5. Add attachments if missing
    if not _column_exists(conn, 'lessons', 'attachments'):
        op.add_column('lessons', sa.Column(
            'attachments', sa.JSON, nullable=True
        ))

    # 6. Add subject if missing
    if not _column_exists(conn, 'lessons', 'subject'):
        op.add_column('lessons', sa.Column(
            'subject', sa.String(100), nullable=True
        ))

    # 7. Add grade_level if missing
    if not _column_exists(conn, 'lessons', 'grade_level'):
        op.add_column('lessons', sa.Column(
            'grade_level', sa.String(20), nullable=True
        ))

    # 8. Add content if missing
    if not _column_exists(conn, 'lessons', 'content'):
        op.add_column('lessons', sa.Column(
            'content', sa.Text, nullable=True
        ))

    # 9. Add updated_at if missing
    if not _column_exists(conn, 'lessons', 'updated_at'):
        op.add_column('lessons', sa.Column(
            'updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()
        ))


def downgrade():
    conn = op.get_bind()
    if _column_exists(conn, 'lessons', 'language'):
        op.drop_column('lessons', 'language')
    if _column_exists(conn, 'lessons', 'organization_id'):
        op.drop_column('lessons', 'organization_id')
    if _column_exists(conn, 'lessons', 'teacher_id'):
        op.drop_index('ix_lessons_teacher_id', 'lessons')
        op.drop_column('lessons', 'teacher_id')
