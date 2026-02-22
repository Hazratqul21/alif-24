/**
 * Olympiad Service
 * Olimpiada tizimi uchun barcha API chaqiruvlari
 * Backend: /api/v1/olympiads/...
 */
import apiService from './apiService';

const olympiadService = {
    // ==================== ADMIN: Olympiad CRUD ====================
    createOlympiad: (data) => apiService.post('/olympiads', data),
    listOlympiads: (params = {}) => apiService.get('/olympiads', params),
    getOlympiad: (id) => apiService.get(`/olympiads/${id}`),
    updateOlympiad: (id, data) => apiService.put(`/olympiads/${id}`, data),
    deleteOlympiad: (id) => apiService.delete(`/olympiads/${id}`),

    // ==================== ADMIN: Questions ====================
    addQuestion: (olympiadId, data) => apiService.post(`/olympiads/${olympiadId}/questions`, data),
    listQuestions: (olympiadId) => apiService.get(`/olympiads/${olympiadId}/questions`),
    deleteQuestion: (olympiadId, questionId) => apiService.delete(`/olympiads/${olympiadId}/questions/${questionId}`),

    // ==================== ADMIN: Reading Tasks ====================
    addReadingTask: (olympiadId, data) => apiService.post(`/olympiads/${olympiadId}/reading-tasks`, data),
    listReadingTasks: (olympiadId) => apiService.get(`/olympiads/${olympiadId}/reading-tasks`),
    deleteReadingTask: (olympiadId, taskId) => apiService.delete(`/olympiads/${olympiadId}/reading-tasks/${taskId}`),

    // NOTE: Student participation endpoints (register, start, submit, etc.)
    // are on olimp.alif24.uz (separate platform) to handle high load.

    // ==================== Leaderboard ====================
    getLeaderboard: (olympiadId, limit = 50) => apiService.get(`/olympiads/${olympiadId}/leaderboard`, { limit }),

    // ==================== ADMIN: Monitoring & Grading ====================
    getParticipants: (olympiadId, params = {}) => apiService.get(`/olympiads/${olympiadId}/participants`, params),
    getReadingSubmissions: (olympiadId, ungradedOnly = false) =>
        apiService.get(`/olympiads/${olympiadId}/reading-submissions`, { ungraded_only: ungradedOnly }),
    gradeReading: (submissionId, data) => apiService.post(`/olympiads/reading-submissions/${submissionId}/grade`, data),
    getOlympiadStats: (olympiadId) => apiService.get(`/olympiads/${olympiadId}/stats`),

    // NOTE: Audio upload is on olimp.alif24.uz
};

export default olympiadService;
