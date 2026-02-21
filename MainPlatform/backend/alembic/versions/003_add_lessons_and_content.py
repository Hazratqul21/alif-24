"""Add lessons, platform content, users phone_verified
Revision ID: 003
Revises: 002
Create Date: 2026-02-20
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. users tepadagi jadvaliga phone_verified qo'shish
    try:
        op.add_column('users', sa.Column('phone_verified', sa.Boolean(), server_default='false', nullable=False))
    except Exception as e:
        print(f"Column phone_verified might already exist: {e}")

    # 2. lessons jadvali
    op.create_table(
        'lessons',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('teacher_id', sa.String(length=8), sa.ForeignKey('teacher_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('subject', sa.String(length=100), nullable=True),
        sa.Column('grade_level', sa.String(length=20), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('video_url', sa.String(length=500), nullable=True),
        sa.Column('attachments', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_lessons_teacher_id'), 'lessons', ['teacher_id'], unique=False)

    # 3. platform_content jadvali
    op.create_table(
        'platform_content',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('key', sa.String(length=100), unique=True, nullable=False),
        sa.Column('value', sa.JSON(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f('ix_platform_content_key'), 'platform_content', ['key'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_platform_content_key'), table_name='platform_content')
    op.drop_table('platform_content')
    
    op.drop_index(op.f('ix_lessons_teacher_id'), table_name='lessons')
    op.drop_table('lessons')
    
    op.drop_column('users', 'phone_verified')
