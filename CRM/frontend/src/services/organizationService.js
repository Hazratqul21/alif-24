/**
 * Organization Service
 * Handles organization-related API calls
 * 
 * FIXED: Was using orphaned api.js (axios). Now uses unified apiService.js
 * for consistent auth handling and error management.
 */
import apiService from './apiService';

const organizationService = {
    // --- Stats ---
    getStats: async () => {
        const response = await apiService.get('/organization/stats');
        return response;
    },

    // --- Users ---
    getUsers: async (role) => {
        const params = {};
        if (role) params.role = role;
        const response = await apiService.get('/organization/users', params);
        return response;
    },

    inviteStudent: async (data) => {
        const response = await apiService.post('/organization-structure/students/invite', data);
        return response;
    },

    // --- Teachers ---
    getTeachers: async () => {
        const response = await apiService.get('/organization-structure/teachers');
        return response;
    },

    addTeacher: async (teacherId) => {
        const response = await apiService.post('/organization-structure/teachers', { teacher_id: teacherId });
        return response;
    },

    removeTeacher: async (teacherId) => {
        const response = await apiService.delete(`/organization-structure/teachers/${teacherId}`);
        return response;
    },

    getPendingTeachers: async () => {
        const response = await apiService.get('/organization/pending-teachers');
        return response;
    },

    approveTeacher: async (teacherUserId) => {
        const response = await apiService.post(`/organization/approve-teacher/${teacherUserId}`);
        return response;
    },

    rejectTeacher: async (teacherUserId, reason) => {
        const response = await apiService.post(`/organization/reject-teacher/${teacherUserId}`, { reason });
        return response;
    },

    // --- Materials (Content Box) ---
    getMaterials: async () => {
        const response = await apiService.get('/organization-structure/materials');
        return response;
    },

    uploadMaterial: async (formData) => {
        // For file uploads, we need raw fetch with FormData
        const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
        const token = localStorage.getItem('accessToken');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // Don't set Content-Type for FormData — browser sets it with boundary
        const response = await fetch(`${API_URL}/organization-structure/materials`, {
            method: 'POST',
            headers,
            body: formData
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Upload failed');
        }
        return response.json();
    },

    // --- Schedule ---
    getSchedule: async (classroomId) => {
        const response = await apiService.get(`/schedule/classroom/${classroomId}`);
        return response;
    },

    createSchedule: async (scheduleData) => {
        const response = await apiService.post('/schedule/', scheduleData);
        return response;
    },

    // --- Reading Analysis ---
    getReadingAnalyses: async (limit = 20) => {
        try {
            const response = await apiService.get(`/organization/reading-analyses`, { limit });
            return response;
        } catch (e) {
            console.warn("Reading analysis endpoint not found, returning empty", e);
            return { analyses: [] };
        }
    }
};

export default organizationService;
