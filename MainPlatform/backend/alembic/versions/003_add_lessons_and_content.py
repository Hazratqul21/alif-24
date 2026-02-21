"""Add lessons and content models
Revision ID: 003
Revises: 002
Create Date: 2026-02-20
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade() -> None:

    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    # ============ LESSONS ============
    if not inspector.has_table('lessons'):
        op.create_table(
            'lessons',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('teacher_id', sa.String(8), sa.ForeignKey('teacher_profiles.id', ondelete='CASCADE'), nullable=False),
            sa.Column('title', sa.String(300), nullable=False),
            sa.Column('subject', sa.String(100), nullable=True),
            sa.Column('grade_level', sa.String(20), nullable=True),
            sa.Column('content', sa.Text, nullable=True),
            sa.Column('video_url', sa.String(500), nullable=True),
            sa.Column('attachments', sa.JSON, nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index('ix_lessons_teacher_id', 'lessons', ['teacher_id'])

    # ============ PLATFORM CONTENT ============
    if not inspector.has_table('platform_content'):
        op.create_table(
            'platform_content',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('key', sa.String(100), unique=True, nullable=False),
            sa.Column('value', sa.JSON, nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index('ix_platform_content_key', 'platform_content', ['key'])

    # ============ USERS DUAL AUTH ============
    # Check if column phone_verified exists in users
    columns = [col['name'] for col in inspector.get_columns('users')]
    if 'phone_verified' not in columns:
        op.add_column('users', sa.Column('phone_verified', sa.Boolean, server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'phone_verified')
    op.drop_table('platform_content')
    op.drop_table('lessons')
