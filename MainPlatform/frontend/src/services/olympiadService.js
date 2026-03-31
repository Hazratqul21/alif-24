/**
 * Olympiad Service (Admin-only)
 * Olimpiada tizimi uchun barcha API chaqiruvlari
 * Backend: /api/v1/olympiads/...
 * Auth: X-Admin-Role / X-Admin-Key headers
 */
import axios from 'axios';

const defaultApiUrl = () => {
    // Local development → direct to backend
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8000/api/v1';
    }
    // Production → always relative (inherits HTTPS from page)
    return '/api/v1';
};

const API_URL = defaultApiUrl();

const getAdminHeaders = () => ({
    'X-Admin-Role': localStorage.getItem('adminRole') || '',
    'X-Admin-Key': localStorage.getItem('adminKey') || '',
});

const api = axios.create({ baseURL: `${API_URL}/olympiads` });

if (import.meta.env.DEV) {
    console.debug('[OlympiadService] baseURL', `${API_URL}/olympiads`, 'resolved from', API_URL);
}

api.interceptors.request.use((config) => {
    config.headers = { ...config.headers, ...getAdminHeaders() };
    return config;
});

api.interceptors.response.use(
    (res) => res.data,
    (err) => {
        // We want to return the raw err so components can parse e.response?.data?.detail
        return Promise.reject(err);
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

    // ==================== ADMIN: Olympiad Content (Isolated) ====================
    getOlympiadLessons: (olympiadId) => api.get(`/${olympiadId}/content/lessons`),
    createOlympiadLesson: (olympiadId, data) => api.post(`/${olympiadId}/content/lessons`, data),
    updateOlympiadLesson: (olympiadId, lessonId, data) => api.put(`/${olympiadId}/content/lessons/${lessonId}`, data),
    deleteOlympiadLesson: (olympiadId, lessonId) => api.delete(`/${olympiadId}/content/lessons/${lessonId}`),
    getOlympiadStories: (olympiadId) => api.get(`/${olympiadId}/content/stories`),
    createOlympiadStory: (olympiadId, data) => api.post(`/${olympiadId}/content/stories`, data),
    deleteOlympiadStory: (olympiadId, storyId) => api.delete(`/${olympiadId}/content/stories/${storyId}`),
    publishOlympiadLesson: (olympiadId, lessonId) => api.post(`/${olympiadId}/content/lessons/${lessonId}/publish`),
    publishOlympiadStory: (olympiadId, storyId) => api.post(`/${olympiadId}/content/stories/${storyId}/publish`),
};

export default olympiadService;
