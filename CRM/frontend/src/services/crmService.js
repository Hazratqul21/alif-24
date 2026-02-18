/**
 * CRM Service
 * Handles CRM-related API calls (leads, activities)
 * 
 * FIX #1: REMOVED raw axios entirely — was creating its own axios instance
 *         with a broken getAuthHeader() that read from localStorage.getItem('user')
 *         which NEVER had the token (AuthContext stores it as 'accessToken').
 * 
 * FIX #2: Now uses unified apiService.js which correctly reads 
 *         localStorage.getItem('accessToken') for the Authorization header.
 * 
 * FIX #3: Removed hardcoded fallback URL 'http://localhost:8000/api/v1' —
 *         apiService.js handles base URL centrally.
 */
import apiService from './apiService';

const crmService = {
    // ========================
    // LEADS
    // ========================

    /**
     * Get all leads with optional filters
     * @param {Object} params - Query params (e.g., { status: 'new', page: 1 })
     */
    getLeads: async (params = {}) => {
        const response = await apiService.get('/crm/leads', params);
        return response;
    },

    /**
     * Get single lead by ID
     * @param {string} id - Lead UUID
     */
    getLead: async (id) => {
        const response = await apiService.get(`/crm/leads/${id}`);
        return response;
    },

    /**
     * Create a new lead
     * @param {Object} data - Lead data { name, phone, email, source, etc. }
     */
    createLead: async (data) => {
        const response = await apiService.post('/crm/leads', data);
        return response;
    },

    /**
     * Update an existing lead
     * @param {string} id - Lead UUID
     * @param {Object} data - Fields to update
     */
    updateLead: async (id, data) => {
        const response = await apiService.put(`/crm/leads/${id}`, data);
        return response;
    },

    /**
     * Delete a lead
     * @param {string} id - Lead UUID
     */
    deleteLead: async (id) => {
        const response = await apiService.delete(`/crm/leads/${id}`);
        return response;
    },

    // ========================
    // ACTIVITIES
    // ========================

    /**
     * Create an activity for a lead
     * @param {string} leadId - Lead UUID
     * @param {Object} data - Activity data { type, description, scheduled_at }
     */
    createActivity: async (leadId, data) => {
        const response = await apiService.post(`/crm/leads/${leadId}/activities`, data);
        return response;
    },

    /**
     * Update an activity
     * @param {string} id - Activity UUID
     * @param {Object} data - Fields to update
     */
    updateActivity: async (id, data) => {
        const response = await apiService.put(`/crm/activities/${id}`, data);
        return response;
    },

    /**
     * Delete an activity
     * @param {string} id - Activity UUID
     */
    deleteActivity: async (id) => {
        const response = await apiService.delete(`/crm/activities/${id}`);
        return response;
    }
};

export default crmService;
