"""
016: lessons.attachments ustun qo'shish

Revision ID: 016
Revises: 015
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import inspect as sa_inspect

revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Column bazada bormi tekshirish"""
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    if not column_exists('lessons', 'attachments'):
        op.add_column('lessons', sa.Column('attachments', JSON, nullable=True))


def downgrade():
    op.drop_column('lessons', 'attachments')
