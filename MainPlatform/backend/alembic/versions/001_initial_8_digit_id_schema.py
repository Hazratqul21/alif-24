"""Initial Migration - Alif24 Platform 8-digit ID Schema
Revision ID: 001
Revises: 
Create Date: 2026-02-17
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create all tables with 8-digit string IDs."""
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=True),
        sa.Column('phone', sa.String(20), unique=True, nullable=True),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('pin_hash', sa.String(255), nullable=True),
        sa.Column('first_name', sa.String(100), nullable=True),
        sa.Column('last_name', sa.String(100), nullable=True),
        sa.Column('role', sa.Enum('moderator', 'organization', 'teacher', 'parent', 'student', name='userrole'), nullable=True),
        sa.Column('status', sa.Enum('active', 'inactive', 'suspended', name='accountstatus'), default='active'),
        sa.Column('refresh_token', sa.Text, nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('parent_id', sa.String(8), sa.ForeignKey('users.id'), nullable=True),
    )
    
    # Student Profiles
    op.create_table(
        'student_profiles',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('user_id', sa.String(8), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('avatar_id', sa.String(8), nullable=True),
        sa.Column('grade_level', sa.Integer, nullable=True),
        sa.Column('preferred_language', sa.String(10), default='uz'),
        sa.Column('parent_id', sa.String(8), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('organization_id', sa.String(8), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Teacher Profiles
    op.create_table(
        'teacher_profiles',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('user_id', sa.String(8), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('verification_status', sa.Enum('pending', 'approved', 'rejected', name='teacherstatus'), default='pending'),
        sa.Column('verified_by', sa.String(8), nullable=True),
        sa.Column('organization_id', sa.String(8), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Parent Profiles
    op.create_table(
        'parent_profiles',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('user_id', sa.String(8), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('subscription_plan', sa.String(50), default='free'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Organization Profiles
    op.create_table(
        'organization_profiles',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('user_id', sa.String(8), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Moderator Profiles
    op.create_table(
        'moderator_profiles',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('user_id', sa.String(8), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('role_type', sa.Enum('methodist', 'support', 'content_manager', name='moderatorroletype'), default='methodist'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Phone Verifications
    op.create_table(
        'phone_verifications',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('phone', sa.String(20), nullable=False),
        sa.Column('code', sa.String(6), nullable=False),
        sa.Column('telegram_chat_id', sa.BigInteger, nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('verified', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Telegram Users
    op.create_table(
        'telegram_users',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('user_id', sa.String(8), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('phone', sa.String(20), nullable=False),
        sa.Column('telegram_chat_id', sa.BigInteger, nullable=True, unique=True),
        sa.Column('telegram_username', sa.String(100), nullable=True),
        sa.Column('notifications_enabled', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Student Coins
    op.create_table(
        'student_coins',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('student_id', sa.String(8), sa.ForeignKey('student_profiles.id'), nullable=False),
        sa.Column('balance', sa.Integer, default=0),
        sa.Column('total_earned', sa.Integer, default=0),
        sa.Column('total_spent', sa.Integer, default=0),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Coin Transactions
    op.create_table(
        'coin_transactions',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('student_id', sa.String(8), sa.ForeignKey('student_profiles.id'), nullable=False),
        sa.Column('amount', sa.Integer, nullable=False),
        sa.Column('type', sa.Enum('earn', 'spend', 'bonus', 'penalty', name='transactiontype'), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('reference_id', sa.String(8), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Indexes
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_phone', 'users', ['phone'])
    op.create_index('idx_telegram_phone', 'telegram_users', ['phone'])
    op.create_index('idx_telegram_chat', 'telegram_users', ['telegram_chat_id'])


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table('coin_transactions')
    op.drop_table('student_coins')
    op.drop_table('telegram_users')
    op.drop_table('phone_verifications')
    op.drop_table('moderator_profiles')
    op.drop_table('organization_profiles')
    op.drop_table('parent_profiles')
    op.drop_table('teacher_profiles')
    op.drop_table('student_profiles')
    op.drop_table('users')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS accountstatus")
    op.execute("DROP TYPE IF EXISTS teacherstatus")
    op.execute("DROP TYPE IF EXISTS moderatorroletype")
    op.execute("DROP TYPE IF EXISTS transactiontype")
