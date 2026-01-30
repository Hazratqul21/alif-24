/**
 * Guest Session Service - Frontend API for guest tracking
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

class GuestSessionService {
  constructor() {
    this.SESSION_KEY = 'guest_session_token';
    this.FINGERPRINT_KEY = 'browser_fingerprint';
  }

  /**
   * Generate browser fingerprint (simple version)
   */
  generateFingerprint() {
    const nav = window.navigator;
    const screen = window.screen;
    
    const data = [
      nav.userAgent,
      nav.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Get stored session token
   */
  getSessionToken() {
    return localStorage.getItem(this.SESSION_KEY);
  }

  /**
   * Store session token
   */
  setSessionToken(token) {
    localStorage.setItem(this.SESSION_KEY, token);
  }

  /**
   * Get or create fingerprint
   */
  getFingerprint() {
    let fingerprint = localStorage.getItem(this.FINGERPRINT_KEY);
    if (!fingerprint) {
      fingerprint = this.generateFingerprint();
      localStorage.setItem(this.FINGERPRINT_KEY, fingerprint);
    }
    return fingerprint;
  }

  /**
   * Create or get guest session
   * @returns {Promise<{session_token: string, message: string}>}
   */
  async createSession() {
    try {
      const fingerprint = this.getFingerprint();
      const response = await axios.post(`${API_BASE}/guest/session`, {
        fingerprint
      });
      
      this.setSessionToken(response.data.session_token);
      return response.data;
    } catch (error) {
      console.error('Error creating guest session:', error);
      throw error;
    }
  }

  /**
   * Track content access
   * @param {string} contentType - 'harf', 'rharf', 'math', etc.
   * @param {string} contentId - Letter ID, game ID, etc.
   * @returns {Promise<{requires_login: boolean, content_accessed_count: number, message: string}>}
   */
  async trackContentAccess(contentType, contentId) {
    try {
      let sessionToken = this.getSessionToken();
      
      // If no session token, create one first
      if (!sessionToken) {
        const sessionData = await this.createSession();
        sessionToken = sessionData.session_token;
      }
      
      const response = await axios.post(`${API_BASE}/guest/track`, {
        session_token: sessionToken,
        content_type: contentType,
        content_id: contentId
      });
      
      return response.data;
    } catch (error) {
      console.error('Error tracking content access:', error);
      
      // If session not found, create new one and retry
      if (error.response?.status === 404) {
        localStorage.removeItem(this.SESSION_KEY);
        return this.trackContentAccess(contentType, contentId);
      }
      
      throw error;
    }
  }

  /**
   * Check session status
   * @returns {Promise<{exists: boolean, requires_login: boolean, content_accessed_count: number}>}
   */
  async checkSessionStatus() {
    try {
      const sessionToken = this.getSessionToken();
      if (!sessionToken) {
        return {
          exists: false,
          requires_login: true,
          message: 'No session found'
        };
      }
      
      const response = await axios.get(`${API_BASE}/guest/status/${sessionToken}`);
      return response.data;
    } catch (error) {
      console.error('Error checking session status:', error);
      return {
        exists: false,
        requires_login: true,
        message: 'Session check failed'
      };
    }
  }

  /**
   * Convert guest session to user account after registration/login
   * @param {string} userId - User ID from backend
   * @returns {Promise<boolean>}
   */
  async convertToUser(userId) {
    try {
      const sessionToken = this.getSessionToken();
      if (!sessionToken) return false;
      
      await axios.post(`${API_BASE}/guest/convert/${sessionToken}`, null, {
        params: { user_id: userId }
      });
      
      // Clear guest session after conversion
      localStorage.removeItem(this.SESSION_KEY);
      return true;
    } catch (error) {
      console.error('Error converting session to user:', error);
      return false;
    }
  }

  /**
   * Clear guest session (logout or reset)
   */
  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  }
}

export default new GuestSessionService();
