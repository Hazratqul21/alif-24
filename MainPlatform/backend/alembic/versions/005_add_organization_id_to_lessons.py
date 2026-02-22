"""Add organization_id to lessons table

Revision ID: 005
Revises: 004
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('lessons', sa.Column('organization_id', sa.String(8), sa.ForeignKey('organization_profiles.id'), nullable=True))


def downgrade():
    op.drop_column('lessons', 'organization_id')
