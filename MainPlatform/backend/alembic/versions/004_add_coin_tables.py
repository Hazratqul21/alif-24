"""Add coin system tables
Revision ID: 004
Revises: 003
Create Date: 2026-02-22
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    # ============ STUDENT COINS ============
    if not inspector.has_table('student_coins'):
        op.create_table(
            'student_coins',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('student_id', sa.String(8), sa.ForeignKey('student_profiles.id', ondelete='CASCADE'), nullable=False, unique=True),
            sa.Column('total_earned', sa.Integer, default=0, server_default='0'),
            sa.Column('total_spent', sa.Integer, default=0, server_default='0'),
            sa.Column('total_withdrawn', sa.Integer, default=0, server_default='0'),
            sa.Column('current_balance', sa.Integer, default=0, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index('ix_student_coins_student_id', 'student_coins', ['student_id'])

    # ============ COIN TRANSACTIONS ============
    if not inspector.has_table('coin_transactions'):
        op.create_table(
            'coin_transactions',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('student_coin_id', sa.String(8), sa.ForeignKey('student_coins.id', ondelete='CASCADE'), nullable=False),
            sa.Column('type', sa.String(50), nullable=False),
            sa.Column('amount', sa.Integer, nullable=False),
            sa.Column('description', sa.Text, nullable=True),
            sa.Column('source_type', sa.String(50), nullable=True),
            sa.Column('source_id', sa.String(8), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index('ix_coin_transactions_student_coin_id', 'coin_transactions', ['student_coin_id'])
        op.create_index('ix_coin_transactions_type', 'coin_transactions', ['type'])

    # ============ COIN WITHDRAWALS ============
    if not inspector.has_table('coin_withdrawals'):
        op.create_table(
            'coin_withdrawals',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('student_coin_id', sa.String(8), sa.ForeignKey('student_coins.id', ondelete='CASCADE'), nullable=False),
            sa.Column('coin_amount', sa.Integer, nullable=False),
            sa.Column('money_amount', sa.Integer, nullable=False),
            sa.Column('status', sa.String(20), default='pending', server_default='pending'),
            sa.Column('payment_method', sa.String(50), nullable=True),
            sa.Column('payment_details', sa.String(255), nullable=True),
            sa.Column('parent_id', sa.String(8), sa.ForeignKey('parent_profiles.id'), nullable=True),
            sa.Column('processed_by', sa.String(8), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('reject_reason', sa.Text, nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ============ PRIZES ============
    if not inspector.has_table('prizes'):
        op.create_table(
            'prizes',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('description', sa.Text, nullable=True),
            sa.Column('category', sa.String(50), default='other'),
            sa.Column('image_url', sa.String(500), nullable=True),
            sa.Column('coin_price', sa.Integer, nullable=False),
            sa.Column('stock_quantity', sa.Integer, default=100),
            sa.Column('is_active', sa.Boolean, default=True, server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ============ PRIZE REDEMPTIONS ============
    if not inspector.has_table('prize_redemptions'):
        op.create_table(
            'prize_redemptions',
            sa.Column('id', sa.String(8), primary_key=True),
            sa.Column('student_coin_id', sa.String(8), sa.ForeignKey('student_coins.id', ondelete='CASCADE'), nullable=False),
            sa.Column('prize_id', sa.String(8), sa.ForeignKey('prizes.id'), nullable=False),
            sa.Column('coin_spent', sa.Integer, nullable=False),
            sa.Column('quantity', sa.Integer, default=1),
            sa.Column('delivery_address', sa.Text, nullable=True),
            sa.Column('status', sa.String(20), default='pending', server_default='pending'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        )


def downgrade() -> None:
    op.drop_table('prize_redemptions')
    op.drop_table('prizes')
    op.drop_table('coin_withdrawals')
    op.drop_table('coin_transactions')
    op.drop_table('student_coins')
