import apiService from './apiService';

/**
 * Student Service
 * Handles student-related API calls
 */
class StudentService {
  /**
   * Get current student profile
   * @returns {Promise<Object>} Student profile
   */
  async getMyProfile() {
    const response = await apiService.get('/students/me');
    return response.data;
  }

  /**
   * Get student by ID
   * @param {string} id - Student ID
   * @returns {Promise<Object>} Student data
   */
  async getStudentById(id) {
    const response = await apiService.get(`/students/${id}`);
    return response.data;
  }

  /**
   * Create/update student profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created/updated profile
   */
  async createProfile(profileData) {
    const response = await apiService.post('/students/profile', profileData);
    return response.data;
  }

  /**
   * Update student profile
   * @param {string} id - Student ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile(id, updates) {
    const response = await apiService.put(`/students/${id}`, updates);
    return response.data;
  }

  /**
   * Get student progress
   * @param {string} id - Student ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Progress data
   */
  async getProgress(id, params = {}) {
    const response = await apiService.get(`/students/${id}/progress`, params);
    return response.data;
  }

  /**
   * Get student achievements
   * @param {string} id - Student ID
   * @returns {Promise<Array>} Achievements
   */
  async getAchievements(id) {
    const response = await apiService.get(`/students/${id}/achievements`);
    return response.data;
  }

  /**
   * Get student statistics
   * @param {string} id - Student ID
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(id) {
    const response = await apiService.get(`/students/${id}/statistics`);
    return response.data;
  }

  /**
   * Get a lesson by ID (Student View)
   * Handles 403 Forbidden (Locked) gracefully
   * @param {string} lessonId - Lesson ID
   * @returns {Promise<Object>} Lesson data
   */
  async getLesson(lessonId) {
    try {
      const response = await apiService.get(`/lessons/${lessonId}`);
      return response.data;
    } catch (error) {
      if (error.message && error.message.toLowerCase().includes('locked')) {
        throw { status: 403, message: error.message || "Lesson Locked" };
      }
      throw error;
    }
  }

  /**
   * Complete a lesson (submit quiz)
   * @param {string} lessonId - Lesson ID
   * @param {Object} answers - Quiz answers { questionId: answer }
   * @returns {Promise<Object>} Result (coins, etc)
   */
  async completeLesson(lessonId, answers) {
    const response = await apiService.post(`/student-lessons/${lessonId}/complete`, answers);
    return response.data;
  }
}

export const studentService = new StudentService();
export default studentService;
