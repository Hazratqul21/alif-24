import apiService from './apiService';

const readingService = {
    getCompetitions: (params) => apiService.get('/reading/competitions', params),
    getCompetition: (id) => apiService.get(`/reading/competitions/${id}`),
    getTask: (compId, taskId) => apiService.get(`/reading/competitions/${compId}/tasks/${taskId}`),
    startReading: (compId, taskId) => apiService.post(`/reading/competitions/${compId}/tasks/${taskId}/start`),
    submitReading: (compId, taskId, data) => apiService.post(`/reading/competitions/${compId}/tasks/${taskId}/submit`, data),
    submitTest: (compId, data) => apiService.post(`/reading/competitions/${compId}/test/submit`, data),
    getMyResults: (compId) => apiService.get(`/reading/competitions/${compId}/my-results`),
    getLeaderboard: (compId, params) => apiService.get(`/reading/competitions/${compId}/leaderboard`, params),
};

export default readingService;
