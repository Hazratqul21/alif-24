/**
 * Olympiad Service (Admin-only)
 * Olimpiada tizimi uchun barcha API chaqiruvlari
 * Backend: /api/v1/olympiads/...
 * Auth: X-Admin-Role / X-Admin-Key headers
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const getAdminHeaders = () => ({
    'X-Admin-Role': localStorage.getItem('adminRole') || '',
    'X-Admin-Key': localStorage.getItem('adminKey') || '',
});

const api = axios.create({ baseURL: `${API_URL}/olympiads` });

api.interceptors.request.use((config) => {
    config.headers = { ...config.headers, ...getAdminHeaders() };
    return config;
});

api.interceptors.response.use(
    (res) => res.data,
    (err) => {
        const msg = err.response?.data?.detail || err.message || 'Xatolik';
        return Promise.reject(new Error(msg));
    }
);

const olympiadService = {
    // ==================== ADMIN: Olympiad CRUD ====================
    createOlympiad: (data) => api.post('', data),
    listOlympiads: (params = {}) => api.get('', { params }),
    getOlympiad: (id) => api.get(`/${id}`),
    updateOlympiad: (id, data) => api.put(`/${id}`, data),
    deleteOlympiad: (id) => api.delete(`/${id}`),

    // ==================== ADMIN: Questions ====================
    addQuestion: (olympiadId, data) => api.post(`/${olympiadId}/questions`, data),
    listQuestions: (olympiadId) => api.get(`/${olympiadId}/questions`),
    deleteQuestion: (olympiadId, questionId) => api.delete(`/${olympiadId}/questions/${questionId}`),

    // ==================== ADMIN: Reading Tasks ====================
    addReadingTask: (olympiadId, data) => api.post(`/${olympiadId}/reading-tasks`, data),
    listReadingTasks: (olympiadId) => api.get(`/${olympiadId}/reading-tasks`),
    deleteReadingTask: (olympiadId, taskId) => api.delete(`/${olympiadId}/reading-tasks/${taskId}`),

    // NOTE: Student participation endpoints (register, start, submit, etc.)
    // are on olimp.alif24.uz (separate platform) to handle high load.

    // ==================== Leaderboard ====================
    getLeaderboard: (olympiadId, limit = 50) => api.get(`/${olympiadId}/leaderboard`, { params: { limit } }),

    // ==================== ADMIN: Monitoring & Grading ====================
    getParticipants: (olympiadId, params = {}) => api.get(`/${olympiadId}/participants`, { params }),
    getReadingSubmissions: (olympiadId, ungradedOnly = false) =>
        api.get(`/${olympiadId}/reading-submissions`, { params: { ungraded_only: ungradedOnly } }),
    gradeReading: (submissionId, data) => api.post(`/reading-submissions/${submissionId}/grade`, data),
    getOlympiadStats: (olympiadId) => api.get(`/${olympiadId}/stats`),
};

export default olympiadService;
