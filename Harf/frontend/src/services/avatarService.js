import apiService from './apiService';

/**
 * Avatar Service
 * Handles avatar-related API calls
 */
class AvatarService {
  /**
   * Get all avatars
   * @param {string} language - Language code (uz, ru)
   * @returns {Promise<Array>} List of avatars
   */
  async getAll(language = 'uz') {
    const response = await apiService.get('/avatars', { language });
    return response.data;
  }

  /**
   * Get avatar by key
   * @param {string} key - Avatar key
   * @returns {Promise<Object>} Avatar data
   */
  async getByKey(key) {
    const response = await apiService.get(`/avatars/${key}`);
    return response.data;
  }
}

export const avatarService = new AvatarService();
export default avatarService;
