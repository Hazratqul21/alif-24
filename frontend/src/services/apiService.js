const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * API Service
 * Handles all HTTP requests to the backend
 */
class ApiService {
  constructor() {
    this.baseUrl = API_URL;
  }

  /**
   * Get authorization headers
   * @returns {Object} Headers object
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API response
   * @param {Response} response - Fetch response
   * @returns {Promise<Object>} Parsed response data
   */
  async handleResponse(response) {
    const data = await response.json();

    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401 && data.error?.code === 'TOKEN_EXPIRED') {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          // Redirect to login
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      }

      throw new Error(data.error?.message || 'Request failed');
    }

    return data;
  }

  /**
   * Refresh access token
   * @returns {Promise<boolean>} Success status
   */
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        // Backend returns snake_case tokens in data.data
        const accessToken = data.data.access_token || data.data.accessToken;
        const refreshToken = data.data.refresh_token || data.data.refreshToken;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        return true;
      }
    } catch {
      // Refresh failed
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return false;
  }

  /**
   * Make GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Make POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
   */
  async post(endpoint, data = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    return this.handleResponse(response);
  }

  /**
   * Make PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
   */
  async put(endpoint, data = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    return this.handleResponse(response);
  }

  /**
   * Make DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} Response data
   */
  async delete(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (response.status === 204) {
      return { success: true };
    }

    return this.handleResponse(response);
  }
}

export const apiService = new ApiService();
export default apiService;
