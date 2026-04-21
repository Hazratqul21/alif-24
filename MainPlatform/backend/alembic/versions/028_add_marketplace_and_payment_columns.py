"""Add marketplace tables and extend payment_transactions

Revision ID: 028
Revises: 027

Changes:
- Create marketplace_items, marketplace_reviews, marketplace_purchases tables
- Add marketplace_item_id, commission_amount, seller_amount to payment_transactions
- Add indexes on FK columns
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None


def _column_exists(inspector, table_name, column_name):
    if table_name not in inspector.get_table_names():
        return False
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def _index_exists(inspector, table_name, index_name):
    if table_name not in inspector.get_table_names():
        return False
    indexes = inspector.get_indexes(table_name)
    return any(idx["name"] == index_name for idx in indexes)


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    existing_tables = inspector.get_table_names()

    # ================================================================
    # 1. marketplace_items
    # ================================================================
    if "marketplace_items" not in existing_tables:
        op.create_table(
            "marketplace_items",
            sa.Column("id", sa.String(8), primary_key=True),
            sa.Column("seller_id", sa.String(8), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("resource_id", sa.String(8), nullable=False),
            sa.Column(
                "resource_type",
                sa.Enum("lesson", "test", "material", "bundle", name="marketplaceitemtype"),
                nullable=False,
            ),
            sa.Column("title", sa.String(300), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("subject", sa.String(100), nullable=True),
            sa.Column("grade_level", sa.String(50), nullable=True),
            sa.Column("language", sa.String(10), server_default="uz"),
            sa.Column("thumbnail_url", sa.String(500), nullable=True),
            sa.Column("preview_urls", sa.JSON(), nullable=True),
            sa.Column("price", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_free", sa.Boolean(), server_default=sa.false()),
            sa.Column("average_rating", sa.Float(), server_default="0"),
            sa.Column("review_count", sa.Integer(), server_default="0"),
            sa.Column("sales_count", sa.Integer(), server_default="0"),
            sa.Column("view_count", sa.Integer(), server_default="0"),
            sa.Column(
                "status",
                sa.Enum("draft", "published", "archived", name="marketplacestatus"),
                server_default="published",
            ),
            sa.Column("is_featured", sa.Boolean(), server_default=sa.false()),
            sa.Column("tags", sa.JSON(), nullable=True),
            sa.Column("raw_content_preview", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ================================================================
    # 2. marketplace_reviews
    # ================================================================
    if "marketplace_reviews" not in existing_tables:
        op.create_table(
            "marketplace_reviews",
            sa.Column("id", sa.String(8), primary_key=True),
            sa.Column("item_id", sa.String(8), sa.ForeignKey("marketplace_items.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("user_id", sa.String(8), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("is_verified_buyer", sa.Boolean(), server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ================================================================
    # 3. payment_transactions: add marketplace_item_id, commission_amount, seller_amount
    # (Must be added BEFORE marketplace_purchases references payment_transactions)
    # ================================================================
    if "payment_transactions" in existing_tables:
        if not _column_exists(inspector, "payment_transactions", "marketplace_item_id"):
            op.add_column(
                "payment_transactions",
                sa.Column("marketplace_item_id", sa.String(8), nullable=True),
            )
            # Create FK only if marketplace_items table now exists (after step 1)
            op.create_foreign_key(
                "fk_payment_transactions_marketplace_item_id",
                "payment_transactions",
                "marketplace_items",
                ["marketplace_item_id"],
                ["id"],
            )
            op.create_index(
                "ix_payment_transactions_marketplace_item_id",
                "payment_transactions",
                ["marketplace_item_id"],
            )

        if not _column_exists(inspector, "payment_transactions", "commission_amount"):
            op.add_column(
                "payment_transactions",
                sa.Column("commission_amount", sa.Integer(), server_default="0", nullable=True),
            )

        if not _column_exists(inspector, "payment_transactions", "seller_amount"):
            op.add_column(
                "payment_transactions",
                sa.Column("seller_amount", sa.Integer(), server_default="0", nullable=True),
            )

    # ================================================================
    # 4. marketplace_purchases (references payment_transactions.id)
    # ================================================================
    # refresh inspector so new columns/tables are visible
    inspector = Inspector.from_engine(bind)
    existing_tables = inspector.get_table_names()

    if "marketplace_purchases" not in existing_tables:
        op.create_table(
            "marketplace_purchases",
            sa.Column("id", sa.String(8), primary_key=True),
            sa.Column("user_id", sa.String(8), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("item_id", sa.String(8), sa.ForeignKey("marketplace_items.id", ondelete="SET NULL"), nullable=True, index=True),
            sa.Column("cloned_resource_id", sa.String(8), nullable=False),
            sa.Column(
                "resource_type",
                sa.Enum("lesson", "test", "material", "bundle", name="marketplaceitemtype", create_type=False),
                nullable=False,
            ),
            sa.Column("purchase_price", sa.Integer(), nullable=False),
            sa.Column("commission_paid", sa.Integer(), nullable=False),
            sa.Column("transaction_id", sa.String(8), sa.ForeignKey("payment_transactions.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )


def downgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    existing_tables = inspector.get_table_names()

    if "marketplace_purchases" in existing_tables:
        op.drop_table("marketplace_purchases")

    if "payment_transactions" in existing_tables:
        if _index_exists(inspector, "payment_transactions", "ix_payment_transactions_marketplace_item_id"):
            op.drop_index("ix_payment_transactions_marketplace_item_id", table_name="payment_transactions")
        fks = inspector.get_foreign_keys("payment_transactions")
        for fk in fks:
            if "marketplace_item_id" in fk.get("constrained_columns", []):
                op.drop_constraint(fk["name"], "payment_transactions", type_="foreignkey")
                break
        if _column_exists(inspector, "payment_transactions", "seller_amount"):
            op.drop_column("payment_transactions", "seller_amount")
        if _column_exists(inspector, "payment_transactions", "commission_amount"):
            op.drop_column("payment_transactions", "commission_amount")
        if _column_exists(inspector, "payment_transactions", "marketplace_item_id"):
            op.drop_column("payment_transactions", "marketplace_item_id")

    # refresh
    inspector = Inspector.from_engine(bind)
    existing_tables = inspector.get_table_names()
    if "marketplace_reviews" in existing_tables:
        op.drop_table("marketplace_reviews")
    if "marketplace_items" in existing_tables:
        op.drop_table("marketplace_items")

    # Drop enum types (PostgreSQL)
    bind.execute(sa.text("DROP TYPE IF EXISTS marketplaceitemtype"))
    bind.execute(sa.text("DROP TYPE IF EXISTS marketplacestatus"))
