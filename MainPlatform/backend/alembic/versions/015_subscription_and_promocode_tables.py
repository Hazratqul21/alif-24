"""
015: Subscription + PromoCode tizimi jadvallari

Yangi jadvallar:
- subscription_plan_configs (Admin-configurable obuna planlari)
- user_subscriptions (Foydalanuvchi obuna tarixi)
- promo_codes (Promocodlar)
- promo_code_usages (Promocode ishlatish tarixi)

Revision ID: 015
Revises: 014
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Subscription Plan Config
    op.create_table(
        'subscription_plan_configs',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('slug', sa.String(50), unique=True, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Integer(), default=0),
        sa.Column('duration_days', sa.Integer(), default=30),
        sa.Column('max_children', sa.Integer(), default=1),
        sa.Column('features', JSON, nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('sort_order', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 2. User Subscription
    op.create_table(
        'user_subscriptions',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('user_id', sa.String(8), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('plan_config_id', sa.String(8), sa.ForeignKey('subscription_plan_configs.id'), nullable=False),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('amount_paid', sa.Integer(), default=0),
        sa.Column('created_by', sa.String(50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 3. Promo Code
    op.create_table(
        'promo_codes',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('code', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('promo_type', sa.String(20), nullable=False, default='free_days'),
        sa.Column('discount_percent', sa.Integer(), default=0),
        sa.Column('free_days_count', sa.Integer(), default=0),
        sa.Column('plan_config_id', sa.String(8), sa.ForeignKey('subscription_plan_configs.id'), nullable=True),
        sa.Column('max_uses', sa.Integer(), default=0),
        sa.Column('current_uses', sa.Integer(), default=0),
        sa.Column('max_uses_per_user', sa.Integer(), default=1),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 4. Promo Code Usage
    op.create_table(
        'promo_code_usages',
        sa.Column('id', sa.String(8), primary_key=True),
        sa.Column('promo_code_id', sa.String(8), sa.ForeignKey('promo_codes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(8), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('result_type', sa.String(20), nullable=True),
        sa.Column('result_value', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('promo_code_usages')
    op.drop_table('promo_codes')
    op.drop_table('user_subscriptions')
    op.drop_table('subscription_plan_configs')
