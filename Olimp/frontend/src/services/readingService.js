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
        // Force use the main platform API for TTS to avoid missing routes on Olimp sub-domain
        const baseUrl = 'https://alif24.uz/api/v1';
        return `${baseUrl}/reading/competitions/${compId}/tasks/${taskId}/tts`;
    },
};

export default readingService;
