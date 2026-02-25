"""017 — audio_cache table

Revision ID: 017
Revises: 016
"""
from alembic import op
import sqlalchemy as sa

revision = '017'
down_revision = '016'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'audio_cache',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('cache_key', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('text_hash', sa.String(64), nullable=False),
        sa.Column('language', sa.String(10), server_default='uz'),
        sa.Column('voice_gender', sa.String(10), server_default='female'),
        sa.Column('audio_data', sa.Text(), nullable=True),
        sa.Column('audio_url', sa.String(500), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('hit_count', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('audio_cache')
