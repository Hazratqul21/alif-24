"""Initial migration - create users table

Revision ID: initial
Revises: 
Create Date: 2026-01-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table (without foreign key first)
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=True),
        sa.Column('phone', sa.String(20), unique=True, nullable=True),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('username', sa.String(50), unique=True, nullable=True),
        sa.Column('pin_code', sa.String(6), nullable=True),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('avatar', sa.String(500), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('role', sa.String(20), nullable=False, default='student'),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('language', sa.String(5), default='uz'),
        sa.Column('timezone', sa.String(50), default='Asia/Tashkent'),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('refresh_token', sa.String(500), nullable=True),
    )
    
    # Add indexes separately
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_phone', 'users', ['phone'])
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_parent_id', 'users', ['parent_id'])
    
    # Add foreign key constraint after table creation
    op.create_foreign_key('fk_users_parent_id', 'users', 'users', ['parent_id'], ['id'])


def downgrade() -> None:
    op.drop_table('users')
