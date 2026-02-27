/**
 * Guest Session Service - Frontend API for guest (unauthenticated) user tracking
 * 
 * FIX #1: REMOVED raw axios import — was the ONLY service using axios directly,
 *         creating an inconsistency with all other services that use fetch via apiService.
 *         Now uses native fetch() with proper error handling.
 * 
 * FIX #2: FIXED hardcoded fallback URL — was 'http://localhost:8000/api' (wrong path, 
 *         missing /v1, and hardcoded to localhost). Now uses VITE_API_URL || '/api/v1'
 *         which matches apiService.js and works on any domain.
 * 
 * FIX #3: FIXED infinite recursion loop — trackContentAccess() called itself on 404
 *         with NO exit condition, causing browser tab to freeze/crash.
 *         Now has a MAX_RETRIES = 3 limit with a counter parameter.
 */

// FIX #2: Use the same env variable as apiService.js, with relative path fallback
const API_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';

// FIX #3: Maximum number of retries for session recreation
const MAX_RETRIES = 3;

class GuestSessionService {
  constructor() {
    this.SESSION_KEY = 'guest_session_token';
    this.FINGERPRINT_KEY = 'browser_fingerprint';
  }

  /**
   * Get standard headers for guest API requests
   * (No auth token needed — these are unauthenticated guest endpoints)
   */
  getHeaders() {
    return { 'Content-Type': 'application/json' };
  }

  /**
   * Centralized fetch wrapper with proper error handling
   * FIX #1: Replaces raw axios calls with native fetch
   * 
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint path
   * @param {Object|null} body - Request body (for POST/PUT)
   * @returns {Promise<Object>} Parsed JSON response
   */
  async request(method, endpoint, body = null) {
    // Handle both absolute and relative base URLs
    const baseUrl = API_URL.startsWith('http')
      ? API_URL
      : `${window.location.origin}${API_URL}`;

    const options = {
      method,
      headers: this.getHeaders(),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.detail || data.message || 'Request failed');
      error.status = response.status;
      throw error;
    }

    return data;
  }

  /**
   * Generate a simple browser fingerprint for guest identification
   * Used to link guest sessions across page reloads
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

    // Simple hash function — produces consistent fingerprint
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Get stored session token from localStorage
   */
  getSessionToken() {
    return localStorage.getItem(this.SESSION_KEY);
  }

  /**
   * Store session token in localStorage
   */
  setSessionToken(token) {
    localStorage.setItem(this.SESSION_KEY, token);
  }

  /**
   * Get or create browser fingerprint
   * Creates on first call, then caches in localStorage
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
   * Create a new guest session or retrieve existing one
   * @returns {Promise<{session_token: string, message: string}>}
   */
  async createSession() {
    try {
      const fingerprint = this.getFingerprint();
      const data = await this.request('POST', '/guest/session', { fingerprint });
      this.setSessionToken(data.session_token);
      return data;
    } catch (error) {
      console.error('Error creating guest session:', error);
      throw error;
    }
  }

  /**
   * Track content access by guest user
   * 
   * FIX #3: Added retryCount parameter with MAX_RETRIES limit.
   * OLD CODE (BROKEN): On 404, called this.trackContentAccess() with no limit
   *   → infinite recursion → browser crash
   * NEW CODE: Tracks retry count, stops after MAX_RETRIES attempts
   * 
   * @param {string} contentType - 'harf', 'rharf', 'math', etc.
   * @param {string} contentId - Letter ID, game ID, etc.
   * @param {number} retryCount - Internal counter, DO NOT pass manually
   * @returns {Promise<{requires_login: boolean, content_accessed_count: number}>}
   */
  async trackContentAccess(contentType, contentId, retryCount = 0) {
    try {
      let sessionToken = this.getSessionToken();

      // If no session exists, create one first
      if (!sessionToken) {
        const sessionData = await this.createSession();
        sessionToken = sessionData.session_token;
      }

      const data = await this.request('POST', '/guest/track', {
        session_token: sessionToken,
        content_type: contentType,
        content_id: contentId
      });

      return data;
    } catch (error) {
      console.error('Error tracking content access:', error);

      // FIX #3: If session not found (404), clear stale token and retry
      // BUT only up to MAX_RETRIES times to prevent infinite loop
      if (error.status === 404 && retryCount < MAX_RETRIES) {
        localStorage.removeItem(this.SESSION_KEY);
        return this.trackContentAccess(contentType, contentId, retryCount + 1);
      }

      // After MAX_RETRIES, give up and throw
      throw error;
    }
  }

  /**
   * Check current guest session status
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

      const data = await this.request('GET', `/guest/status/${sessionToken}`);
      return data;
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
   * Convert guest session to registered user account
   * Called after successful registration/login to preserve guest activity data
   * 
   * @param {string} userId - User ID from backend after registration
   * @returns {Promise<boolean>} Whether conversion succeeded
   */
  async convertToUser(userId) {
    try {
      const sessionToken = this.getSessionToken();
      if (!sessionToken) return false;

      await this.request('POST', `/guest/convert/${sessionToken}?user_id=${userId}`);

      // Clear guest session after successful conversion
      localStorage.removeItem(this.SESSION_KEY);
      return true;
    } catch (error) {
      console.error('Error converting session to user:', error);
      return false;
    }
  }

  /**
   * Clear guest session (on logout or manual reset)
   */
  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  }
}

export default new GuestSessionService();
