"""Add olympiad reading tables and type column

Revision ID: 006
Revises: 005
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # Create enum type if not exists
    conn.execute(text("DO $$ BEGIN CREATE TYPE olympiadtype AS ENUM ('test', 'reading', 'mixed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;"))

    # Add type column if not exists
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='olympiads' AND column_name='type'"))
    if not result.fetchone():
        op.add_column('olympiads', sa.Column('type', sa.Enum('test', 'reading', 'mixed', name='olympiadtype', create_type=False), server_default='test', nullable=True))

    # Add grade_level column if not exists
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='olympiads' AND column_name='grade_level'"))
    if not result.fetchone():
        op.add_column('olympiads', sa.Column('grade_level', sa.String(20), nullable=True))

    # Create olympiad_reading_tasks table if not exists
    result = conn.execute(text("SELECT to_regclass('public.olympiad_reading_tasks')"))
    if result.scalar() is None:
        op.create_table(
            'olympiad_reading_tasks',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('olympiad_id', sa.String(8), sa.ForeignKey('olympiads.id'), nullable=False),
            sa.Column('title', sa.String(300), nullable=False),
            sa.Column('text_content', sa.Text, nullable=False),
            sa.Column('word_count', sa.Integer, default=0),
            sa.Column('difficulty', sa.String(20), default='medium'),
            sa.Column('order', sa.Integer, default=0),
            sa.Column('comprehension_questions', sa.JSON, nullable=True),
            sa.Column('time_limit_seconds', sa.Integer, default=300),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # Create olympiad_reading_submissions table if not exists
    result = conn.execute(text("SELECT to_regclass('public.olympiad_reading_submissions')"))
    if result.scalar() is None:
        op.create_table(
            'olympiad_reading_submissions',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('participant_id', sa.String(8), sa.ForeignKey('olympiad_participants.id'), nullable=False),
            sa.Column('reading_task_id', sa.String(8), sa.ForeignKey('olympiad_reading_tasks.id'), nullable=False),
            sa.Column('audio_url', sa.String(500), nullable=True),
            sa.Column('reading_duration_seconds', sa.Integer, default=0),
            sa.Column('words_per_minute', sa.Float, default=0.0),
            sa.Column('comprehension_answers', sa.JSON, nullable=True),
            sa.Column('comprehension_score', sa.Integer, default=0),
            sa.Column('comprehension_total', sa.Integer, default=0),
            sa.Column('admin_pronunciation_score', sa.Integer, nullable=True),
            sa.Column('admin_fluency_score', sa.Integer, nullable=True),
            sa.Column('admin_accuracy_score', sa.Integer, nullable=True),
            sa.Column('admin_total_score', sa.Integer, nullable=True),
            sa.Column('admin_notes', sa.Text, nullable=True),
            sa.Column('graded_by', sa.String(8), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('graded_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('total_points', sa.Integer, default=0),
            sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # Indexes (safe — PostgreSQL will error only if name conflicts, so we use try/except approach via raw SQL)
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reading_tasks_olympiad ON olympiad_reading_tasks (olympiad_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reading_subs_participant ON olympiad_reading_submissions (participant_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reading_subs_task ON olympiad_reading_submissions (reading_task_id)"))


def downgrade():
    op.drop_index('ix_reading_subs_task')
    op.drop_index('ix_reading_subs_participant')
    op.drop_index('ix_reading_tasks_olympiad')
    op.drop_table('olympiad_reading_submissions')
    op.drop_table('olympiad_reading_tasks')
    op.drop_column('olympiads', 'grade_level')
    op.drop_column('olympiads', 'type')
