// Har doim relative (/api/v1) port bilan aralashmasligi uchun host va https ta'minlanadi
let API_URL = import.meta.env.VITE_API_URL || '/api/v1';
if (API_URL.startsWith('http://') && window.location.protocol === 'https:') {
    API_URL = API_URL.replace('http://', 'https://');
}

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

    async get(endpoint, params = {}) {
        let url = `${this.baseUrl}${endpoint}`;
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null) searchParams.append(key, val);
        });
        const qs = searchParams.toString();
        if (qs) url += `?${qs}`;
        const resp = await fetch(url, { method: "GET", credentials: "include", headers: this.getHeaders() });
        return this.handleResponse(resp);
    }

    async post(endpoint, data = {}) {
        const resp = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "POST", credentials: "include",
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(resp);
    }
}

export const apiService = new ApiService();
export default apiService;
