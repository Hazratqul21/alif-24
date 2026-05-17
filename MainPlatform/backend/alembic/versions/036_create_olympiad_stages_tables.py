"""Create olympiad stages tables and missing olympiads columns

Revision ID: 036
Revises: 035
Create Date: 2026-05-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '036'
down_revision = '035'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # 1. Create enum types if not exist
    conn.execute(text("DO $$ BEGIN CREATE TYPE scopetype AS ENUM ('school', 'district', 'region', 'republic'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;"))
    conn.execute(text("DO $$ BEGIN CREATE TYPE stagecontenttype AS ENUM ('test', 'reading', 'mixed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;"))

    # 2. Add missing columns to olympiads table if not exist
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='olympiads' AND column_name='is_multi_stage'"))
    if not result.fetchone():
        op.add_column('olympiads', sa.Column('is_multi_stage', sa.Boolean(), server_default='false', nullable=True))

    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='olympiads' AND column_name='total_stages'"))
    if not result.fetchone():
        op.add_column('olympiads', sa.Column('total_stages', sa.Integer(), server_default='1', nullable=True))

    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='olympiads' AND column_name='allowed_classes'"))
    if not result.fetchone():
        op.add_column('olympiads', sa.Column('allowed_classes', sa.JSON(), nullable=True))

    # 3. Create olympiad_stages table if not exists
    result = conn.execute(text("SELECT to_regclass('public.olympiad_stages')"))
    if result.scalar() is None:
        op.create_table(
            'olympiad_stages',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('olympiad_id', sa.String(8), sa.ForeignKey('olympiads.id', ondelete='CASCADE'), nullable=False),
            sa.Column('stage_number', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(200), nullable=True),
            sa.Column('scope_type', sa.Enum('school', 'district', 'region', 'republic', name='scopetype', create_type=False), server_default='school', nullable=False),
            sa.Column('content_type', sa.Enum('test', 'reading', 'mixed', name='stagecontenttype', create_type=False), server_default='test', nullable=False),
            sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
            sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
            sa.Column('requirements', sa.Text(), nullable=True),
            sa.Column('passing_percent', sa.Float(), server_default='30.0', nullable=True),
            sa.Column('passing_min_count', sa.Integer(), server_default='1', nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        )

    # 4. Create olympiad_stage_results table if not exists
    result = conn.execute(text("SELECT to_regclass('public.olympiad_stage_results')"))
    if result.scalar() is None:
        op.create_table(
            'olympiad_stage_results',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('participant_id', sa.String(8), sa.ForeignKey('olympiad_participants.id', ondelete='CASCADE'), nullable=False),
            sa.Column('stage_id', sa.String(8), sa.ForeignKey('olympiad_stages.id', ondelete='CASCADE'), nullable=False),
            sa.Column('score', sa.Float(), server_default='0.0', nullable=True),
            sa.Column('duration_seconds', sa.Integer(), server_default='0', nullable=True),
            sa.Column('rank_in_group', sa.Integer(), nullable=True),
            sa.Column('is_passed', sa.Boolean(), server_default='false', nullable=True),
            sa.Column('completed_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # 5. Create indexes safely
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_stage_olympiad_id ON olympiad_stages (olympiad_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_stage_number ON olympiad_stages (olympiad_id, stage_number)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_stage_result_participant ON olympiad_stage_results (participant_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_stage_result_stage ON olympiad_stage_results (stage_id)"))


def downgrade():
    op.drop_index('ix_stage_result_stage')
    op.drop_index('ix_stage_result_participant')
    op.drop_index('ix_stage_number')
    op.drop_index('ix_stage_olympiad_id')
    op.drop_table('olympiad_stage_results')
    op.drop_table('olympiad_stages')
    op.drop_column('olympiads', 'allowed_classes')
    op.drop_column('olympiads', 'total_stages')
    op.drop_column('olympiads', 'is_multi_stage')
