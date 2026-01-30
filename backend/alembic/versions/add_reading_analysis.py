"""Add reading_analysis table

Revision ID: add_reading_analysis
Revises: 
Create Date: 2026-01-14 22:30:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_reading_analysis'
down_revision = 'initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Reading analysis jadvalini yaratish
    op.create_table('reading_analyses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('story_title', sa.String(length=255), nullable=True),
        sa.Column('total_words_read', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('reading_time_seconds', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('speech_errors', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('pronunciation_score', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('fluency_score', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('comprehension_score', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('expression_quality', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('total_questions', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('correct_answers', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('answer_quality_score', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('conversation_history', sa.JSON(), nullable=True),
        sa.Column('detailed_analysis', sa.JSON(), nullable=True),
        sa.Column('ai_feedback', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    
    # Add foreign key and indexes
    op.create_foreign_key('fk_reading_analyses_user_id', 'reading_analyses', 'users', ['user_id'], ['id'])
    op.create_index('ix_reading_analyses_user_id', 'reading_analyses', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_reading_analyses_user_id', table_name='reading_analyses')
    op.drop_table('reading_analyses')
