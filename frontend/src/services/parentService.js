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
        const response = await apiService.get('/parents/children');
        return response.data;
    }

    /**
     * Create a new child account
     * @param {Object} childData - { first_name, last_name, date_of_birth, relationship, avatar_id }
     * @returns {Promise<Object>} Created child account and credentials
     */
    async createChild(childData) {
        const response = await apiService.post('/parents/children', childData);
        return response.data;
    }

    /**
     * Get detailed progress for a child
     * @param {string} childId - Child user ID
     * @returns {Promise<Object>} Child progress details
     */
    async getChildDetails(childId) {
        const response = await apiService.get(`/parents/children/${childId}`);
        return response.data;
    }

    /**
     * Update child parental control settings
     * @param {string} childId - Child user ID
     * @param {Object} settings - { screen_time_limit, is_restricted }
     * @returns {Promise<Object>} Updated settings
     */
    async updateChildSettings(childId, settings) {
        const response = await apiService.put(`/parents/children/${childId}/settings`, settings);
        return response.data;
    }

    /**
     * Regenerate child PIN
     * @param {string} childId - Child user ID
     * @returns {Promise<Object>} New PIN
     */
    async regenerateChildPin(childId) {
        const response = await apiService.post(`/parents/children/${childId}/regenerate-pin`);
        return response.data;
    }
}

export const parentService = new ParentService();
export default parentService;
