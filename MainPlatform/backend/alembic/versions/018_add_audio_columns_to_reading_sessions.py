"""Add audio columns to reading_sessions

Revision ID: 018
Revises: 017
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def _column_exists(conn, table, column):
    inspector = Inspector.from_engine(conn)
    columns = [c['name'] for c in inspector.get_columns(table)]
    return column in columns


def upgrade():
    conn = op.get_bind()

    # reading_sessions — audio columns added in model but missing from migration 011
    if not _column_exists(conn, 'reading_sessions', 'audio_url'):
        op.add_column('reading_sessions', sa.Column('audio_url', sa.String(500), nullable=True))

    if not _column_exists(conn, 'reading_sessions', 'audio_filename'):
        op.add_column('reading_sessions', sa.Column('audio_filename', sa.String(200), nullable=True))

    if not _column_exists(conn, 'reading_sessions', 'audio_duration_seconds'):
        op.add_column('reading_sessions', sa.Column('audio_duration_seconds', sa.Float, nullable=True))


def downgrade():
    op.drop_column('reading_sessions', 'audio_duration_seconds')
    op.drop_column('reading_sessions', 'audio_filename')
    op.drop_column('reading_sessions', 'audio_url')
