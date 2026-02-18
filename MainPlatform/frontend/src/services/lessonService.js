import apiService from './apiService';

/**
 * Lesson Service
 * Handles lesson-related API calls
 */
class LessonService {
  /**
   * Get all lessons
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated lessons
   */
  async getLessons(params = {}) {
    const response = await apiService.get('/lessons', params);
    return response;
  }

  /**
   * Get lesson by ID
   * @param {string} id - Lesson ID
   * @returns {Promise<Object>} Lesson data
   */
  async getLessonById(id) {
    const response = await apiService.get(`/lessons/${id}`);
    return response.data;
  }

  /**
   * Get lessons for current student
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Recommended lessons
   */
  async getMyLessons(params = {}) {
    const response = await apiService.get('/lessons/for-me', params);
    return response.data;
  }

  /**
   * Start a lesson
   * @param {string} lessonId - Lesson ID
   * @returns {Promise<Object>} Progress record
   */
  async startLesson(lessonId) {
    const response = await apiService.post(`/lessons/${lessonId}/start`);
    return response.data;
  }

  /**
   * Complete a lesson
   * @param {string} lessonId - Lesson ID
   * @param {Object} data - Completion data (score, timeSpent, answers)
   * @returns {Promise<Object>} Updated progress
   */
  async completeLesson(lessonId, data) {
    const response = await apiService.post(`/lessons/${lessonId}/complete`, data);
    return response.data;
  }

  /**
   * Get lesson progress
   * @param {string} lessonId - Lesson ID
   * @returns {Promise<Object>} Progress data
   */
  async getProgress(lessonId) {
    const response = await apiService.get(`/lessons/${lessonId}/progress`);
    return response.data;
  }

  /**
   * Create new lesson (teacher/admin)
   * @param {Object} lessonData - Lesson data
   * @returns {Promise<Object>} Created lesson
   */
  async createLesson(lessonData) {
    const response = await apiService.post('/lessons', lessonData);
    return response.data;
  }

  /**
   * Update lesson (teacher/admin)
   * @param {string} id - Lesson ID
   * @param {Object} updates - Lesson updates
   * @returns {Promise<Object>} Updated lesson
   */
  async updateLesson(id, updates) {
    const response = await apiService.put(`/lessons/${id}`, updates);
    return response.data;
  }

  /**
   * Delete lesson (teacher/admin)
   * @param {string} id - Lesson ID
   * @returns {Promise<void>}
   */
  async deleteLesson(id) {
    await apiService.delete(`/lessons/${id}`);
  }

  /**
   * Generate AI lesson (teacher/admin)
   * @param {Object} params - Generation parameters
   * @returns {Promise<Object>} Generated content
   */
  async generateLesson(params) {
    const response = await apiService.post('/lessons/generate', params);
    return response.data;
  }
}

export const lessonService = new LessonService();
export default lessonService;
