import apiService from './apiService';

/**
 * Profile Service
 * Handles child profile-related API calls
 */
class ProfileService {
  /**
   * Check if nickname is available
   * @param {string} nickname - Nickname to check
   * @returns {Promise<Object>} Availability result
   */
  async checkNickname(nickname) {
    const response = await apiService.post('/profiles/check-nickname', { nickname });
    return response.data;
  }

  /**
   * Get nickname suggestions
   * @param {string} avatarKey - Avatar key
   * @returns {Promise<Array>} List of suggested nicknames
   */
  async getSuggestions(avatarKey) {
    const response = await apiService.get(`/profiles/suggestions/${avatarKey}`);
    return response.data;
  }

  /**
   * Create new profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created profile
   */
  async create(profileData) {
    const response = await apiService.post('/profiles', profileData);
    return response.data;
  }

  /**
   * Get user's profiles
   * @returns {Promise<Array>} List of profiles
   */
  async getAll() {
    const response = await apiService.get('/profiles');
    return response.data;
  }

  /**
   * Get profile by ID
   * @param {string} id - Profile ID
   * @returns {Promise<Object>} Profile data
   */
  async getById(id) {
    const response = await apiService.get(`/profiles/${id}`);
    return response.data;
  }

  /**
   * Update profile
   * @param {string} id - Profile ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated profile
   */
  async update(id, updates) {
    const response = await apiService.put(`/profiles/${id}`, updates);
    return response.data;
  }

  /**
   * Delete profile
   * @param {string} id - Profile ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    await apiService.delete(`/profiles/${id}`);
  }

  /**
   * Record profile login
   * @param {string} id - Profile ID
   * @returns {Promise<void>}
   */
  async recordLogin(id) {
    await apiService.post(`/profiles/${id}/login`);
  }

  /**
   * Login by nickname
   * @param {string} nickname - Nickname
   * @param {string} password - Password (optional for young children)
   * @returns {Promise<Object>} Profile data
   */
  async loginByNickname(nickname, password = null) {
    const response = await apiService.post('/profiles/login-by-nickname', {
      nickname,
      password
    });
    return response.data;
  }

  /**
   * Get profile statistics
   * @param {string} id - Profile ID
   * @returns {Promise<Object>} Profile statistics
   */
  async getStats(id) {
    const response = await apiService.get(`/profiles/${id}/stats`);
    return response.data;
  }
}

export const profileService = new ProfileService();
export default profileService;
