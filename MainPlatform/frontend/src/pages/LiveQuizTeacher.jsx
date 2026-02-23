import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import quizService from '../services/quizService';
import {
  Plus, Trash2, Play, Users, Trophy, ArrowLeft, Loader2, CheckCircle, Copy,
  Clock, BarChart3, ChevronRight, X, Zap, Star, Target, Medal, PartyPopper
} from 'lucide-react';

const OPTION_COLORS = ['#E53935', '#1E88E5', '#43A047', '#FB8C00'];

const LiveQuizTeacher = () => {
  const navigate = useNavigate();

  // Phases: create, add_questions, lobby, live, question_result, leaderboard, finished
  const [phase, setPhase] = useState('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quiz creation
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [quizId, setQuizId] = useState(null);
  const [joinCode, setJoinCode] = useState('');

  // Questions
  const [questions, setQuestions] = useState([
    { text: '', options: ['', '', '', ''], correct: -1, points: 100 }
  ]);

  // Lobby
  const [participants, setParticipants] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);
  const pollRef = useRef(null);

  // Live
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionResults, setQuestionResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ====== CREATE QUIZ ======
  const handleCreate = async () => {
    if (!title.trim()) { setError('Quiz nomini kiriting'); return; }
    setLoading(true); setError('');
    try {
      const res = await quizService.createQuiz(title.trim(), description.trim(), timePerQuestion);
      setQuizId(res.quiz_id);
      setJoinCode(res.join_code);
      setPhase('add_questions');
    } catch (err) {
      setError(err.message || 'Xatolik');
    } finally { setLoading(false); }
  };

  // ====== ADD QUESTIONS ======
  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correct: -1, points: 100 }]);
  };

  const removeQuestion = (idx) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, field, value) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIdx, optIdx, value) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = value;
    setQuestions(updated);
  };

  const handleSaveQuestions = async () => {
    const invalid = questions.find(q => !q.text.trim() || q.options.some(o => !o.trim()));
    if (invalid) { setError('Barcha savollar va variantlarni to\'ldiring'); return; }
    const noCorrect = questions.find(q => q.correct < 0);
    if (noCorrect) { setError('Har bir savolda to\'g\'ri javobni belgilang (yashil tugmani bosing)'); return; }
    setLoading(true); setError('');
    try {
      await quizService.addQuestions(quizId, questions);
      const lobby = await quizService.openLobby(quizId);
      setJoinCode(lobby.join_code);
      setPhase('lobby');
      startLobbyPoll();
    } catch (err) {
      setError(err.message || 'Xatolik');
    } finally { setLoading(false); }
  };

  // ====== LOBBY ======
  const startLobbyPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await quizService.getLobbyStatus(quizId);
        setParticipants(res.participants || []);
        setParticipantCount(res.participants_count || 0);
      } catch (e) { console.error(e); }
    }, 2000);
  };

  const handleStartQuiz = async () => {
    if (participantCount === 0) { setError('Kamida 1 ta qatnashchi kerak'); return; }
    if (pollRef.current) clearInterval(pollRef.current);
    setLoading(true); setError('');
    try {
      await quizService.startQuiz(quizId);
      const q = await quizService.getCurrentQuestion(quizId);
      setCurrentQuestion(q);
      setPhase('live');
    } catch (err) {
      setError(err.message || 'Xatolik');
    } finally { setLoading(false); }
  };

  // ====== LIVE ======
  const handleShowResults = async () => {
    if (!currentQuestion) return;
    try {
      const res = await quizService.getQuestionResults(quizId, currentQuestion.question_id);
      setQuestionResults(res);
      setPhase('question_result');
    } catch (err) { setError(err.message); }
  };

  const handleNextQuestion = async () => {
    setLoading(true); setError('');
    try {
      const res = await quizService.nextQuestion(quizId);
      if (res.finished) {
        const lb = await quizService.getLeaderboard(quizId);
        setLeaderboard(lb);
        setPhase('finished');
      } else {
        setCurrentQuestion(res);
        setQuestionResults(null);
        setPhase('live');
      }
    } catch (err) {
      setError(err.message || 'Xatolik');
    } finally { setLoading(false); }
  };

  const handleShowLeaderboard = async () => {
    try {
      const lb = await quizService.getLeaderboard(quizId);
      setLeaderboard(lb);
      setPhase('leaderboard');
    } catch (err) { setError(err.message); }
  };

  const handleEndQuiz = async () => {
    try {
      const res = await quizService.endQuiz(quizId);
      setLeaderboard(res.leaderboard || []);
      setPhase('finished');
    } catch (err) { setError(err.message); }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(joinCode);
  };

  // ====== RENDER: CREATE ======
  if (phase === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-xl mx-auto">
          <button onClick={() => navigate(-1)} className="mb-4 p-2 hover:bg-gray-200 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="mb-2 flex justify-center"><Target size={40} className="text-indigo-600" /></div>
              <h1 className="text-2xl font-bold">Yangi Live Quiz</h1>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quiz nomi *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Masalan: Matematika test"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ixtiyoriy"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Har bir savol uchun vaqt (soniya)</label>
                <select value={timePerQuestion} onChange={e => setTimePerQuestion(Number(e.target.value))}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl">
                  <option value={15}>15 soniya</option>
                  <option value={20}>20 soniya</option>
                  <option value={30}>30 soniya</option>
                  <option value={45}>45 soniya</option>
                  <option value={60}>60 soniya</option>
                </select>
              </div>
              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
              <button onClick={handleCreate} disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                {loading ? 'Yaratilmoqda...' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== RENDER: ADD QUESTIONS ======
  if (phase === 'add_questions') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Savollar qo'shish</h1>
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">{questions.length} ta savol</span>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-bold">Savol {qIdx + 1}</span>
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(qIdx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={18} /></button>
                  )}
                </div>
                <input value={q.text} onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                  placeholder="Savol matnini kiriting..." className="w-full p-3 border-2 border-gray-200 rounded-xl mb-3 focus:border-indigo-500 focus:outline-none text-lg" />
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="relative">
                      <input value={opt} onChange={e => updateOption(qIdx, optIdx, e.target.value)}
                        placeholder={`Variant ${optIdx + 1}`}
                        className={`w-full p-3 pr-10 border-2 rounded-xl focus:outline-none ${q.correct === optIdx ? 'border-green-400 bg-green-50' : 'border-gray-200'}`} />
                      <button onClick={() => updateQuestion(qIdx, 'correct', optIdx)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 ${q.correct === optIdx ? 'text-green-500' : 'text-gray-300'}`}>
                        <CheckCircle size={20} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Yashil ramkali variant = to'g'ri javob</p>
              </div>
            ))}
          </div>

          <button onClick={addQuestion} className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-2">
            <Plus size={18} /> Savol qo'shish
          </button>

          {error && <p className="text-red-500 text-sm font-medium mt-3">{error}</p>}

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
            <div className="max-w-2xl mx-auto">
              <button onClick={handleSaveQuestions} disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                {loading ? 'Saqlanmoqda...' : `Saqlash va Lobby ochish (${questions.length} savol)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== RENDER: LOBBY ======
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col items-center justify-center p-4 text-white">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-white/70 mb-8">O'quvchilar quyidagi kod bilan qo'shilsin</p>

        <div className="bg-white rounded-3xl p-8 text-center shadow-2xl mb-8">
          <p className="text-gray-500 text-sm mb-2">Qo'shilish kodi</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl font-mono font-black text-gray-800 tracking-[0.3em]">{joinCode}</span>
            <button onClick={copyCode} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><Copy size={20} /></button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 w-full max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center gap-2 font-bold"><Users size={20} /> Qatnashchilar</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{participantCount}/40</span>
          </div>
          {participants.length === 0 ? (
            <div className="text-center py-6 text-white/50">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              <p>Kutilmoqda...</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map((p, i) => (
                <div key={i} className="bg-white/20 px-3 py-2 rounded-xl flex items-center gap-2">
                  <span>{p.avatar_emoji}</span>
                  <span className="font-medium text-sm">{p.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-200 mt-3">{error}</p>}

        <button onClick={handleStartQuiz} disabled={loading || participantCount === 0}
          className="mt-8 px-12 py-4 bg-white text-indigo-600 font-bold text-lg rounded-2xl shadow-xl hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
          {loading ? 'Boshlanmoqda...' : 'Quizni Boshlash!'}
        </button>
      </div>
    );
  }

  // ====== RENDER: LIVE QUESTION ======
  if (phase === 'live' && currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <div className="p-4 flex justify-between items-center text-white">
          <span className="bg-white/10 px-4 py-2 rounded-full font-bold">{currentQuestion.question_number}/{currentQuestion.total_questions}</span>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
            <Clock size={16} /> {currentQuestion.time_limit}s
          </div>
          <button onClick={handleShowLeaderboard} className="bg-white/10 px-4 py-2 rounded-full hover:bg-white/20">
            <Trophy size={16} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-3xl w-full text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{currentQuestion.text}</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-3xl">
            {currentQuestion.options?.map((opt, idx) => (
              <div key={idx} className="p-6 rounded-2xl text-white font-bold text-xl text-center shadow-lg"
                style={{ backgroundColor: OPTION_COLORS[idx % 4] }}>
                {opt}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 flex justify-center gap-4">
          <button onClick={handleShowResults} className="px-8 py-3 bg-white text-gray-800 font-bold rounded-xl shadow-lg hover:bg-gray-100 flex items-center gap-2">
            <BarChart3 size={18} /> Natijalarni ko'rsatish
          </button>
          <button onClick={handleNextQuestion} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 flex items-center gap-2">
            <ChevronRight size={18} /> Keyingi savol
          </button>
        </div>
      </div>
    );
  }

  // ====== RENDER: QUESTION RESULTS ======
  if (phase === 'question_result' && questionResults) {
    const total = questionResults.total_answers || 1;
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl">
          <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">{questionResults.question_text}</h2>
          <p className="text-center text-gray-500 mb-6">{questionResults.correct_count}/{questionResults.total_answers} ta to'g'ri javob</p>
          <div className="space-y-3">
            {questionResults.options?.map((opt, idx) => {
              const count = questionResults.option_counts?.[idx] || 0;
              const pct = Math.round((count / total) * 100);
              const isCorrect = idx === questionResults.correct_answer;
              return (
                <div key={idx} className="relative overflow-hidden rounded-xl">
                  <div className={`p-4 flex justify-between items-center z-10 relative ${isCorrect ? 'text-white' : 'text-gray-700'}`}
                    style={{ backgroundColor: isCorrect ? '#43A047' : '#f3f4f6' }}>
                    <span className="font-bold">{isCorrect && <CheckCircle size={16} className="inline mr-2" />}{opt}</span>
                    <span className="font-bold">{count} ({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button onClick={handleShowLeaderboard} className="px-6 py-3 bg-white text-gray-800 font-bold rounded-xl shadow-lg flex items-center gap-2">
            <Trophy size={18} /> Leaderboard
          </button>
          <button onClick={handleNextQuestion} disabled={loading}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ChevronRight size={18} />}
            Keyingi savol
          </button>
        </div>
      </div>
    );
  }

  // ====== RENDER: LEADERBOARD ======
  if (phase === 'leaderboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg">
          <div className="text-center mb-6">
            <Trophy size={48} className="text-yellow-500 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-gray-800">Leaderboard</h1>
          </div>
          <div className="space-y-3">
            {leaderboard.map((p, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-xl ${i === 0 ? 'bg-yellow-50 border-2 border-yellow-300' : i === 1 ? 'bg-gray-50 border border-gray-200' : i === 2 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black">{i < 3 ? <Medal size={24} className={i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-amber-600'} /> : `#${i + 1}`}</span>
                  <span className="text-lg">{p.avatar_emoji}</span>
                  <span className="font-bold">{p.display_name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{p.total_score}</div>
                  <div className="text-xs text-gray-500">{p.correct_count} to'g'ri</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setPhase('live')} className="flex-1 py-3 bg-gray-100 text-gray-800 font-bold rounded-xl">Qaytish</button>
            <button onClick={handleEndQuiz} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl">Quizni tugatish</button>
          </div>
        </div>
      </div>
    );
  }

  // ====== RENDER: FINISHED ======
  if (phase === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg text-center">
          <div className="mb-4 flex justify-center"><Trophy size={52} className="text-yellow-500" /></div>
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Quiz tugadi!</h1>

          {leaderboard.length > 0 && (
            <div className="space-y-3 mb-6">
              {leaderboard.slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="flex items-center gap-2">
                    <span className="font-black">{i < 3 ? <Medal size={18} className={i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-amber-600'} /> : `#${i + 1}`}</span>
                    <span>{p.avatar_emoji} {p.display_name}</span>
                  </span>
                  <span className="font-bold text-indigo-600">{p.total_score}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => navigate('/teacher-dashboard')}
            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl">
            Dashboardga qaytish
          </button>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={48} /></div>;
};

export default LiveQuizTeacher;
