/**
 * Auth Service
 * Handles authentication-related API calls
 * 
 * All methods use the unified apiService.js which:
 * - Reads token from localStorage.getItem('accessToken')
 * - Sends Authorization: Bearer <token> header automatically
 * - Handles token refresh on 401 responses
 * - Uses relative /api/v1 base URL (works on any domain)
 */
import apiService from './apiService';

class AuthService {
  /**
   * Login user
   * @param {string} email - User email or phone
   * @param {string} password - User password
   * @returns {Promise<Object>} { user, access_token, refresh_token }
   */
  async login(email, password) {
    const response = await apiService.post('/auth/login', { email, password });
    return response.data;
  }

  /**
   * Register new user
   * @param {Object} userData - { email, phone, password, first_name, last_name, role }
   * @returns {Promise<Object>} { user, access_token, refresh_token }
   */
  async register(userData) {
    const response = await apiService.post('/auth/register', userData);
    return response.data;
  }

  /**
   * Logout user (invalidates refresh token on server)
   */
  async logout() {
    await apiService.post('/auth/logout');
  }

  /**
   * Get current user profile
   * Backend endpoint: GET /auth/me
   * @returns {Promise<Object>} User profile data
   */
  async getProfile() {
    const response = await apiService.get('/auth/me');
    return response.data;
  }

  /**
   * Update user profile
   * 
   * FIX: Was calling PUT /auth/profile which DOES NOT EXIST in backend.
   * Changed to PUT /auth/me — this matches the existing GET /auth/me pattern.
   * NOTE: Backend PUT /auth/me endpoint will be created in Phase 2.
   * 
   * @param {Object} updates - Profile fields to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile(updates) {
    const response = await apiService.put('/auth/me', updates);
    return response.data;
  }

  /**
   * Change password
   * Backend endpoint: PUT /auth/password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   */
  async changePassword(currentPassword, newPassword) {
    await apiService.put('/auth/password', { current_password: currentPassword, new_password: newPassword });
  }

  /**
   * Send verification code to phone via Telegram
   * @param {string} phone - Phone number
   * @returns {Promise<Object>} Response with status
   */
  async sendVerificationCode(phone) {
    const response = await apiService.post('/verification/send-code', { phone });
    return response;
  }

  /**
   * Verify code sent to phone
   * @param {string} phone - Phone number
   * @param {string} code - Verification code
   * @returns {Promise<Object>} Verification result
   */
  async verifyCode(phone, code) {
    const response = await apiService.post('/verification/verify-code', { phone, code });
    return response;
  }
}

export const authService = new AuthService();
export default authService;
