import apiService from './apiService';

/**
 * Parent Service
 * Handles parent-related API calls for managing children
 */
class ParentService {
    /**
     * Get all children for the parent
     * @returns {Promise<Array>} List of children
     */
    async getChildren() {
        const response = await apiService.get('/auth/children');
        return response.data;
    }

    /**
     * Search for a student by ID, email, phone or username
     * @param {string} query - ID, email, phone or username
     * @returns {Promise<Object>} Found student data
     */
    async searchChild(query) {
        const response = await apiService.post('/auth/children/search', { query });
        return response.data;
    }

    /**
     * Send parent invite to a student
     * @param {string} studentId - Student user ID
     * @returns {Promise<Object>} Result message
     */
    async inviteChild(studentId) {
        const response = await apiService.post('/auth/children/invite', { student_id: studentId });
        return response;
    }

    /**
     * Get pending parent invites
     * @returns {Promise<Array>} List of pending invites
     */
    async getPendingInvites() {
        const response = await apiService.get('/auth/children/pending');
        return response.data;
    }

    /**
     * Get detailed progress for a child
     * @param {string} childId - Child user ID
     * @returns {Promise<Object>} Child progress details
     */
    async getChildDetails(childId) {
        const response = await apiService.get(`/auth/children/${childId}`);
        return response.data;
    }

    /**
     * Update child parental control settings
     * @param {string} childId - Child user ID
     * @param {Object} settings - { screen_time_limit, is_restricted }
     * @returns {Promise<Object>} Updated settings
     */
    async updateChildSettings(childId, settings) {
        const response = await apiService.patch(`/auth/children/${childId}/settings`, settings);
        return response.data;
    }

    /**
     * Regenerate child PIN
     * @param {string} childId - Child user ID
     * @returns {Promise<Object>} New PIN
     */
    async regenerateChildPin(childId) {
        const response = await apiService.post(`/auth/children/${childId}/regenerate-pin`);
        return response.data;
    }

    // ============ LMS: Child Assignments ============

    async getChildAssignments(childUserId) {
        return apiService.get(`/parents/children/${childUserId}/assignments`);
    }

    async assignTask(data) {
        return apiService.post('/parents/assign', data);
    }

    async getChildTeachers(childUserId) {
        return apiService.get(`/parents/children/${childUserId}/teachers`);
    }

    /**
     * Upload an assignment file.
     * @param {File} file - The file to upload.
     * @returns {Promise<Object>} Response from the upload.
     */
    async uploadAssignmentFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        return apiService.post('/upload/assignment-file', formData);
    }
}

export const parentService = new ParentService();
export default parentService;
