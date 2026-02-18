/**
 * Admin Panel API Service
 * Handles all admin API calls with X-Admin-Role and X-Admin-Key headers
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Get stored admin credentials
const getAdminHeaders = () => {
    const role = localStorage.getItem('adminRole');
    const key = localStorage.getItem('adminKey');
    if (!role || !key) return null;
    return {
        'X-Admin-Role': role,
        'X-Admin-Key': key,
    };
};

const adminApi = axios.create({ baseURL: `${API_URL}/admin` });

// Add admin headers to every request
adminApi.interceptors.request.use((config) => {
    const headers = getAdminHeaders();
    if (headers) {
        config.headers = { ...config.headers, ...headers };
    }
    return config;
});

// Handle auth errors
adminApi.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 403) {
            localStorage.removeItem('adminRole');
            localStorage.removeItem('adminKey');
            window.location.href = '/admin';
        }
        return Promise.reject(err);
    }
);

const adminService = {
    // Auth
    login: (role, password) => adminApi.post('/login', { role, password }),
    isLoggedIn: () => !!localStorage.getItem('adminRole'),
    getRole: () => localStorage.getItem('adminRole'),
    getPermissions: () => JSON.parse(localStorage.getItem('adminPermissions') || '[]'),
    hasPermission: (perm) => {
        const perms = JSON.parse(localStorage.getItem('adminPermissions') || '[]');
        return perms.includes('all') || perms.includes(perm);
    },
    logout: () => {
        localStorage.removeItem('adminRole');
        localStorage.removeItem('adminKey');
        localStorage.removeItem('adminPermissions');
    },

    // Dashboard
    getDashboard: () => adminApi.get('/dashboard'),

    // Users
    getUsers: (params) => adminApi.get('/users', { params }),
    getUser: (id) => adminApi.get(`/users/${id}`),
    createUser: (data) => adminApi.post('/users', data),
    updateUser: (id, data) => adminApi.put(`/users/${id}`, data),
    deleteUser: (id) => adminApi.delete(`/users/${id}`),

    // Teachers
    getPendingTeachers: () => adminApi.get('/teachers/pending'),
    approveTeacher: (data) => adminApi.post('/teachers/approve', data),

    // DB
    getTables: () => adminApi.get('/db/tables'),
    getTableData: (name, params) => adminApi.get(`/db/tables/${name}`, { params }),
    updateTableRow: (table, id, data) => adminApi.put(`/db/tables/${table}/${id}`, data),
    deleteTableRow: (table, id) => adminApi.delete(`/db/tables/${table}/${id}`),

    // Content
    getLessons: (params) => adminApi.get('/content/lessons', { params }),
    createLesson: (data) => adminApi.post('/content/lessons', data),
    updateLesson: (id, data) => adminApi.put(`/content/lessons/${id}`, data),
    deleteLesson: (id) => adminApi.delete(`/content/lessons/${id}`),
    getErtaklar: (params) => adminApi.get('/content/ertaklar', { params }),
    createErtak: (data) => adminApi.post('/content/ertaklar', data),
    deleteErtak: (id) => adminApi.delete(`/content/ertaklar/${id}`),

    // Telegram
    getTelegramUsers: (params) => adminApi.get('/telegram/users', { params }),
};

export default adminService;
