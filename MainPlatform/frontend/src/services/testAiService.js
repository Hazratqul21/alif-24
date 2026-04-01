/**
 * TestAI Service — OlympiadPage uchun test to'plamlari
 * Backend: TestAI platform (port 8002)
 * Auth: X-Admin-Role / X-Admin-Key headers
 */
import axios from 'axios';

const getBaseUrl = () => {
    if (typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8002/api/v1';
    }
    return '/testai/api/v1';
};

const getAdminHeaders = () => ({
    'X-Admin-Role': localStorage.getItem('adminRole') || '',
    'X-Admin-Key': localStorage.getItem('adminKey') || '',
});

const api = axios.create({ baseURL: getBaseUrl() });

api.interceptors.request.use((config) => {
    config.headers = { ...config.headers, ...getAdminHeaders() };
    return config;
});

api.interceptors.response.use(
    (res) => res.data,
    (err) => Promise.reject(err),
);

const testAiService = {
    // ===== Olympiad test sets =====
    listOlympiadTestSets: (olympiadId) =>
        api.get('/olympiad-tests', { params: { olympiad_id: olympiadId } }),

    getOlympiadTestSet: (testId) =>
        api.get(`/olympiad-tests/${testId}`),

    createOlympiadTestSet: (olympiadId, title, questions, status = 'draft') =>
        api.post('/olympiad-tests', { olympiad_id: olympiadId, title, questions, status }),

    updateOlympiadTestSet: (testId, data) =>
        api.put(`/olympiad-tests/${testId}`, data),

    deleteOlympiadTestSet: (testId) =>
        api.delete(`/olympiad-tests/${testId}`),

    publishOlympiadTestSet: (testId) =>
        api.put(`/olympiad-tests/${testId}`, { status: 'published' }),

    hideOlympiadTestSet: (testId) =>
        api.put(`/olympiad-tests/${testId}`, { status: 'draft' }),

    // ===== Parse / AI =====
    parseTextQuestions: (text) =>
        api.post('/olympiad-tests/parse-text', { text }),

    parseFileQuestions: (file) => {
        const fd = new FormData();
        fd.append('file', file);
        return api.post('/olympiad-tests/parse-file', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    aiGenerateQuestions: (olympiadId, text, count = 10, title = 'AI test') =>
        api.post('/olympiad-tests/ai-generate', {
            olympiad_id: olympiadId,
            text,
            count,
            title,
        }),
};

export default testAiService;
