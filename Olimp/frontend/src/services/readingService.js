import apiService from './apiService';

const API_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';

const readingService = {
    getCompetitions: (params) => apiService.get('/reading/competitions', params),
    getCompetition: (id) => apiService.get(`/reading/competitions/${id}`),
    getTask: (compId, taskId) => apiService.get(`/reading/competitions/${compId}/tasks/${taskId}`),
    startReading: (compId, taskId) => apiService.post(`/reading/competitions/${compId}/tasks/${taskId}/start`),
    submitReading: (compId, taskId, data) => apiService.post(`/reading/competitions/${compId}/tasks/${taskId}/submit`, data),
    submitTest: (compId, data) => apiService.post(`/reading/competitions/${compId}/test/submit`, data),
    getMyResults: (compId) => apiService.get(`/reading/competitions/${compId}/my-results`),
    getLeaderboard: (compId, params) => apiService.get(`/reading/competitions/${compId}/leaderboard`, params),

    // Voice recording
    uploadAudio: (sessionId, audioBlob) => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        return apiService.postForm(`/reading/sessions/${sessionId}/audio`, formData);
    },
    analyzeAudio: (sessionId) => apiService.post(`/reading/sessions/${sessionId}/analyze`),

    // TTS - Hikoyani eshittirish
    getTaskTTSUrl: (compId, taskId) => {
        return `${API_URL}/reading/competitions/${compId}/tasks/${taskId}/tts`;
    },

    // ─── ADMIN ENDPOINTS ───
    createCompetition: (data) => apiService.post('/reading/admin/competitions', data, {
        headers: { 'X-Admin-Key': localStorage.getItem('adminKey') || '' }
    }),
    getAdminCompetitions: () => apiService.get('/reading/admin/competitions', {}, {
        headers: { 'X-Admin-Key': localStorage.getItem('adminKey') || '' }
    }),
    updateCompetition: (id, data) => apiService.put(`/reading/admin/competitions/${id}`, data, {
        headers: { 'X-Admin-Key': localStorage.getItem('adminKey') || '' }
    }),
    deleteCompetition: (id) => apiService.delete(`/reading/admin/competitions/${id}`, {
        headers: { 'X-Admin-Key': localStorage.getItem('adminKey') || '' }
    }),
    createTask: (compId, data) => apiService.post(`/reading/admin/competitions/${compId}/tasks`, data, {
        headers: { 'X-Admin-Key': localStorage.getItem('adminKey') || '' }
    }),
    updateTask: (taskId, data) => apiService.put(`/reading/admin/tasks/${taskId}`, data, {
        headers: { 'X-Admin-Key': localStorage.getItem('adminKey') || '' }
    }),
    deleteTask: (taskId) => apiService.delete(`/reading/admin/tasks/${taskId}`, {
        headers: { 'X-Admin-Key': localStorage.getItem('adminKey') || '' }
    }),
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiService.postForm('/upload/admin-file', formData, {
            headers: { 'X-Admin-Key': localStorage.getItem('adminKey') || '' }
        });
    },
};

export default readingService;
