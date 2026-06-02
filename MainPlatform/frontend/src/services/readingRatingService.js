import api from './apiService';

export const getStudentLeaderboard = async (period = 'all_time', limit = 50, offset = 0) => {
    try {
        const response = await api.get(`/ratings/students`, { period, limit, offset });
        return response.data;
    } catch (error) {
        console.error('Error fetching student reading leaderboard:', error);
        throw error;
    }
};

export const getTeacherDashboardStats = async (teacherId, period = 'all_time') => {
    try {
        const response = await api.get(`/ratings/teacher/dashboard`, { teacher_id: teacherId, period });
        return response.data;
    } catch (error) {
        console.error('Error fetching teacher reading dashboard stats:', error);
        throw error;
    }
};

export const getOrganizationDashboardStats = async (organizationId, period = 'all_time') => {
    try {
        const response = await api.get(`/ratings/organization/dashboard`, { organization_id: organizationId, period });
        return response.data;
    } catch (error) {
        console.error('Error fetching organization reading dashboard stats:', error);
        throw error;
    }
};

export const getTeacherClassroomsReadingStats = async (teacherId, period = 'all_time') => {
    try {
        const response = await api.get(`/ratings/teacher/classrooms`, { teacher_id: teacherId, period });
        return response.data;
    } catch (error) {
        console.error('Error fetching teacher classrooms reading stats:', error);
        throw error;
    }
};

export const getClassroomLeaderboard = async (classroomId, period = 'all_time', limit = 50, offset = 0) => {
    try {
        const response = await api.get(`/ratings/classrooms/${classroomId}`, { period, limit, offset });
        return response.data;
    } catch (error) {
        console.error('Error fetching classroom reading leaderboard:', error);
        throw error;
    }
};

export const getStudentClassroomRanks = async (period = 'all_time') => {
    try {
        const response = await api.get(`/ratings/student/me/classrooms`, { period });
        return response.data;
    } catch (error) {
        console.error('Error fetching student classroom ranks:', error);
        throw error;
    }
};

