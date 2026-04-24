"""create email_verification_codes table

Adds the ``email_verification_codes`` table used by the profile settings /
"verify email" flow. Nothing else is touched — this migration purely adds a
new table so it is safe on live data.

Revision ID: 032
Revises: 031
Create Date: 2026-04-24
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent guard — skip if an older environment already created this table.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())
    if "email_verification_codes" in existing:
        return

    op.create_table(
        "email_verification_codes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "user_id",
            sa.String(length=8),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column(
            "purpose",
            sa.Enum(
                "verify_existing",
                "change_email",
                name="emailverificationpurpose",
                native_enum=True,
            ),
            nullable=False,
        ),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index(
        "ix_evc_user_purpose_active",
        "email_verification_codes",
        ["user_id", "purpose", "consumed_at"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())
    if "email_verification_codes" not in existing:
        return

    op.drop_index("ix_evc_user_purpose_active", table_name="email_verification_codes")
    op.drop_table("email_verification_codes")
    # Drop enum type (Postgres only; harmless no-op elsewhere).
    try:
        sa.Enum(name="emailverificationpurpose").drop(bind, checkfirst=True)
    except Exception:
        pass
