import apiService from './apiService';

class TeacherService {
    /**
     * Search for students by email or username
     * @param {string} query - Search query
     * @returns {Promise<Array>} List of students
     */
    async searchStudents(query) {
        return apiService.get('/teachers/students/search', { query });
    }

    /**
     * Add student to a classroom
     * @param {string} classroomId - Classroom ID
     * @param {string} studentId - Student User ID
     * @returns {Promise<Object>} Response
     */
    async addStudentToClass(classroomId, studentId) {
        return apiService.post(`/teachers/classrooms/${classroomId}/students`, { student_user_id: studentId });
    }

    /**
     * Get teacher's classrooms
     * @returns {Promise<Array>} List of classrooms
     */
    async getMyClassrooms() {
        return apiService.get('/teachers/my-classes');
    }

    /**
     * Create a new classroom
     * @param {Object} data - { name, subject, grade_level, description }
     * @returns {Promise<Object>} Created classroom
     */
    async createClassroom(data) {
        return apiService.post('/teachers/classrooms', data);
    }

    /**
     * Get dashboard statistics
     * @returns {Promise<Object>} Stats data
     */
    async getDashboardStats() {
        return apiService.get('/teachers/dashboard/stats');
    }

    /**
     * Get upcoming events (lessons/meetings)
     * @returns {Promise<Array>} List of events
     */
    async getUpcomingEvents() {
        return apiService.get('/teachers/dashboard/events');
    }

    /**
     * Get assignments
     * @returns {Promise<Array>} List of assignments
     */
    async getAssignments() {
        // Placeholder until backend endpoint is ready, returning empty array to prevent crash
        // return apiService.get('/teachers/assignments'); 
        return [];
    }

    /**
     * Get messages
     * @returns {Promise<Array>} List of messages
     */
    async getMessages() {
        // Placeholder until backend endpoint is ready
        // return apiService.get('/messages');
        return [];
    }

    /**
     * Create a new lesson
     * @param {Object} lessonData - Lesson data
     * @returns {Promise<Object>} Created lesson
     */
    async createLesson(lessonData) {
        return apiService.post('/lessons', lessonData);
    }

    /**
     * Create a new quiz (TeacherTest)
     * @param {Object} quizData - Quiz data
     * @returns {Promise<Object>} Created quiz
     */
    async createQuiz(quizData) {
        return apiService.post('/teacher-tests', quizData);
    }

    async getClassrooms() {
        return apiService.get('/teachers/my-classes');
    }

    async updateProfile(data) {
        return apiService.put('/auth/me', data);
    }

    async uploadAvatar(formData) {
        return apiService.post('/auth/avatar', formData);
    }

    async changePassword(data) {
        return apiService.put('/auth/password', data);
    }

    async createAssignment(data) {
        return apiService.post('/teacher-tests', {
            title: data.title,
            description: data.description,
            due_date: data.due_date,
            classroom_id: data.classroom_id
        });
    }

    async sendMessage(data) {
        return apiService.post('/messages', data);
    }
}

export const teacherService = new TeacherService();
