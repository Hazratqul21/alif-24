import apiService from './apiService';

class NotificationService {
    /**
     * Get notifications (polling)
     * @param {boolean} unreadOnly - Only unread
     * @param {number} limit - Max count
     * @returns {Promise<Object>}
     */
    async getNotifications(unreadOnly = false, limit = 20) {
        const params = { limit };
        if (unreadOnly) params.unread_only = true;
        return apiService.get('/notifications', params);
    }

    /**
     * Get unread count (fast polling)
     * @returns {Promise<Object>}
     */
    async getUnreadCount() {
        return apiService.get('/notifications/unread-count');
    }

    /**
     * Mark notification as read
     * @param {string} notificationId
     * @returns {Promise<Object>}
     */
    async markRead(notificationId) {
        return apiService.post(`/notifications/${notificationId}/read`);
    }

    /**
     * Mark all as read
     * @returns {Promise<Object>}
     */
    async markAllRead() {
        return apiService.post('/notifications/read-all');
    }

    /**
     * Delete notification
     * @param {string} notificationId
     * @returns {Promise<Object>}
     */
    async deleteNotification(notificationId) {
        return apiService.delete(`/notifications/${notificationId}`);
    }
}

export const notificationService = new NotificationService();
export default notificationService;
