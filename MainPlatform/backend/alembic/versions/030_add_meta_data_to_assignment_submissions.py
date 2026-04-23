"""Add meta_data column to assignment_submissions

Revision ID: 030
Revises: 029

Changes (idempotent — safe to run on existing production DBs):
- assignment_submissions.meta_data JSON NULL

Kontekst:
  AssignmentSubmission modelida `meta_data = Column(JSON)` allaqachon e'lon
  qilingan (Gradebook va TestAI natijalari uchun: correct/incorrect/total/...).
  Biroq, dastlabki migration (002_lms_classrooms_assignments_notifications) bu
  ustunni yaratmagan. Natijada production DB'da UndefinedColumnError yuz beradi
  (`/api/v1/students/assignments`, `/api/v1/dashboard/student` va h.k. 500).

  Bu migration muammoni bartaraf etadi va hech qanday ma'lumotga ta'sir qilmaydi.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {c["name"] for c in inspector.get_columns(table_name)}


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    if not _column_exists(inspector, "assignment_submissions", "meta_data"):
        op.add_column(
            "assignment_submissions",
            sa.Column("meta_data", sa.JSON(), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    if _column_exists(inspector, "assignment_submissions", "meta_data"):
        op.drop_column("assignment_submissions", "meta_data")
