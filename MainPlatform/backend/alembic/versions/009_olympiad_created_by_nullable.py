"""Make olympiad created_by nullable + add assignment_complete enum

Revision ID: 009
Revises: 008
"""
from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("olympiads", "created_by", nullable=True)

    # Add 'assignment_complete' to transactiontype enum
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'assignment_complete'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transactiontype')
            ) THEN
                ALTER TYPE transactiontype ADD VALUE 'assignment_complete';
            END IF;
        END
        $$;
    """)


def downgrade():
    op.alter_column("olympiads", "created_by", nullable=False)
