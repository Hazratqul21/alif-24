"""
016: lessons.attachments ust  un qo'shish

PostgreSQL xatolik: column lessons.attachments does not exist
Model'da bor lekin bazada yo'q edi.

Revision ID: 016
Revises: 015
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('lessons', sa.Column('attachments', JSON, nullable=True))


def downgrade():
    op.drop_column('lessons', 'attachments')
