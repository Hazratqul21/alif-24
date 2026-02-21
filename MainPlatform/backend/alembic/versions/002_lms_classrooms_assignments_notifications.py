"""LMS: Classrooms, Assignments, InApp Notifications
Revision ID: 002
Revises: 001
Create Date: 2026-02-20
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    
    # helper for enum
    def create_enum(name, *values):
        try:
            sa.Enum(*values, name=name).create(conn)
        except sa.exc.ProgrammingError:
            pass

    create_enum('classroomstudentstatus', 'invited', 'active', 'removed')
    create_enum('invitationtype', 'phone', 'email', 'user_id')
    create_enum('invitationstatus', 'pending', 'accepted', 'declined', 'expired')
    create_enum('assignmentcreatorrole', 'teacher', 'parent', 'admin', 'organization')
    create_enum('assignmenttype', 'homework', 'test', 'reading', 'material', 'project')
    create_enum('assignmenttargettype', 'classroom', 'student')
    create_enum('submissionstatus', 'pending', 'submitted', 'graded', 'late', 'missed')
    create_enum('inappnotiftype', 'classroom_invite', 'assignment_new', 'assignment_graded', 'assignment_due', 'submission_received', 'system', 'achievement', 'parent_task')

    # ============ CLASSROOMS ============
    if not inspector.has_table('classrooms'):
        op.create_table(
            'classrooms',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('teacher_id', sa.String(8), sa.ForeignKey('teacher_profiles.id', ondelete='CASCADE'), nullable=False),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('subject', sa.String(100), nullable=True),
            sa.Column('grade_level', sa.String(20), nullable=True),
            sa.Column('description', sa.Text, nullable=True),
            sa.Column('invite_code', sa.String(6), unique=True, nullable=False),
            sa.Column('max_students', sa.Integer, default=40),
            sa.Column('is_active', sa.Boolean, default=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if not inspector.has_table('classroom_students'):
        op.create_table(
            'classroom_students',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('classroom_id', sa.String(8), sa.ForeignKey('classrooms.id', ondelete='CASCADE'), nullable=False),
            sa.Column('student_user_id', sa.String(8), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('status', sa.Enum('invited', 'active', 'removed', name='classroomstudentstatus'), default='active'),
            sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('removed_at', sa.DateTime(timezone=True), nullable=True),
        )

    if not inspector.has_table('classroom_invitations'):
        op.create_table(
            'classroom_invitations',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('classroom_id', sa.String(8), sa.ForeignKey('classrooms.id', ondelete='CASCADE'), nullable=False),
            sa.Column('invited_by', sa.String(8), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('invitation_type', sa.Enum('phone', 'email', 'user_id', name='invitationtype'), nullable=False),
            sa.Column('identifier', sa.String(255), nullable=False),
            sa.Column('student_user_id', sa.String(8), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('status', sa.Enum('pending', 'accepted', 'declined', 'expired', name='invitationstatus'), default='pending'),
            sa.Column('message', sa.Text, nullable=True),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ============ ASSIGNMENTS ============
    if not inspector.has_table('assignments'):
        op.create_table(
            'assignments',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('created_by', sa.String(8), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('creator_role', sa.Enum('teacher', 'parent', 'admin', 'organization', name='assignmentcreatorrole'), nullable=False),
            sa.Column('classroom_id', sa.String(8), sa.ForeignKey('classrooms.id', ondelete='SET NULL'), nullable=True),
            sa.Column('title', sa.String(300), nullable=False),
            sa.Column('description', sa.Text, nullable=True),
            sa.Column('assignment_type', sa.Enum('homework', 'test', 'reading', 'material', 'project', name='assignmenttype'), default='homework'),
            sa.Column('content', sa.Text, nullable=True),
            sa.Column('attachments', sa.JSON, nullable=True),
            sa.Column('reference_id', sa.String(8), nullable=True),
            sa.Column('reference_type', sa.String(50), nullable=True),
            sa.Column('max_score', sa.Integer, default=100),
            sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
            sa.Column('is_published', sa.Boolean, default=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if not inspector.has_table('assignment_targets'):
        op.create_table(
            'assignment_targets',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('assignment_id', sa.String(8), sa.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=False),
            sa.Column('target_type', sa.Enum('classroom', 'student', name='assignmenttargettype'), nullable=False),
            sa.Column('target_id', sa.String(8), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if not inspector.has_table('assignment_submissions'):
        op.create_table(
            'assignment_submissions',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('assignment_id', sa.String(8), sa.ForeignKey('assignments.id', ondelete='CASCADE'), nullable=False),
            sa.Column('student_user_id', sa.String(8), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('content', sa.Text, nullable=True),
            sa.Column('attachments', sa.JSON, nullable=True),
            sa.Column('score', sa.Float, nullable=True),
            sa.Column('feedback', sa.Text, nullable=True),
            sa.Column('status', sa.Enum('pending', 'submitted', 'graded', 'late', 'missed', name='submissionstatus'), default='pending'),
            sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('graded_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('graded_by', sa.String(8), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ============ IN-APP NOTIFICATIONS ============
    if not inspector.has_table('in_app_notifications'):
        op.create_table(
            'in_app_notifications',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('user_id', sa.String(8), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('title', sa.String(300), nullable=False),
            sa.Column('message', sa.Text, nullable=False),
            sa.Column('notif_type', sa.Enum(
                'classroom_invite', 'assignment_new', 'assignment_graded',
                'assignment_due', 'submission_received', 'system',
                'achievement', 'parent_task', name='inappnotiftype'
            ), nullable=False),
            sa.Column('reference_type', sa.String(50), nullable=True),
            sa.Column('reference_id', sa.String(8), nullable=True),
            sa.Column('is_read', sa.Boolean, default=False),
            sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('sender_id', sa.String(8), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
    # Indexes (ignore if they exist)
    for index_name, table, cols in [
        ('ix_classrooms_teacher_id', 'classrooms', ['teacher_id']),
        ('ix_classrooms_invite_code', 'classrooms', ['invite_code']),
        ('ix_classroom_students_classroom', 'classroom_students', ['classroom_id']),
        ('ix_classroom_students_student', 'classroom_students', ['student_user_id']),
        ('ix_assignments_created_by', 'assignments', ['created_by']),
        ('ix_assignments_classroom', 'assignments', ['classroom_id']),
        ('ix_assignment_submissions_assignment', 'assignment_submissions', ['assignment_id']),
        ('ix_assignment_submissions_student', 'assignment_submissions', ['student_user_id']),
        ('ix_in_app_notifications_user', 'in_app_notifications', ['user_id']),
        ('ix_in_app_notifications_unread', 'in_app_notifications', ['user_id', 'is_read'])
    ]:
        try:
            op.create_index(index_name, table, cols)
        except Exception:
            pass

def downgrade() -> None:
    op.drop_table('in_app_notifications')
    op.drop_table('assignment_submissions')
    op.drop_table('assignment_targets')
    op.drop_table('assignments')
    op.drop_table('classroom_invitations')
    op.drop_table('classroom_students')
    op.drop_table('classrooms')

    # Drop enums
    for enum_name in [
        'classroomstudentstatus', 'invitationtype', 'invitationstatus',
        'assignmentcreatorrole', 'assignmenttype', 'assignmenttargettype',
        'submissionstatus', 'inappnotiftype',
    ]:
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
