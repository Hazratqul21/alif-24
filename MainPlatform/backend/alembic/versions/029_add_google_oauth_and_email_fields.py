"""Add Google OAuth + email verification fields to users

Revision ID: 029
Revises: 028

Changes (all idempotent — safe to run on existing production DBs):
- users.email_verified           BOOLEAN NOT NULL DEFAULT false
- users.google_id                VARCHAR(100) UNIQUE NULL
- users.oauth_provider           VARCHAR(20) NULL
- users.marketing_emails_enabled BOOLEAN NOT NULL DEFAULT true
- notification_logs.subject      VARCHAR(255) NULL  (so email subjects are queryable)
- notification_logs.message      relax NOT NULL → NULL (emails store HTML/subject separately)
- Indexes on google_id
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {c["name"] for c in inspector.get_columns(table_name)}


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    if table_name not in inspector.get_table_names():
        return False
    return index_name in {idx["name"] for idx in inspector.get_indexes(table_name)}


def _unique_exists(inspector, table_name: str, constraint_name: str) -> bool:
    if table_name not in inspector.get_table_names():
        return False
    return constraint_name in {
        uc["name"] for uc in inspector.get_unique_constraints(table_name)
    }


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    if not _column_exists(inspector, "users", "email_verified"):
        op.add_column(
            "users",
            sa.Column(
                "email_verified",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    if not _column_exists(inspector, "users", "google_id"):
        op.add_column(
            "users",
            sa.Column("google_id", sa.String(length=100), nullable=True),
        )

    if not _column_exists(inspector, "users", "oauth_provider"):
        op.add_column(
            "users",
            sa.Column("oauth_provider", sa.String(length=20), nullable=True),
        )

    if not _column_exists(inspector, "users", "marketing_emails_enabled"):
        op.add_column(
            "users",
            sa.Column(
                "marketing_emails_enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            ),
        )

    # Refresh inspector after column changes
    inspector = Inspector.from_engine(bind)

    if not _index_exists(inspector, "users", "ix_users_google_id"):
        op.create_index(
            "ix_users_google_id",
            "users",
            ["google_id"],
            unique=False,
        )

    if not _unique_exists(inspector, "users", "uq_users_google_id"):
        op.create_unique_constraint("uq_users_google_id", "users", ["google_id"])

    # notification_logs: add optional subject column, relax message NOT NULL so
    # email rows can store long HTML in a separate body column later if needed.
    if not _column_exists(inspector, "notification_logs", "subject"):
        op.add_column(
            "notification_logs",
            sa.Column("subject", sa.String(length=255), nullable=True),
        )
    # Relax message NOT NULL (wrapped in try/except: on brand-new databases the
    # column is created as NULLable by the updated model already).
    try:
        op.alter_column(
            "notification_logs",
            "message",
            existing_type=sa.Text(),
            nullable=True,
        )
    except Exception:
        pass


def downgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    if _unique_exists(inspector, "users", "uq_users_google_id"):
        op.drop_constraint("uq_users_google_id", "users", type_="unique")

    if _index_exists(inspector, "users", "ix_users_google_id"):
        op.drop_index("ix_users_google_id", table_name="users")

    for col in (
        "marketing_emails_enabled",
        "oauth_provider",
        "google_id",
        "email_verified",
    ):
        if _column_exists(inspector, "users", col):
            op.drop_column("users", col)
