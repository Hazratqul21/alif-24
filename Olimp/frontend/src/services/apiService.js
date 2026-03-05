const API_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';

class ApiService {
    constructor() {
        this.baseUrl = API_URL;
    }

    getHeaders(isFormData = false) {
        const headers = {};
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }
        // Token endi HttpOnly cookie orqali avtomatik yuboriladi
        return headers;
    }

    async handleResponse(response) {
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error?.message || data.detail || `Request failed (${response.status})`);
        }
        return response.json();
    }

    _buildUrl(endpoint) {
        const baseUrl = this.baseUrl.startsWith('http')
            ? this.baseUrl
            : `${window.location.origin}${this.baseUrl}`;
        return `${baseUrl}${endpoint}`;
    }

    async get(endpoint, params = {}, options = {}) {
        const url = new URL(this._buildUrl(endpoint));
        Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null) url.searchParams.append(key, val);
        });
        const headers = { ...this.getHeaders(), ...(options.headers || {}) };
        const resp = await fetch(url, { method: "GET", credentials: "include", headers });
        return this.handleResponse(resp);
    }

    async post(endpoint, data = {}, options = {}) {
        const headers = { ...this.getHeaders(), ...(options.headers || {}) };
        const resp = await fetch(this._buildUrl(endpoint), {
            method: "POST", credentials: "include",
            headers,
            body: JSON.stringify(data)
        });
        return this.handleResponse(resp);
    }

    async put(endpoint, data = {}, options = {}) {
        const headers = { ...this.getHeaders(), ...(options.headers || {}) };
        const resp = await fetch(this._buildUrl(endpoint), {
            method: "PUT", credentials: "include",
            headers,
            body: JSON.stringify(data)
        });
        return this.handleResponse(resp);
    }

    async delete(endpoint, options = {}) {
        const headers = { ...this.getHeaders(), ...(options.headers || {}) };
        const resp = await fetch(this._buildUrl(endpoint), {
            method: "DELETE", credentials: "include",
            headers
        });
        return this.handleResponse(resp);
    }

    async postForm(endpoint, formData) {
        const resp = await fetch(this._buildUrl(endpoint), {
            method: "POST",
            credentials: "include",
            body: formData,
        });
        return this.handleResponse(resp);
    }
}

export const apiService = new ApiService();
export default apiService;
