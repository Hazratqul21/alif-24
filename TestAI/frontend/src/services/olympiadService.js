import apiService from './apiService';

class OlympiadService {
  // Public
  async getUpcoming() {
    const res = await apiService.get('/olympiad/list');
    return res.data || res;
  }

  // Student
  async register(olympiadId) {
    const res = await apiService.post(`/olympiad/${olympiadId}/register`);
    return res.data || res;
  }

  async begin(olympiadId) {
    const res = await apiService.post(`/olympiad/${olympiadId}/begin`);
    return res.data || res;
  }

  async submitAnswer(olympiadId, questionId, selectedAnswer) {
    const res = await apiService.post(`/olympiad/${olympiadId}/answer`, {
      question_id: questionId,
      selected_answer: selectedAnswer
    });
    return res.data || res;
  }

  async complete(olympiadId) {
    const res = await apiService.post(`/olympiad/${olympiadId}/complete`);
    return res.data || res;
  }

  async getResults(olympiadId) {
    const res = await apiService.get(`/olympiad/${olympiadId}/results`);
    return res.data || res;
  }

  async getMyHistory() {
    const res = await apiService.get('/olympiad/my-history');
    return res.data || res;
  }

  // Moderator
  async create(data) {
    const res = await apiService.post('/olympiad/create', data);
    return res.data || res;
  }

  async addQuestions(olympiadId, questions) {
    const res = await apiService.post(`/olympiad/${olympiadId}/questions`, { questions });
    return res.data || res;
  }

  async publish(olympiadId) {
    const res = await apiService.post(`/olympiad/${olympiadId}/publish`);
    return res.data || res;
  }

  async start(olympiadId) {
    const res = await apiService.post(`/olympiad/${olympiadId}/start`);
    return res.data || res;
  }

  async finish(olympiadId) {
    const res = await apiService.post(`/olympiad/${olympiadId}/finish`);
    return res.data || res;
  }
}

export const olympiadService = new OlympiadService();
export default olympiadService;
