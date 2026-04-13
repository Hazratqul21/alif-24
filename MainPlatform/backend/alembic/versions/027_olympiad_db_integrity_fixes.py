"""Olympiad DB integrity fixes: indexes, constraints, ondelete, column fixes

Revision ID: 027
Revises: 026

Changes:
- Add unique constraint (olympiad_id, student_id) on olympiad_participants
- Add unique constraint (participant_id, question_id) on olympiad_answers
- Add indexes on frequently queried FK columns
- Fix graded_by: drop FK to users, alter to String(50)
- Add ondelete CASCADE to FK columns
- Add updated_at to olympiad_participants and olympiad_stories
- Add indexes on olympiads (status, subject, created_at)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def _column_exists(inspector, table_name, column_name):
    if table_name not in inspector.get_table_names():
        return False
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def _index_exists(inspector, table_name, index_name):
    if table_name not in inspector.get_table_names():
        return False
    indexes = inspector.get_indexes(table_name)
    return any(idx['name'] == index_name for idx in indexes)


def _constraint_exists(inspector, table_name, constraint_name):
    if table_name not in inspector.get_table_names():
        return False
    uqs = inspector.get_unique_constraints(table_name)
    return any(c['name'] == constraint_name for c in uqs)


def _fk_exists(inspector, table_name, fk_name):
    if table_name not in inspector.get_table_names():
        return False
    fks = inspector.get_foreign_keys(table_name)
    return any(fk.get('name') == fk_name for fk in fks)


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    # ================================================================
    # 1. Fix graded_by: drop FK to users if exists, alter to String(50)
    # ================================================================
    if "olympiad_reading_submissions" in inspector.get_table_names():
        fks = inspector.get_foreign_keys("olympiad_reading_submissions")
        for fk in fks:
            if "graded_by" in fk.get("constrained_columns", []):
                op.drop_constraint(fk["name"], "olympiad_reading_submissions", type_="foreignkey")
                break

        op.alter_column(
            "olympiad_reading_submissions", "graded_by",
            existing_type=sa.String(8),
            type_=sa.String(50),
            nullable=True
        )

    # ================================================================
    # 2. Unique constraints
    # ================================================================
    if not _constraint_exists(inspector, "olympiad_participants", "uq_participant_olympiad_student"):
        op.create_unique_constraint(
            "uq_participant_olympiad_student",
            "olympiad_participants",
            ["olympiad_id", "student_id"]
        )

    if not _constraint_exists(inspector, "olympiad_answers", "uq_answer_participant_question"):
        op.create_unique_constraint(
            "uq_answer_participant_question",
            "olympiad_answers",
            ["participant_id", "question_id"]
        )

    # ================================================================
    # 3. Indexes on olympiads table
    # ================================================================
    for idx_name, col in [
        ("ix_olympiad_status", "status"),
        ("ix_olympiad_subject", "subject"),
        ("ix_olympiad_created_at", "created_at"),
    ]:
        if not _index_exists(inspector, "olympiads", idx_name):
            op.create_index(idx_name, "olympiads", [col])

    # ================================================================
    # 4. Indexes on FK columns
    # ================================================================
    fk_indexes = [
        ("ix_question_olympiad_id", "olympiad_questions", "olympiad_id"),
        ("ix_participant_olympiad_id", "olympiad_participants", "olympiad_id"),
        ("ix_participant_student_id", "olympiad_participants", "student_id"),
        ("ix_answer_participant_id", "olympiad_answers", "participant_id"),
        ("ix_answer_question_id", "olympiad_answers", "question_id"),
        ("ix_reading_task_olympiad_id", "olympiad_reading_tasks", "olympiad_id"),
        ("ix_reading_sub_participant_id", "olympiad_reading_submissions", "participant_id"),
        ("ix_reading_sub_task_id", "olympiad_reading_submissions", "reading_task_id"),
        ("ix_lesson_olympiad_id", "olympiad_lessons", "olympiad_id"),
        ("ix_story_olympiad_id", "olympiad_stories", "olympiad_id"),
    ]
    for idx_name, table, col in fk_indexes:
        if table in inspector.get_table_names() and not _index_exists(inspector, table, idx_name):
            op.create_index(idx_name, table, [col])

    # ================================================================
    # 5. Add updated_at columns
    # ================================================================
    if not _column_exists(inspector, "olympiad_participants", "updated_at"):
        op.add_column("olympiad_participants", sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=True
        ))

    if not _column_exists(inspector, "olympiad_stories", "updated_at"):
        op.add_column("olympiad_stories", sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=True
        ))

    # ================================================================
    # 6. Update ondelete CASCADE on ForeignKeys
    # These require dropping and recreating the FK constraints.
    # We handle this safely by checking existing FKs.
    # ================================================================
    cascade_updates = [
        ("olympiad_questions", "olympiad_id", "olympiads", "id"),
        ("olympiad_participants", "olympiad_id", "olympiads", "id"),
        ("olympiad_participants", "student_id", "student_profiles", "id"),
        ("olympiad_answers", "participant_id", "olympiad_participants", "id"),
        ("olympiad_answers", "question_id", "olympiad_questions", "id"),
        ("olympiad_reading_tasks", "olympiad_id", "olympiads", "id"),
        ("olympiad_reading_submissions", "participant_id", "olympiad_participants", "id"),
    ]

    for table, col, ref_table, ref_col in cascade_updates:
        if table not in inspector.get_table_names():
            continue
        fks = inspector.get_foreign_keys(table)
        for fk in fks:
            if col in fk.get("constrained_columns", []) and fk.get("referred_table") == ref_table:
                fk_name = fk.get("name")
                if fk_name:
                    op.drop_constraint(fk_name, table, type_="foreignkey")
                    op.create_foreign_key(
                        fk_name, table,
                        ref_table, [col], [ref_col],
                        ondelete="CASCADE"
                    )
                break

    # reading_task_id and story_id → SET NULL on delete
    set_null_updates = [
        ("olympiad_reading_submissions", "reading_task_id", "olympiad_reading_tasks", "id"),
        ("olympiad_reading_submissions", "story_id", "olympiad_stories", "id"),
    ]
    for table, col, ref_table, ref_col in set_null_updates:
        if table not in inspector.get_table_names():
            continue
        if not _column_exists(inspector, table, col):
            continue
        fks = inspector.get_foreign_keys(table)
        for fk in fks:
            if col in fk.get("constrained_columns", []) and fk.get("referred_table") == ref_table:
                fk_name = fk.get("name")
                if fk_name:
                    op.drop_constraint(fk_name, table, type_="foreignkey")
                    op.create_foreign_key(
                        fk_name, table,
                        ref_table, [col], [ref_col],
                        ondelete="SET NULL"
                    )
                break


def downgrade():
    """Partial downgrade: removes columns, unique constraints, and indexes added in upgrade.
    NOTE: FK CASCADE/SET NULL changes and graded_by type changes are NOT reverted.
    A full rollback requires restoring from backup."""
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    if _column_exists(inspector, "olympiad_stories", "updated_at"):
        op.drop_column("olympiad_stories", "updated_at")
    if _column_exists(inspector, "olympiad_participants", "updated_at"):
        op.drop_column("olympiad_participants", "updated_at")

    if _constraint_exists(inspector, "olympiad_answers", "uq_answer_participant_question"):
        op.drop_constraint("uq_answer_participant_question", "olympiad_answers", type_="unique")
    if _constraint_exists(inspector, "olympiad_participants", "uq_participant_olympiad_student"):
        op.drop_constraint("uq_participant_olympiad_student", "olympiad_participants", type_="unique")

    for idx_name, table, _ in [
        ("ix_olympiad_status", "olympiads", None),
        ("ix_olympiad_subject", "olympiads", None),
        ("ix_olympiad_created_at", "olympiads", None),
        ("ix_question_olympiad_id", "olympiad_questions", None),
        ("ix_participant_olympiad_id", "olympiad_participants", None),
        ("ix_participant_student_id", "olympiad_participants", None),
        ("ix_answer_participant_id", "olympiad_answers", None),
        ("ix_answer_question_id", "olympiad_answers", None),
        ("ix_reading_task_olympiad_id", "olympiad_reading_tasks", None),
        ("ix_reading_sub_participant_id", "olympiad_reading_submissions", None),
        ("ix_reading_sub_task_id", "olympiad_reading_submissions", None),
        ("ix_lesson_olympiad_id", "olympiad_lessons", None),
        ("ix_story_olympiad_id", "olympiad_stories", None),
    ]:
        if table in inspector.get_table_names() and _index_exists(inspector, table, idx_name):
            op.drop_index(idx_name, table_name=table)
