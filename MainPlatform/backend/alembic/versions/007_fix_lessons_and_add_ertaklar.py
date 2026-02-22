"""Fix lessons table (teacher_id nullable, add language) and create ertaklar table

Revision ID: 007
Revises: 006
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # ============ FIX LESSONS TABLE ============

    # 1. Make teacher_id nullable (admin creates lessons without teacher)
    result = conn.execute(text(
        "SELECT column_name, is_nullable FROM information_schema.columns "
        "WHERE table_name='lessons' AND column_name='teacher_id'"
    ))
    row = result.fetchone()
    if row and row[1] == 'NO':
        op.alter_column('lessons', 'teacher_id', nullable=True)

    # 2. Add language column if not exists
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='lessons' AND column_name='language'"
    ))
    if not result.fetchone():
        op.add_column('lessons', sa.Column('language', sa.String(10), server_default='uz', nullable=True))

    # ============ CREATE ERTAKLAR TABLE ============

    result = conn.execute(text("SELECT to_regclass('public.ertaklar')"))
    if result.scalar() is None:
        op.create_table(
            'ertaklar',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('title', sa.String(200), nullable=False),
            sa.Column('content', sa.Text, nullable=False),
            sa.Column('language', sa.String(5), server_default='uz'),
            sa.Column('age_group', sa.String(10), server_default='6-8'),
            sa.Column('has_audio', sa.Boolean, server_default='false'),
            sa.Column('audio_url', sa.String(500), nullable=True),
            sa.Column('view_count', sa.Integer, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )


def downgrade():
    op.drop_table('ertaklar')
    op.drop_column('lessons', 'language')
    op.alter_column('lessons', 'teacher_id', nullable=False)
