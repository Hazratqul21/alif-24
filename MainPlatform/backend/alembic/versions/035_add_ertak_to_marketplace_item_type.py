"""Add ertak to marketplaceitemtype enum

Revision ID: 035
Revises: 034
Create Date: 2026-05-15
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '035'
down_revision = '034'
branch_labels = None
depends_on = None


def upgrade():
    # PostgreSQL enum ga yangi qiymat qo'shish
    op.execute("ALTER TYPE marketplaceitemtype ADD VALUE IF NOT EXISTS 'ertak'")


def downgrade():
    # PostgreSQL enum dan qiymat o'chirib bo'lmaydi,
    # shuning uchun downgrade'da hech narsa qilmaymiz
    pass
