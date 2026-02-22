"""Add parent_invite to inappnotiftype enum

Revision ID: 008
Revises: 007
"""
from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade():
    # Add 'parent_invite' value to inappnotiftype enum if not exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'parent_invite'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'inappnotiftype')
            ) THEN
                ALTER TYPE inappnotiftype ADD VALUE 'parent_invite';
            END IF;
        END
        $$;
    """)


def downgrade():
    # PostgreSQL does not support removing enum values easily
    pass
