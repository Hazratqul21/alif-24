import apiService from './apiService';

/**
 * Live Quiz Service
 * Kahoot-style real-time quiz API calls
 */
class QuizService {
  // ====== TEACHER FUNCTIONS ======

  async createQuiz(title, description = '', timePerQuestion = 30) {
    const res = await apiService.post('/live-quiz/create', {
      title,
      description,
      time_per_question: timePerQuestion,
      shuffle_questions: false,
      shuffle_options: false
    });
    return res.data || res;
  }

  async addQuestions(quizId, questions) {
    const res = await apiService.post(`/live-quiz/${quizId}/questions`, { questions });
    return res.data || res;
  }

  async openLobby(quizId) {
    const res = await apiService.post(`/live-quiz/${quizId}/open-lobby`);
    return res.data || res;
  }

  async getLobbyStatus(quizId) {
    const res = await apiService.get(`/live-quiz/${quizId}/lobby-status`);
    return res.data || res;
  }

  async startQuiz(quizId) {
    const res = await apiService.post(`/live-quiz/${quizId}/start`);
    return res.data || res;
  }

  async getCurrentQuestion(quizId) {
    const res = await apiService.get(`/live-quiz/${quizId}/current-question`);
    return res.data || res;
  }

  async nextQuestion(quizId) {
    const res = await apiService.post(`/live-quiz/${quizId}/next-question`);
    return res.data || res;
  }

  async getQuestionResults(quizId, questionId) {
    const res = await apiService.get(`/live-quiz/${quizId}/question-results/${questionId}`);
    return res.data || res;
  }

  async getLeaderboard(quizId) {
    const res = await apiService.get(`/live-quiz/${quizId}/leaderboard`);
    return res.data || res;
  }

  async endQuiz(quizId) {
    const res = await apiService.post(`/live-quiz/${quizId}/end`);
    return res.data || res;
  }

  // ====== STUDENT FUNCTIONS ======

  async joinQuiz(joinCode, displayName, avatarEmoji = '🎮') {
    const res = await apiService.post('/live-quiz/join', {
      join_code: joinCode,
      display_name: displayName,
      avatar_emoji: avatarEmoji
    });
    return res.data || res;
  }

  async getStudentQuestion(quizId) {
    const res = await apiService.get(`/live-quiz/${quizId}/student/question`);
    return res.data || res;
  }

  async submitAnswer(quizId, questionId, selectedAnswer, timeMs) {
    const res = await apiService.post(`/live-quiz/${quizId}/student/answer`, {
      question_id: questionId,
      selected_answer: selectedAnswer,
      time_to_answer_ms: timeMs
    });
    return res.data || res;
  }

  async getStudentResults(quizId) {
    const res = await apiService.get(`/live-quiz/${quizId}/student/results`);
    return res.data || res;
  }
}

export const quizService = new QuizService();
export default quizService;
