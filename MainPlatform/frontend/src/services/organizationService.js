/**
 * Organization Service
 * Ta'lim tashkiloti uchun barcha API chaqiruvlari
 */
import apiService from './apiService';

const organizationService = {
    // --- Dashboard & Stats ---
    getStats: () => apiService.get('/organization/stats'),

    // --- User Search (universal) ---
    searchUser: (query) => apiService.get('/organization/search-user', { q: query }),

    // --- Teachers ---
    getTeachers: (params = {}) => apiService.get('/organization/teachers', params),
    addTeacher: (userId) => apiService.post('/organization/teachers/add', { user_id: userId }),
    removeTeacher: (userId) => apiService.delete(`/organization/teachers/${userId}`),
    getPendingTeachers: () => apiService.get('/organization/teachers/pending'),
    reviewTeacher: (userId, action, reason) => apiService.post(`/organization/teachers/${userId}/review`, { action, reason }),

    // --- Students ---
    getStudents: (params = {}) => apiService.get('/organization/students', params),
    addStudent: (userId) => apiService.post('/organization/students/add', { user_id: userId }),
    createStudent: (data) => apiService.post('/organization/students/create', data),
    getStudentDetail: (userId) => apiService.get(`/organization/students/${userId}`),
    removeStudent: (userId) => apiService.delete(`/organization/students/${userId}`),

    // --- Classrooms ---
    getClassrooms: () => apiService.get('/organization/classrooms'),

    // --- Lessons ---
    getLessons: (params = {}) => apiService.get('/organization/lessons', params),
    createLesson: (data) => apiService.post('/organization/lessons', data),
    deleteLesson: (id) => apiService.delete(`/organization/lessons/${id}`),

    // --- Profile ---
    getProfile: () => apiService.get('/organization/profile'),
    updateProfile: (data) => apiService.put('/organization/profile', data),

    // --- My School (for teachers, students, parents) ---
    getMySchool: () => apiService.get('/organization/my-school'),

    // --- File Upload (reuse general upload) ---
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiService.post('/upload/assignment-file', formData);
    },
};

export default organizationService;
