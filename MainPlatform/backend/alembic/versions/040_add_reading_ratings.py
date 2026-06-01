"""Add reading ratings and optional pdf

Revision ID: 040
Revises: 039
Create Date: 2026-06-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '040'
down_revision = '039'
branch_labels = None
depends_on = None

def _column_exists(conn, table, column):
    result = conn.execute(text(
        f"SELECT column_name FROM information_schema.columns "
        f"WHERE table_name='{table}' AND column_name='{column}'"
    ))
def _table_exists(conn, table):
    result = conn.execute(text(
        f"SELECT table_name FROM information_schema.tables "
        f"WHERE table_schema='public' AND table_name='{table}'"
    ))
    return result.fetchone() is not None

def upgrade():
    conn = op.get_bind()

    # 1. Update kitoblar.pdf_url to be nullable
    op.alter_column('kitoblar', 'pdf_url',
               existing_type=sa.String(length=500),
               nullable=True)

    # 2. Add new columns to book_reading_records
    if not _column_exists(conn, 'book_reading_records', 'max_score'):
        op.add_column('book_reading_records', sa.Column('max_score', sa.Integer(), server_default='0', nullable=False))
        
    if not _column_exists(conn, 'book_reading_records', 'is_counted'):
        op.add_column('book_reading_records', sa.Column('is_counted', sa.Boolean(), server_default='false', nullable=False))
        
    if not _column_exists(conn, 'book_reading_records', 'source_type'):
        op.add_column('book_reading_records', sa.Column('source_type', sa.String(length=20), server_default='library', nullable=False))

    # 3. Create reading_ratings table
    if not _table_exists(conn, 'reading_ratings'):
        op.create_table('reading_ratings',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('student_id', sa.String(length=8), nullable=False),
            sa.Column('period', sa.String(length=20), nullable=False),
            sa.Column('period_key', sa.String(length=20), nullable=False),
            sa.Column('total_books', sa.Integer(), nullable=False),
            sa.Column('total_score', sa.Integer(), nullable=False),
            sa.Column('previous_score', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['student_id'], ['users.id'], name='fk_reading_rating_student'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('student_id', 'period', 'period_key', name='uq_reading_rating_student_period')
        )
        
        op.create_index('idx_reading_rating_leaderboard', 'reading_ratings', ['period', 'period_key', 'total_score', 'total_books'], unique=False)
        op.create_index('idx_reading_rating_student_period', 'reading_ratings', ['student_id', 'period', 'period_key'], unique=False)


def downgrade():
    conn = op.get_bind()
    
    op.drop_index('idx_reading_rating_student_period', table_name='reading_ratings')
    op.drop_index('idx_reading_rating_leaderboard', table_name='reading_ratings')
    op.drop_table('reading_ratings')

    if _column_exists(conn, 'book_reading_records', 'source_type'):
        op.drop_column('book_reading_records', 'source_type')
        
    if _column_exists(conn, 'book_reading_records', 'is_counted'):
        op.drop_column('book_reading_records', 'is_counted')
        
    if _column_exists(conn, 'book_reading_records', 'max_score'):
        op.drop_column('book_reading_records', 'max_score')

    op.alter_column('kitoblar', 'pdf_url',
               existing_type=sa.String(length=500),
               nullable=False)
