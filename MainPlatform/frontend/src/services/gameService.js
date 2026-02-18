import apiService from './apiService';

/**
 * Game Service
 * Handles game-related API calls
 */
class GameService {
  /**
   * Get all games
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated games
   */
  async getGames(params = {}) {
    const response = await apiService.get('/games', params);
    return response;
  }

  /**
   * Get game by ID
   * @param {string} id - Game ID
   * @returns {Promise<Object>} Game data
   */
  async getGameById(id) {
    const response = await apiService.get(`/games/${id}`);
    return response.data;
  }

  /**
   * Get games for current student
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Recommended games
   */
  async getMyGames(params = {}) {
    const response = await apiService.get('/games/for-me', params);
    return response.data;
  }

  /**
   * Start game session
   * @param {string} gameId - Game ID
   * @param {number} level - Starting level
   * @returns {Promise<Object>} Game session
   */
  async startGame(gameId, level = 1) {
    const response = await apiService.post(`/games/${gameId}/start`, { 
      gameId,
      level 
    });
    return response.data;
  }

  /**
   * End game session
   * @param {string} sessionId - Session ID
   * @param {Object} data - Session data (score, timeSpent, gameData)
   * @returns {Promise<Object>} Completed session
   */
  async endGame(sessionId, data) {
    const response = await apiService.post(`/games/sessions/${sessionId}/end`, data);
    return response.data;
  }

  /**
   * Get game session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session data
   */
  async getSession(sessionId) {
    const response = await apiService.get(`/games/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * Get my game sessions
   * @param {string} gameId - Optional game ID filter
   * @returns {Promise<Array>} Game sessions
   */
  async getMySessions(gameId = null) {
    const params = gameId ? { gameId } : {};
    const response = await apiService.get('/games/my-sessions', params);
    return response.data;
  }

  /**
   * Create new game (admin)
   * @param {Object} gameData - Game data
   * @returns {Promise<Object>} Created game
   */
  async createGame(gameData) {
    const response = await apiService.post('/games', gameData);
    return response.data;
  }

  /**
   * Update game (admin)
   * @param {string} id - Game ID
   * @param {Object} updates - Game updates
   * @returns {Promise<Object>} Updated game
   */
  async updateGame(id, updates) {
    const response = await apiService.put(`/games/${id}`, updates);
    return response.data;
  }

  /**
   * Delete game (admin)
   * @param {string} id - Game ID
   * @returns {Promise<void>}
   */
  async deleteGame(id) {
    await apiService.delete(`/games/${id}`);
  }
}

export const gameService = new GameService();
export default gameService;
