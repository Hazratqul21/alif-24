"""Update olympiad reading submissions schema

Revision ID: 022
Revises: 021
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def _column_exists(conn, table_name, column_name):
    inspector = Inspector.from_engine(conn)
    if table_name not in inspector.get_table_names():
        return False
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    conn = op.get_bind()
    if not _column_exists(conn, "olympiad_reading_submissions", "story_id"):
        op.add_column("olympiad_reading_submissions", sa.Column("story_id", sa.String(8), sa.ForeignKey("olympiad_stories.id"), nullable=True))
    if not _column_exists(conn, "olympiad_reading_submissions", "read_percent"):
        op.add_column("olympiad_reading_submissions", sa.Column("read_percent", sa.Float(), nullable=True))
    if not _column_exists(conn, "olympiad_reading_submissions", "earned_coins"):
        op.add_column("olympiad_reading_submissions", sa.Column("earned_coins", sa.Integer(), nullable=True))
        
    # Make reading_task_id nullable
    op.alter_column("olympiad_reading_submissions", "reading_task_id", existing_type=sa.String(8), nullable=True)


def downgrade():
    conn = op.get_bind()
    if _column_exists(conn, "olympiad_reading_submissions", "story_id"):
        op.drop_column("olympiad_reading_submissions", "story_id")
    if _column_exists(conn, "olympiad_reading_submissions", "read_percent"):
        op.drop_column("olympiad_reading_submissions", "read_percent")
    if _column_exists(conn, "olympiad_reading_submissions", "earned_coins"):
        op.drop_column("olympiad_reading_submissions", "earned_coins")
    
    # Optional logic to revert reading_task_id to NOT NULL can be added here
