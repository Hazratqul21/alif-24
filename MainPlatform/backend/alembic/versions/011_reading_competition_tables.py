"""Create reading competition tables

Revision ID: 011
Revises: 010
"""
from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade():
    # Enums
    competition_status = sa.Enum('draft', 'active', 'scoring', 'finished', 'cancelled', name='competitionstatus')
    task_day = sa.Enum('monday', 'tuesday', 'wednesday', 'thursday', 'friday', name='taskday')
    session_status = sa.Enum('not_started', 'reading', 'questions', 'completed', name='sessionstatus')
    result_group = sa.Enum('fast_reader', 'accurate_reader', 'test_master', 'champion', name='resultgroup')

    competition_status.create(op.get_bind(), checkfirst=True)
    task_day.create(op.get_bind(), checkfirst=True)
    session_status.create(op.get_bind(), checkfirst=True)
    result_group.create(op.get_bind(), checkfirst=True)

    # 1. reading_competitions
    op.create_table(
        "reading_competitions",
        sa.Column("id", sa.String(8), primary_key=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("week_number", sa.Integer, nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("grade_level", sa.String(20), nullable=True),
        sa.Column("language", sa.String(10), server_default="uz"),
        sa.Column("status", competition_status, server_default="draft"),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("created_by", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 2. reading_tasks
    op.create_table(
        "reading_tasks",
        sa.Column("id", sa.String(8), primary_key=True),
        sa.Column("competition_id", sa.String(8), sa.ForeignKey("reading_competitions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day_of_week", task_day, nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("story_text", sa.Text, nullable=False),
        sa.Column("total_words", sa.Integer, nullable=False, server_default="0"),
        sa.Column("questions", sa.JSON, nullable=True),
        sa.Column("time_limit_seconds", sa.Integer, nullable=True),
        sa.Column("order_index", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("competition_id", "day_of_week", name="uq_competition_day"),
    )

    # 3. competition_tests
    op.create_table(
        "competition_tests",
        sa.Column("id", sa.String(8), primary_key=True),
        sa.Column("competition_id", sa.String(8), sa.ForeignKey("reading_competitions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("title", sa.String(300), nullable=True),
        sa.Column("questions", sa.JSON, nullable=True),
        sa.Column("time_limit_minutes", sa.Integer, server_default="30"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 4. reading_sessions
    op.create_table(
        "reading_sessions",
        sa.Column("id", sa.String(8), primary_key=True),
        sa.Column("student_id", sa.String(8), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", sa.String(8), sa.ForeignKey("reading_tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("competition_id", sa.String(8), sa.ForeignKey("reading_competitions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", session_status, server_default="not_started"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reading_time_seconds", sa.Float, nullable=True),
        sa.Column("stt_transcript", sa.Text, nullable=True),
        sa.Column("words_read", sa.Integer, server_default="0"),
        sa.Column("total_words", sa.Integer, server_default="0"),
        sa.Column("completion_percentage", sa.Float, server_default="0"),
        sa.Column("question_answers", sa.JSON, nullable=True),
        sa.Column("questions_correct", sa.Integer, server_default="0"),
        sa.Column("questions_total", sa.Integer, server_default="0"),
        sa.Column("score_completion", sa.Float, server_default="0"),
        sa.Column("score_words", sa.Float, server_default="0"),
        sa.Column("score_time", sa.Float, server_default="0"),
        sa.Column("score_questions", sa.Float, server_default="0"),
        sa.Column("total_score", sa.Float, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("student_id", "task_id", name="uq_student_task"),
    )

    # 5. competition_results
    op.create_table(
        "competition_results",
        sa.Column("id", sa.String(8), primary_key=True),
        sa.Column("student_id", sa.String(8), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("competition_id", sa.String(8), sa.ForeignKey("reading_competitions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("daily_scores", sa.JSON, nullable=True),
        sa.Column("test_score", sa.Float, server_default="0"),
        sa.Column("test_answers", sa.JSON, nullable=True),
        sa.Column("test_correct", sa.Integer, server_default="0"),
        sa.Column("test_total", sa.Integer, server_default="0"),
        sa.Column("total_reading_score", sa.Float, server_default="0"),
        sa.Column("total_score", sa.Float, server_default="0"),
        sa.Column("rank_fast", sa.Integer, nullable=True),
        sa.Column("rank_accurate", sa.Integer, nullable=True),
        sa.Column("rank_test", sa.Integer, nullable=True),
        sa.Column("rank_overall", sa.Integer, nullable=True),
        sa.Column("group", result_group, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("student_id", "competition_id", name="uq_student_competition"),
    )

    # Indexes
    op.create_index("ix_reading_tasks_competition", "reading_tasks", ["competition_id"])
    op.create_index("ix_reading_sessions_student", "reading_sessions", ["student_id"])
    op.create_index("ix_reading_sessions_competition", "reading_sessions", ["competition_id"])
    op.create_index("ix_competition_results_student", "competition_results", ["student_id"])
    op.create_index("ix_competition_results_competition", "competition_results", ["competition_id"])


def downgrade():
    op.drop_table("competition_results")
    op.drop_table("reading_sessions")
    op.drop_table("competition_tests")
    op.drop_table("reading_tasks")
    op.drop_table("reading_competitions")

    sa.Enum(name='resultgroup').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='sessionstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='taskday').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='competitionstatus').drop(op.get_bind(), checkfirst=True)
