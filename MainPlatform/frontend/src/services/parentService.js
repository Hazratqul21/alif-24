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
     * Create a new child account
     * @param {Object} childData - { first_name, last_name, date_of_birth, gender, grade }
     * @returns {Promise<Object>} Created child account with credentials
     */
    async createChild(childData) {
        const response = await apiService.post('/auth/children', childData);
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
}

export const parentService = new ParentService();
export default parentService;
