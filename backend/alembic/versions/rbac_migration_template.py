"""
Alembic Migration for RBAC Models
Run: alembic revision --autogenerate -m "add_rbac_models"
Then: alembic upgrade head
"""

# This is a template for the migration file
# Actual migration should be generated using Alembic

"""add_rbac_models

Revision ID: auto_generated
Revises: previous_revision
Create Date: 2026-01-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_rbac_models'
down_revision = 'add_reading_analysis'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create ENUM types (PostgreSQL syntax)
    try:
        op.execute("CREATE TYPE userrole AS ENUM ('super_admin', 'admin', 'teacher', 'parent', 'student')")
    except:
        pass  # Type already exists
    
    try:
        op.execute("CREATE TYPE accountstatus AS ENUM ('pending', 'active', 'suspended', 'deleted')")
    except:
        pass  # Type already exists
    
    try:
        op.execute("CREATE TYPE teacherstatus AS ENUM ('pending', 'approved', 'rejected')")
    except:
        pass  # Type already exists
    
    try:
        op.execute("CREATE TYPE childrelationship AS ENUM ('mother', 'father', 'grandmother', 'grandfather', 'guardian', 'other')")
    except:
        pass  # Type already exists
    
    # 2. Add new columns to users table (if they don't exist)
    try:
        op.add_column('users', sa.Column('pin_code', sa.String(6), nullable=True))
    except:
        pass
    
    try:
        op.add_column('users', sa.Column('parent_id', postgresql.UUID(as_uuid=True), nullable=True))
    except:
        pass
    
    try:
        op.add_column('users', sa.Column('date_of_birth', sa.Date(), nullable=True))
    except:
        pass
    
    try:
        op.add_column('users', sa.Column('status', sa.Enum('pending', 'active', 'suspended', 'deleted', name='accountstatus'), default='active'))
    except:
        pass
    
    try:
        op.add_column('users', sa.Column('timezone', sa.String(50), default='Asia/Tashkent'))
    except:
        pass
    
    try:
        op.add_column('users', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    except:
        pass
    
    # Create indexes if they don't exist
    try:
        op.create_index('ix_users_parent_id', 'users', ['parent_id'])
    except:
        pass
    
    # 3. Create student_profiles table
    op.create_table(
        'student_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('parent_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('relationship_type', sa.Enum('mother', 'father', 'grandmother', 'grandfather', 'guardian', 'other', name='childrelationship'), default='guardian'),
        sa.Column('grade', sa.String(20), nullable=True),
        sa.Column('school_name', sa.String(200), nullable=True),
        sa.Column('level', sa.Integer(), default=1),
        sa.Column('total_points', sa.Integer(), default=0),
        sa.Column('total_coins', sa.Integer(), default=0),
        sa.Column('current_streak', sa.Integer(), default=0),
        sa.Column('longest_streak', sa.Integer(), default=0),
        sa.Column('total_lessons_completed', sa.Integer(), default=0),
        sa.Column('total_games_played', sa.Integer(), default=0),
        sa.Column('total_time_spent', sa.Integer(), default=0),
        sa.Column('average_score', sa.Integer(), default=0),
        sa.Column('favorite_subjects', postgresql.ARRAY(sa.String()), default=[]),
        sa.Column('avatar_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('screen_time_limit', sa.Integer(), default=60),
        sa.Column('is_restricted', sa.Boolean(), default=False),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # 4. Create parent_profiles table
    op.create_table(
        'parent_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('occupation', sa.String(200), nullable=True),
        sa.Column('subscription_plan', sa.String(50), default='free'),
        sa.Column('subscription_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('max_children_allowed', sa.Integer(), default=3),
        sa.Column('email_notifications', sa.Boolean(), default=True),
        sa.Column('push_notifications', sa.Boolean(), default=True),
        sa.Column('weekly_report', sa.Boolean(), default=True),
        sa.Column('achievement_alerts', sa.Boolean(), default=True),
        sa.Column('default_screen_time', sa.Integer(), default=60),
        sa.Column('content_filter_level', sa.String(20), default='strict'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # 5. Create teacher_profiles table
    op.create_table(
        'teacher_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('verification_status', sa.Enum('pending', 'approved', 'rejected', name='teacherstatus'), default='pending'),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verified_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('specialization', sa.String(200), nullable=True),
        sa.Column('qualification', sa.String(200), nullable=True),
        sa.Column('years_of_experience', sa.Integer(), default=0),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('subjects', postgresql.ARRAY(sa.String()), default=[]),
        sa.Column('diploma_url', sa.String(500), nullable=True),
        sa.Column('certificate_urls', postgresql.ARRAY(sa.String()), default=[]),
        sa.Column('total_students', sa.Integer(), default=0),
        sa.Column('total_classrooms', sa.Integer(), default=0),
        sa.Column('total_lessons_created', sa.Integer(), default=0),
        sa.Column('rating', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # 6. Update classrooms table (if exists) or create new
    # First check if table exists
    op.create_table(
        'classrooms_new',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('subject', sa.String(100), nullable=True),
        sa.Column('grade_level', sa.String(20), nullable=True),
        sa.Column('teacher_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teacher_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('join_code', sa.String(8), unique=True, nullable=False, index=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('max_students', sa.Integer(), default=30),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # 7. Create classroom_students junction table
    op.create_table(
        'classroom_students_new',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('classroom_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('classrooms_new.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('student_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('classroom_id', 'student_id', name='uq_classroom_student'),
    )


def downgrade():
    # Drop tables in reverse order
    op.drop_table('classroom_students_new')
    op.drop_table('classrooms_new')
    op.drop_table('teacher_profiles')
    op.drop_table('parent_profiles')
    op.drop_table('student_profiles')
    
    # Drop columns from users
    op.drop_column('users', 'username')
    op.drop_column('users', 'pin_code')
    op.drop_column('users', 'parent_id')
    op.drop_column('users', 'date_of_birth')
    op.drop_column('users', 'status')
    op.drop_column('users', 'timezone')
    op.drop_column('users', 'deleted_at')
    
    # Drop ENUM types
    op.execute("DROP TYPE IF EXISTS childrelationship")
    op.execute("DROP TYPE IF EXISTS teacherstatus")
    op.execute("DROP TYPE IF EXISTS accountstatus")
