"""Add CRM leads and activities tables

Revision ID: 014
Revises: 013
Create Date: 2026-02-24
"""
from alembic import op
import sqlalchemy as sa

revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types if they don't exist
    op.execute("DO $$ BEGIN CREATE TYPE leadstatus AS ENUM ('new', 'contacted', 'trial_lesson', 'negotiation', 'won', 'lost'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE activitytype AS ENUM ('call', 'meeting', 'note', 'task'); EXCEPTION WHEN duplicate_object THEN null; END $$;")

    # CRM Leads table
    op.create_table(
        'crm_leads',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('first_name', sa.String(), nullable=False),
        sa.Column('last_name', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=False, index=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('status', sa.Enum('new', 'contacted', 'trial_lesson', 'negotiation', 'won', 'lost', name='leadstatus', create_type=False), default='new'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('assigned_to_id', sa.String(8), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('organization_id', sa.String(8), sa.ForeignKey('organization_profiles.id', ondelete='CASCADE'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    # CRM Activities table
    op.create_table(
        'crm_activities',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('lead_id', sa.String(8), sa.ForeignKey('crm_leads.id'), nullable=False),
        sa.Column('type', sa.Enum('call', 'meeting', 'note', 'task', name='activitytype', create_type=False), default='note'),
        sa.Column('summary', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_completed', sa.Boolean(), default=False),
        sa.Column('created_by_id', sa.String(8), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Indexes
    op.create_index('ix_crm_leads_status', 'crm_leads', ['status'])
    op.create_index('ix_crm_leads_assigned_to', 'crm_leads', ['assigned_to_id'])
    op.create_index('ix_crm_activities_lead_id', 'crm_activities', ['lead_id'])


def downgrade() -> None:
    op.drop_index('ix_crm_activities_lead_id')
    op.drop_index('ix_crm_leads_assigned_to')
    op.drop_index('ix_crm_leads_status')
    op.drop_table('crm_activities')
    op.drop_table('crm_leads')
