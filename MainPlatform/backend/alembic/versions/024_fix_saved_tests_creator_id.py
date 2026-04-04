"""Fix saved_tests creator_id - remove FK constraint, make nullable, expand size

The creator_id column had a ForeignKey to users.id which prevented
admin-created olympiad tests (creator_id='admin') from being saved.
This migration drops the FK constraint, makes the column nullable,
and expands it to String(50).

Revision ID: 024
Revises: 023
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    # Check if saved_tests table exists
    if "saved_tests" not in inspector.get_table_names():
        # Create the table if it doesn't exist
        op.create_table(
            "saved_tests",
            sa.Column("id", sa.String(8), primary_key=True),
            sa.Column("creator_id", sa.String(50), nullable=True, index=True),
            sa.Column("title", sa.String(500), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("subject", sa.String(200), nullable=True),
            sa.Column("topic", sa.String(500), nullable=True),
            sa.Column("difficulty", sa.String(50), server_default="medium"),
            sa.Column("language", sa.String(10), server_default="uz"),
            sa.Column("status", sa.String(20), server_default="draft"),
            sa.Column("questions", sa.JSON(), nullable=True),
            sa.Column("questions_count", sa.Integer(), server_default="0"),
            sa.Column("ai_generated", sa.String(10), server_default="no"),
            sa.Column("source_platform", sa.String(100), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        return

    # Table exists — fix creator_id column
    # 1. Drop FK constraint on creator_id if it exists
    fks = inspector.get_foreign_keys("saved_tests")
    for fk in fks:
        if "creator_id" in fk.get("constrained_columns", []):
            fk_name = fk.get("name")
            if fk_name:
                op.drop_constraint(fk_name, "saved_tests", type_="foreignkey")

    # 2. Alter column: make nullable, expand to String(50)
    with op.batch_alter_table("saved_tests") as batch_op:
        batch_op.alter_column(
            "creator_id",
            existing_type=sa.String(8),
            type_=sa.String(50),
            nullable=True,
        )


def downgrade():
    with op.batch_alter_table("saved_tests") as batch_op:
        batch_op.alter_column(
            "creator_id",
            existing_type=sa.String(50),
            type_=sa.String(8),
            nullable=False,
        )
