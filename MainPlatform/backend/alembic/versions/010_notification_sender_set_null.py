"""Fix FK constraints referencing users.id to allow safe user deletion

Revision ID: 010
Revises: 009
"""
from alembic import op

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None

# All FK constraints on users.id that need SET NULL for safe deletion
SET_NULL_FKS = [
    ("in_app_notifications", "in_app_notifications_sender_id_fkey", "sender_id"),
    ("notification_logs", "notification_logs_user_id_fkey", "user_id"),
    ("assignments", "assignments_created_by_fkey", "created_by"),
    ("assignment_submissions", "assignment_submissions_graded_by_fkey", "graded_by"),
    ("classroom_invitations", "classroom_invitations_invited_by_fkey", "invited_by"),
    ("classroom_invitations", "classroom_invitations_student_user_id_fkey", "student_user_id"),
    ("teacher_profiles", "teacher_profiles_verified_by_fkey", "verified_by"),
    ("olympiads", "olympiads_created_by_fkey", "created_by"),
    ("olympiad_reading_submissions", "olympiad_reading_submissions_graded_by_fkey", "graded_by"),
    ("quiz_attempts", "quiz_attempts_user_id_fkey", "user_id"),
    ("game_sessions", "game_sessions_profile_id_fkey", "profile_id"),
    ("coin_withdrawals", "coin_withdrawals_processed_by_fkey", "processed_by"),
    ("user_avatars", "user_avatars_user_id_fkey", "user_id"),
    ("student_profiles", "student_profiles_parent_user_id_fkey", "parent_user_id"),
    ("users", "users_parent_id_fkey", "parent_id"),
]


def upgrade():
    for table, fk_name, col in SET_NULL_FKS:
        try:
            op.drop_constraint(fk_name, table, type_="foreignkey")
            op.create_foreign_key(fk_name, table, "users", [col], ["id"], ondelete="SET NULL")
        except Exception:
            pass  # Skip if constraint doesn't exist


def downgrade():
    for table, fk_name, col in SET_NULL_FKS:
        try:
            op.drop_constraint(fk_name, table, type_="foreignkey")
            op.create_foreign_key(fk_name, table, "users", [col], ["id"])
        except Exception:
            pass
