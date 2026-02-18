"""
Shared Payments Package - Umumiy to'lov va coin tizimi

Import qilish:
    from shared.payments import add_coins, get_coin_balance
    from shared.payments import reward_lesson_completion
"""

from shared.payments.coin_service import (
    get_or_create_coin_balance,
    add_coins,
    deduct_coins,
    get_coin_balance,
    get_transaction_history,
    reward_lesson_completion,
    reward_game_win,
    reward_quiz_correct,
    reward_olympiad,
    COIN_REWARDS
)

__all__ = [
    "get_or_create_coin_balance",
    "add_coins",
    "deduct_coins",
    "get_coin_balance",
    "get_transaction_history",
    "reward_lesson_completion",
    "reward_game_win",
    "reward_quiz_correct",
    "reward_olympiad",
    "COIN_REWARDS"
]
