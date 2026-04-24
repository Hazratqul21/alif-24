"""Prize-grade olympiad hardening

Revision ID: 031
Revises: 030

Changes (all idempotent — safe to re-run on existing production DBs):

1. olympiad_reading_submissions
   - Add UniqueConstraint on (participant_id, story_id, reading_task_id)
     named `uq_reading_submission_per_story`. Prevents duplicate-submit
     coin farming in race conditions (Phase-1 submit added SELECT FOR
     UPDATE but a DB-level guard is still required for correctness).
   - Indexed by (olympiad_id, total_points DESC) for fast leaderboard.

2. olympiad_participants
   - Index on (olympiad_id, total_score DESC, time_spent_seconds ASC)
     — Phase-2 finalize scans this with tiebreakers.

Note: `audit_logs` table already exists (shared.database.models.analytics.AuditLog)
— we reuse that instead of creating a new one.

Kontekst:
  Prize-bearing olimpiada oldidan:
  - race-condition himoya (DB-level unique)
  - finalize uchun fast sort (index)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None


def _table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return column_name in {c["name"] for c in inspector.get_columns(table_name)}


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return index_name in {i["name"] for i in inspector.get_indexes(table_name)}


def _constraint_exists(inspector, table_name: str, constraint_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    uniques = {u["name"] for u in inspector.get_unique_constraints(table_name)}
    return constraint_name in uniques


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    # ── olympiad_reading_submissions: unique per (participant, story, reading_task) ──
    if _table_exists(inspector, "olympiad_reading_submissions"):
        if not _constraint_exists(
            inspector, "olympiad_reading_submissions", "uq_reading_submission_per_story"
        ):
            # Drop any duplicate rows first, otherwise the constraint can't be added.
            # Keep the earliest (lowest id) per key — duplicates shouldn't exist but
            # legacy data from before Phase-1 might.
            op.execute(
                """
                DELETE FROM olympiad_reading_submissions s
                USING olympiad_reading_submissions s2
                WHERE s.id > s2.id
                  AND s.participant_id = s2.participant_id
                  AND COALESCE(s.story_id, '') = COALESCE(s2.story_id, '')
                  AND COALESCE(s.reading_task_id, '') = COALESCE(s2.reading_task_id, '')
                """
            )
            op.create_unique_constraint(
                "uq_reading_submission_per_story",
                "olympiad_reading_submissions",
                ["participant_id", "story_id", "reading_task_id"],
            )

        if not _index_exists(
            inspector, "olympiad_reading_submissions", "ix_reading_submissions_leaderboard"
        ):
            op.create_index(
                "ix_reading_submissions_leaderboard",
                "olympiad_reading_submissions",
                ["olympiad_id", sa.text("total_points DESC")],
            )

    # ── olympiad_participants: fast finalize ordering ──
    if _table_exists(inspector, "olympiad_participants"):
        if not _index_exists(
            inspector, "olympiad_participants", "ix_participants_rank_order"
        ):
            op.create_index(
                "ix_participants_rank_order",
                "olympiad_participants",
                [
                    "olympiad_id",
                    sa.text("total_score DESC"),
                    sa.text("time_spent_seconds ASC NULLS LAST"),
                ],
            )


def downgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    if _index_exists(inspector, "olympiad_participants", "ix_participants_rank_order"):
        op.drop_index("ix_participants_rank_order", table_name="olympiad_participants")

    if _index_exists(
        inspector, "olympiad_reading_submissions", "ix_reading_submissions_leaderboard"
    ):
        op.drop_index(
            "ix_reading_submissions_leaderboard",
            table_name="olympiad_reading_submissions",
        )

    if _constraint_exists(
        inspector, "olympiad_reading_submissions", "uq_reading_submission_per_story"
    ):
        op.drop_constraint(
            "uq_reading_submission_per_story",
            "olympiad_reading_submissions",
            type_="unique",
        )
