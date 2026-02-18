import apiService from './apiService';

/**
 * Coin Service
 * Handles all coin-related API calls (balance, earn, withdraw, prizes)
 */
class CoinService {
  /**
   * Get student's coin balance
   * @returns {Promise<Object>} { current_balance, total_earned, total_spent, total_withdrawn, money_equivalent_uzs }
   */
  async getBalance() {
    const response = await apiService.get('/coins/balance');
    return response.data || response;
  }

  /**
   * Claim daily login bonus (+5 coins)
   * @returns {Promise<Object>} { coins_earned, new_balance, message }
   */
  async claimDailyBonus() {
    const response = await apiService.post('/coins/daily-bonus');
    return response.data || response;
  }

  /**
   * Get transaction history
   * @param {number} limit - Max transactions to fetch
   * @returns {Promise<Array>} Transaction list
   */
  async getTransactions(limit = 50) {
    const response = await apiService.get(`/coins/transactions?limit=${limit}`);
    return response.data || response;
  }

  /**
   * Award coins for game win
   * Called after a game is completed successfully
   * @param {string} gameType - "math_monster", "letter_memory", etc.
   * @param {boolean} isWin - Whether the player won
   * @param {number} score - Score achieved
   * @returns {Promise<Object>} { coins_earned, new_balance }
   */
  async awardGameCoins(gameType, isWin, score = 0) {
    try {
      const response = await apiService.post('/coins/game-reward', {
        game_type: gameType,
        is_win: isWin,
        score: score
      });
      return response.data || response;
    } catch (error) {
      console.warn('Coin award failed (user may not be logged in):', error.message);
      return { coins_earned: 0, new_balance: 0 };
    }
  }

  /**
   * Request coin withdrawal to real money
   * @param {number} coinAmount - Amount of coins to withdraw (min 1000)
   * @param {string} paymentMethod - "click", "payme", "uzum", "bank_card"
   * @param {string} paymentDetails - Phone number or card number
   * @returns {Promise<Object>} Withdrawal result
   */
  async requestWithdrawal(coinAmount, paymentMethod, paymentDetails) {
    const response = await apiService.post('/coins/withdraw', {
      coin_amount: coinAmount,
      payment_method: paymentMethod,
      payment_details: paymentDetails
    });
    return response.data || response;
  }

  /**
   * Get withdrawal history
   * @returns {Promise<Array>} Withdrawal list
   */
  async getWithdrawalHistory() {
    const response = await apiService.get('/coins/withdrawals');
    return response.data || response;
  }

  /**
   * Get available prizes
   * @returns {Promise<Array>} Prize list
   */
  async getPrizes() {
    const response = await apiService.get('/coins/prizes');
    return response.data || response;
  }

  /**
   * Redeem a prize with coins
   * @param {string} prizeId - Prize ID
   * @param {string} deliveryAddress - Address for physical prizes
   * @returns {Promise<Object>} Redemption result
   */
  async redeemPrize(prizeId, deliveryAddress = null) {
    const response = await apiService.post('/coins/prizes/redeem', {
      prize_id: prizeId,
      delivery_address: deliveryAddress
    });
    return response.data || response;
  }

  /**
   * Get prize redemption history
   * @returns {Promise<Array>} Redemption list
   */
  async getRedemptionHistory() {
    const response = await apiService.get('/coins/prizes/history');
    return response.data || response;
  }
}

export const coinService = new CoinService();
export default coinService;
