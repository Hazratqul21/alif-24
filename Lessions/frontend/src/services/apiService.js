const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiService {
    constructor() {
        this.baseUrl = API_URL;
    }

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('accessToken');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }

    async handleResponse(response) {
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error?.message || data.detail || `Request failed (${response.status})`);
        }
        return response.json();
    }

    async get(endpoint, params = {}) {
        const baseUrl = this.baseUrl.startsWith('http')
            ? this.baseUrl
            : `${window.location.origin}${this.baseUrl}`;
        const url = new URL(`${baseUrl}${endpoint}`);
        Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null) url.searchParams.append(key, val);
        });
        const resp = await fetch(url, { method: 'GET', headers: this.getHeaders() });
        return this.handleResponse(resp);
    }

    async post(endpoint, data = {}) {
        const resp = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(resp);
    }
}

export const apiService = new ApiService();
export default apiService;
