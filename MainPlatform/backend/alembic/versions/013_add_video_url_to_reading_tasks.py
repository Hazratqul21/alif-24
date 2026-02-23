"""Add video_url to reading_tasks

Revision ID: 013
Revises: 012
"""
from alembic import op
import sqlalchemy as sa

revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if inspector.has_table('reading_tasks'):
        columns = [c['name'] for c in inspector.get_columns('reading_tasks')]
        if 'video_url' not in columns:
            op.add_column('reading_tasks', sa.Column('video_url', sa.String(500), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if inspector.has_table('reading_tasks'):
        columns = [c['name'] for c in inspector.get_columns('reading_tasks')]
        if 'video_url' in columns:
            op.drop_column('reading_tasks', 'video_url')
