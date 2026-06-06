"""Add live_quiz to marketplaceitemtype enum

Revision ID: 041
Revises: 040
Create Date: 2026-06-06
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '041'
down_revision = '040'
branch_labels = None
depends_on = None


def upgrade():
    # PostgreSQL enum ga yangi qiymat qo'shish
    op.execute("ALTER TYPE marketplaceitemtype ADD VALUE IF NOT EXISTS 'live_quiz'")


def downgrade():
    # PostgreSQL enum dan qiymat o'chirib bo'lmaydi,
    # shuning uchun downgrade'da hech narsa qilmaymiz
    pass
