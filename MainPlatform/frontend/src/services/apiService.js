// Backend URL from environment variables or default to Vercel production
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
  getHeaders(isFormData = false) {
    const headers = {};

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // Token endi HttpOnly cookie orqali avtomatik yuboriladi
    // localStorage dan o'qish kerak emas

    return headers;
  }

  /**
   * Handle API response
   * @param {Response} response - Fetch response
   * @returns {Promise<Object>} Parsed response data
   */
  async handleResponse(response, retryFn = null) {
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return response;
    }

    const data = await response.json();

    if (!response.ok) {
      // Handle token expiration with automatic retry
      if (response.status === 401) {
        const isTokenExpired = data.error?.code === 'TOKEN_EXPIRED' || data.detail === 'Not authenticated' || data.detail === 'Could not validate credentials';
        if (isTokenExpired && !this._isRetrying) {
          this._isRetrying = true;
          try {
            const refreshed = await this.refreshToken();
            if (refreshed && retryFn) {
              return await retryFn();
            }
            if (!refreshed) {
              window.dispatchEvent(new CustomEvent('showLoginModal', {
                detail: { message: 'Sessiya muddati tugadi. Iltimos, qayta kiring.' }
              }));
              window.location.href = '/';
              throw new Error('Session expired');
            }
          } finally {
            this._isRetrying = false;
          }
        }
      }

      throw new Error(data.error?.message || data.detail || data.message || 'Request failed');
    }

    return data;
  }

  /**
   * Refresh access token
   * @returns {Promise<boolean>} Success status
   */
  async refreshToken() {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST", credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // Refresh failed
    }

    return false;
  }

  /**
   * Make GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint, params = {}) {
    // Handle relative URLs
    const baseUrl = this.baseUrl.startsWith('http')
      ? this.baseUrl
      : `${window.location.origin}${this.baseUrl}`;

    const url = new URL(`${baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    const doFetch = async () => {
      const resp = await fetch(url, {
        method: "GET", credentials: "include",
        headers: this.getHeaders()
      });
      return this.handleResponse(resp, doFetch);
    };
    return doFetch();
  }

  /**
   * Make POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
   */
  async post(endpoint, data = {}) {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const doFetch = async () => {
      const resp = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST", credentials: "include",
        headers: this.getHeaders(isFormData),
        body: isFormData ? data : JSON.stringify(data)
      });
      return this.handleResponse(resp, doFetch);
    };
    return doFetch();
  }

  /**
   * Make PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
   */
  async put(endpoint, data = {}) {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const doFetch = async () => {
      const resp = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "PUT", credentials: "include",
        headers: this.getHeaders(isFormData),
        body: isFormData ? data : JSON.stringify(data)
      });
      return this.handleResponse(resp, doFetch);
    };
    return doFetch();
  }

  /**
   * Make PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
   */
  async patch(endpoint, data = {}) {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const doFetch = async () => {
      const resp = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "PATCH", credentials: "include",
        headers: this.getHeaders(isFormData),
        body: isFormData ? data : JSON.stringify(data)
      });
      return this.handleResponse(resp, doFetch);
    };
    return doFetch();
  }

  /**
   * Make DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} Response data
   */
  async delete(endpoint) {
    const doFetch = async () => {
      const resp = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "DELETE", credentials: "include",
        headers: this.getHeaders()
      });
      if (resp.status === 204) return { success: true };
      return this.handleResponse(resp, doFetch);
    };
    return doFetch();
  }
}

export const apiService = new ApiService();
export default apiService;
