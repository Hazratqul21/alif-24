import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import olympiadService from '../services/olympiadService';
import {
  Trophy, Clock, Users, ArrowLeft, Loader2, CheckCircle, X, Star, Medal,
  Calendar, BookOpen, Zap, ChevronRight, Coins, AlertCircle
} from 'lucide-react';

const SUBJECT_LABELS = {
  math: 'Matematika', uzbek: "O'zbek tili", russian: 'Rus tili',
  english: 'Ingliz tili', logic: 'Mantiq', general: 'Umumiy bilim'
};
const SUBJECT_COLORS = {
  math: '#8B5CF6', uzbek: '#10B981', russian: '#3B82F6',
  english: '#EC4899', logic: '#F59E0B', general: '#6366F1'
};

const OlympiadPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Phases: list, exam, results, history
  const [phase, setPhase] = useState('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // List
  const [olympiads, setOlympiads] = useState([]);

  // Exam
  const [examData, setExamData] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [answerResults, setAnswerResults] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [olympiadId, setOlympiadId] = useState(null);
  const timerRef = useRef(null);

  // Results
  const [results, setResults] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  // History
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadOlympiads();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const loadOlympiads = async () => {
    setLoading(true);
    try {
      const data = await olympiadService.getUpcoming();
      setOlympiads(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Olimpiadalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (id) => {
    setError('');
    try {
      await olympiadService.register(id);
      alert("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
      loadOlympiads();
    } catch (err) {
      setError(err.message || "Ro'yxatdan o'tishda xatolik");
    }
  };

  const handleBegin = async (id) => {
    setLoading(true);
    setError('');
    setOlympiadId(id);
    try {
      const data = await olympiadService.begin(id);
      setExamData(data);
      setTimeLeft(data.duration_minutes * 60);
      setCurrentQ(0);
      setAnswers({});
      setAnswerResults({});
      setPhase('exam');
      // Start timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleFinish();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message || 'Boshlashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (questionId, selectedAnswer) => {
    if (answers[questionId] !== undefined) return;
    setAnswers(prev => ({ ...prev, [questionId]: selectedAnswer }));
    try {
      const res = await olympiadService.submitAnswer(olympiadId, questionId, selectedAnswer);
      setAnswerResults(prev => ({ ...prev, [questionId]: res }));
    } catch (err) {
      console.error('Answer error:', err);
    }
  };

  const handleFinish = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const res = await olympiadService.complete(olympiadId);
      setResults(res);
      // Try to load leaderboard
      try {
        const lb = await olympiadService.getResults(olympiadId);
        setLeaderboard(Array.isArray(lb) ? lb : []);
      } catch (e) { /* leaderboard may not be available yet */ }
      setPhase('results');
    } catch (err) {
      setError(err.message || 'Tugatishda xatolik');
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await olympiadService.getMyHistory();
      setHistory(Array.isArray(data) ? data : []);
      setPhase('history');
    } catch (err) {
      setError('Tarixni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ====== LIST ======
  if (phase === 'list') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full"><ArrowLeft size={20} /></button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy size={28} /> Olimpiadalar</h1>
                <p className="text-white/70 text-sm">Bilimingizni sinab ko'ring!</p>
              </div>
            </div>
            <button onClick={loadHistory} className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 text-sm font-medium">
              <Clock size={16} className="inline mr-1" /> Mening tarixim
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}

          {loading ? (
            <div className="text-center py-20"><Loader2 className="animate-spin mx-auto" size={40} /></div>
          ) : olympiads.length === 0 ? (
            <div className="text-center py-20">
              <Trophy size={64} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-600">Hozircha olimpiada yo'q</h3>
              <p className="text-gray-400 mt-2">Tez orada yangi olimpiadalar e'lon qilinadi</p>
            </div>
          ) : (
            <div className="space-y-4">
              {olympiads.map(o => (
                <div key={o.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: SUBJECT_COLORS[o.subject] || '#6366F1' }}>
                            {SUBJECT_LABELS[o.subject] || o.subject}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${o.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {o.status === 'active' ? '🔴 Faol' : '📋 Ro\'yxat ochiq'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">{o.title}</h3>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(o.start_time).toLocaleDateString('uz-UZ')}</span>
                          <span className="flex items-center gap-1"><Users size={14} /> {o.participants_count}/{o.max_participants}</span>
                          <span className="flex items-center gap-1"><BookOpen size={14} /> {o.min_age}-{o.max_age} yosh</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        {o.status === 'upcoming' ? (
                          <button onClick={() => handleRegister(o.id)}
                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">
                            Ro'yxatdan o'tish
                          </button>
                        ) : o.status === 'active' ? (
                          <button onClick={() => handleBegin(o.id)}
                            className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg flex items-center gap-2">
                            <Zap size={18} /> Boshlash
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====== EXAM ======
  if (phase === 'exam' && examData) {
    const questions = examData.questions || [];
    const q = questions[currentQ];
    const totalQ = questions.length;
    const isAnswered = q && answers[q.id] !== undefined;
    const result = q && answerResults[q.id];

    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Top bar */}
        <div className="p-4 flex justify-between items-center bg-gray-800">
          <div className="text-white font-bold">{examData.olympiad_title}</div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${timeLeft <= 60 ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-800'}`}>
            <Clock size={18} /> {formatTimer(timeLeft)}
          </div>
          <div className="text-white text-sm">{currentQ + 1}/{totalQ}</div>
        </div>

        {/* Progress */}
        <div className="px-4 py-2">
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i === currentQ ? 'bg-indigo-500' : answers[questions[i]?.id] !== undefined ? (answerResults[questions[i]?.id]?.is_correct ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-700'}`} />
            ))}
          </div>
        </div>

        {/* Question */}
        {q && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-2xl w-full text-center mb-6">
              <span className="text-sm text-gray-400 mb-2 block">Savol {currentQ + 1} / {totalQ} — {q.points} ball</span>
              <h2 className="text-xl font-bold text-gray-800">{q.text}</h2>
              {q.image && <img src={q.image} alt="" className="mt-4 max-h-48 mx-auto rounded-xl" />}
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
              {q.options?.map((opt, idx) => {
                const selected = answers[q.id] === idx;
                const correct = result && result.is_correct && selected;
                const wrong = result && !result.is_correct && selected;
                return (
                  <button key={idx} onClick={() => handleAnswer(q.id, idx)}
                    disabled={isAnswered}
                    className={`p-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-all ${correct ? 'ring-4 ring-green-300 scale-105' : ''} ${wrong ? 'ring-4 ring-red-300 opacity-60' : ''} ${isAnswered && !selected ? 'opacity-40' : ''}`}
                    style={{ backgroundColor: ['#E53935', '#1E88E5', '#43A047', '#FB8C00'][idx % 4] }}>
                    {opt}
                  </button>
                );
              })}
            </div>

            {result && (
              <div className={`mt-4 p-3 rounded-xl text-white font-bold ${result.is_correct ? 'bg-green-500' : 'bg-red-500'}`}>
                {result.is_correct ? `✅ To'g'ri! +${result.points_earned} ball` : '❌ Noto\'g\'ri'}
                <span className="ml-3 text-sm">Jami: {result.total_score} ball</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="p-4 flex justify-between">
          <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            className="px-6 py-3 bg-gray-700 text-white rounded-xl disabled:opacity-30">
            ← Oldingi
          </button>
          {currentQ < totalQ - 1 ? (
            <button onClick={() => setCurrentQ(currentQ + 1)}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl">
              Keyingi →
            </button>
          ) : (
            <button onClick={handleFinish}
              className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
              <CheckCircle size={18} /> Tugatish
            </button>
          )}
        </div>
      </div>
    );
  }

  // ====== RESULTS ======
  if (phase === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Olimpiada tugadi!</h1>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-indigo-50 p-4 rounded-2xl">
              <div className="text-2xl font-bold text-indigo-600">{results?.total_score || 0}</div>
              <div className="text-xs text-gray-500">Jami ball</div>
            </div>
            <div className="bg-green-50 p-4 rounded-2xl">
              <div className="text-2xl font-bold text-green-600">{results?.correct_answers || 0}</div>
              <div className="text-xs text-gray-500">To'g'ri</div>
            </div>
            <div className="bg-red-50 p-4 rounded-2xl">
              <div className="text-2xl font-bold text-red-600">{results?.wrong_answers || 0}</div>
              <div className="text-xs text-gray-500">Noto'g'ri</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-2xl">
              <div className="text-2xl font-bold text-orange-600">{Math.floor((results?.time_spent_seconds || 0) / 60)}m</div>
              <div className="text-xs text-gray-500">Vaqt</div>
            </div>
          </div>

          {leaderboard.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-gray-700 mb-3">TOP natijalar</h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl text-sm">
                    <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`} {p.student_name}</span>
                    <span className="font-bold">{p.total_score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { setPhase('list'); loadOlympiads(); }}
            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl">
            Ortga qaytish
          </button>
        </div>
      </div>
    );
  }

  // ====== HISTORY ======
  if (phase === 'history') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button onClick={() => { setPhase('list'); loadOlympiads(); }} className="p-2 hover:bg-white/10 rounded-full"><ArrowLeft size={20} /></button>
            <h1 className="text-xl font-bold">Mening olimpiada tarixim</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto p-6">
          {loading ? <div className="text-center py-20"><Loader2 className="animate-spin mx-auto" size={40} /></div> :
            history.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Medal size={48} className="mx-auto mb-3" />
                <p>Hali olimpiadada qatnashmadingiz</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800">{h.olympiad_title}</h3>
                      <div className="flex gap-3 mt-1 text-sm text-gray-500">
                        <span>{SUBJECT_LABELS[h.olympiad_subject] || h.olympiad_subject}</span>
                        <span>{new Date(h.date).toLocaleDateString('uz-UZ')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {h.rank && <div className="text-2xl font-black text-indigo-600">#{h.rank}</div>}
                      <div className="text-sm text-gray-500">{h.total_score} ball</div>
                      {h.coins_earned > 0 && <div className="text-xs text-yellow-600 flex items-center gap-1 justify-end"><Coins size={12} /> +{h.coins_earned}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    );
  }

  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={48} /></div>;
};

export default OlympiadPage;
