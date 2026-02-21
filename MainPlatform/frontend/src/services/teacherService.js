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
    async getAssignments(classroomId = null) {
        const params = {};
        if (classroomId) params.classroom_id = classroomId;
        return apiService.get('/teachers/assignments', params);
    }

    /**
     * Get messages
     * @returns {Promise<Array>} List of messages
     */
    async getMessages() {
        return apiService.get('/notifications');
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
        return apiService.post('/teachers/assignments', data);
    }

    async getAssignmentDetail(assignmentId) {
        return apiService.get(`/teachers/assignments/${assignmentId}`);
    }

    async updateAssignment(assignmentId, data) {
        return apiService.put(`/teachers/assignments/${assignmentId}`, data);
    }

    async deleteAssignment(assignmentId) {
        return apiService.delete(`/teachers/assignments/${assignmentId}`);
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

    async gradeSubmission(assignmentId, submissionId, data) {
        return apiService.post(`/teachers/assignments/${assignmentId}/grade/${submissionId}`, data);
    }

    async getClassroomDetail(classroomId) {
        return apiService.get(`/teachers/classrooms/${classroomId}`);
    }

    async updateClassroom(classroomId, data) {
        return apiService.put(`/teachers/classrooms/${classroomId}`, data);
    }

    async deleteClassroom(classroomId) {
        return apiService.delete(`/teachers/classrooms/${classroomId}`);
    }

    async inviteStudent(classroomId, data) {
        return apiService.post(`/teachers/classrooms/${classroomId}/invite`, data);
    }

    async removeStudentFromClass(classroomId, studentUserId) {
        return apiService.delete(`/teachers/classrooms/${classroomId}/students/${studentUserId}`);
    }

    async sendMessage(data) {
        return apiService.post('/messages', data);
    }

    // AI Test Generator
    async generateAITest(data) {
        return apiService.post('/teachers/ai/generate-test', data);
    }

    // Lessons API
    async getLessons() {
        return apiService.get('/teachers/lessons');
    }

    async getLessonDetail(lessonId) {
        return apiService.get(`/teachers/lessons/${lessonId}`);
    }

    async createLesson(data) {
        return apiService.post('/teachers/lessons', data);
    }

    async updateLesson(lessonId, data) {
        return apiService.put(`/teachers/lessons/${lessonId}`, data);
    }

    async deleteLesson(lessonId) {
        return apiService.delete(`/teachers/lessons/${lessonId}`);
    }
}

export const teacherService = new TeacherService();
