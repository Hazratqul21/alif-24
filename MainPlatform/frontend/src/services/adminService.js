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

// Handle auth errors - only logout on 401 (invalid credentials)
// 403 = permission denied (don't logout, just show error)
adminApi.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('adminRole');
            localStorage.removeItem('adminKey');
            localStorage.removeItem('adminPermissions');
            window.location.href = '/admin/login';
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
    getPublicContent: () => axios.get(`${API_URL}/public/content`),
    updatePlatformContent: (key, data) => adminApi.put(`/platform-content/${key}`, data),
    getLessons: (params) => adminApi.get('/direct/lessons', { params }),
    createLesson: (data) => adminApi.post('/direct/lessons', data),
    updateLesson: (id, data) => adminApi.put(`/direct/lessons/${id}`, data),
    deleteLesson: (id) => adminApi.delete(`/direct/lessons/${id}`),
    getErtaklar: (params) => adminApi.get('/direct/stories', { params }),
    createErtak: (data) => adminApi.post('/direct/stories', data),
    deleteErtak: (id) => adminApi.delete(`/direct/stories/${id}`),

    // Telegram (users via admin API)
    getTelegramUsers: (params) => adminApi.get('/telegram/users', { params }),

    // Telegram Broadcast (via telegram router, uses X-Admin-Key)
    getTelegramStats: () => {
        const key = localStorage.getItem('adminKey');
        return axios.get(`${API_URL}/telegram/stats`, { headers: { 'X-Admin-Key': key } });
    },
    sendBroadcast: (data) => {
        const key = localStorage.getItem('adminKey');
        return axios.post(`${API_URL}/telegram/broadcast`, data, { headers: { 'X-Admin-Key': key } });
    },

    // Reading Competition
    getCompetitions: (params) => adminApi.get('/reading/competitions', { params }),
    getCompetition: (id) => adminApi.get(`/reading/competitions/${id}`),
    createCompetition: (data) => adminApi.post('/reading/competitions', data),
    updateCompetition: (id, data) => adminApi.put(`/reading/competitions/${id}`, data),
    deleteCompetition: (id) => adminApi.delete(`/reading/competitions/${id}`),
    getCompetitionTasks: (compId) => adminApi.get(`/reading/competitions/${compId}/tasks`),
    getCompetitionTask: (compId, taskId) => adminApi.get(`/reading/competitions/${compId}/tasks/${taskId}`),
    createTask: (compId, data) => adminApi.post(`/reading/competitions/${compId}/tasks`, data),
    updateTask: (compId, taskId, data) => adminApi.put(`/reading/competitions/${compId}/tasks/${taskId}`, data),
    deleteTask: (compId, taskId) => adminApi.delete(`/reading/competitions/${compId}/tasks/${taskId}`),
    getCompetitionTest: (compId) => adminApi.get(`/reading/competitions/${compId}/test`),
    createOrUpdateTest: (compId, data) => adminApi.post(`/reading/competitions/${compId}/test`, data),
    deleteCompetitionTest: (compId) => adminApi.delete(`/reading/competitions/${compId}/test`),
    getCompetitionResults: (compId, params) => adminApi.get(`/reading/competitions/${compId}/results`, { params }),
    getCompetitionSessions: (compId, params) => adminApi.get(`/reading/competitions/${compId}/sessions`, { params }),
    getCompetitionStats: (compId) => adminApi.get(`/reading/competitions/${compId}/stats`),

    /**
     * Upload an assignment or content file (No size limit).
     * @param {File} file - The file to upload.
     * @returns {Promise<Object>} Response from the upload.
     */
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const key = localStorage.getItem('adminKey');
        const role = localStorage.getItem('adminRole');
        return axios.post(`${API_URL}/upload/admin-file`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'X-Admin-Role': role,
                'X-Admin-Key': key,
            },
        });
    },

    // ============ SUBSCRIPTION MANAGEMENT ============

    // Plan Config CRUD
    getSubscriptionPlans: () => request('GET', '/subscription-plans'),
    createSubscriptionPlan: (data) => request('POST', '/subscription-plans', data),
    updateSubscriptionPlan: (planId, data) => request('PUT', `/subscription-plans/${planId}`, data),
    deleteSubscriptionPlan: (planId) => request('DELETE', `/subscription-plans/${planId}`),

    // User Subscriptions
    getSubscriptions: (params) => request('GET', '/subscriptions', null, params),
    getSubscriptionStats: () => request('GET', '/subscriptions/stats'),
    assignSubscription: (userId, data) => request('POST', `/subscriptions/${userId}`, data),
    cancelSubscription: (userId) => request('DELETE', `/subscriptions/${userId}`),
};

export default adminService;
