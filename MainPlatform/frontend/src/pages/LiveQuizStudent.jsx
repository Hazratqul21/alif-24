import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import quizService from '../services/quizService';
import {
  Trophy, CheckCircle, X, Clock, Zap, Medal, ArrowLeft, Loader2, Star, Coins, Users
} from 'lucide-react';

const AVATARS = ['🎮', '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🐯', '🦄', '🐸', '🐵', '🦉'];
const OPTION_COLORS = ['#E53935', '#1E88E5', '#43A047', '#FB8C00'];

const LiveQuizStudent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Phases: join, waiting, playing, answered, results
  const [phase, setPhase] = useState('join');
  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayName] = useState(user?.first_name || '');
  const [avatar, setAvatar] = useState('🎮');
  const [quizId, setQuizId] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Question state
  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);

  // Results
  const [results, setResults] = useState(null);

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const startTimeRef = useRef(null);

  // ====== JOIN ======
  const handleJoin = async () => {
    if (!joinCode || joinCode.length !== 6) {
      setError('6 xonali kodni kiriting');
      return;
    }
    if (!displayName.trim()) {
      setError('Ismingizni kiriting');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await quizService.joinQuiz(joinCode, displayName.trim(), avatar);
      setQuizTitle(res.quiz_title || 'Live Quiz');
      setQuizId(res.quiz_id);
      setPhase('waiting');
    } catch (err) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup polls
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ====== FETCH QUESTION ======
  const fetchQuestion = useCallback(async (qId) => {
    try {
      const res = await quizService.getStudentQuestion(qId);
      if (res.status === 'active' && !res.already_answered) {
        setQuestion(res);
        setTimeLeft(res.time_limit || 30);
        setSelectedAnswer(null);
        setAnswerResult(null);
        setPhase('playing');
        startTimeRef.current = Date.now();
        // Start timer
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (res.status === 'finished') {
        setPhase('results');
        fetchResults(qId);
      } else if (res.status === 'waiting') {
        // Still waiting
      } else if (res.already_answered) {
        // Already answered, wait for next
        setPhase('answered');
      }
    } catch (err) {
      console.error('Fetch question error:', err);
    }
  }, []);

  const fetchResults = async (qId) => {
    try {
      const res = await quizService.getStudentResults(qId);
      setResults(res);
    } catch (err) {
      console.error('Fetch results error:', err);
    }
  };

  // Poll for question changes (when waiting or after answering)
  useEffect(() => {
    if (!quizId) return;
    if (phase === 'waiting' || phase === 'answered') {
      const interval = setInterval(() => fetchQuestion(quizId), 2000);
      return () => clearInterval(interval);
    }
  }, [quizId, phase, fetchQuestion]);

  // ====== SUBMIT ANSWER ======
  const handleAnswer = async (optionIndex) => {
    if (selectedAnswer !== null || !question) return;
    setSelectedAnswer(optionIndex);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeMs = Date.now() - (startTimeRef.current || Date.now());

    try {
      const res = await quizService.submitAnswer(quizId, question.question_id, optionIndex, timeMs);
      setAnswerResult(res);
      setTotalScore(res.total_score || 0);
      setStreak(res.current_streak || 0);
      setTimeout(() => setPhase('answered'), 2000);
    } catch (err) {
      setError(err.message || 'Javob yuborishda xatolik');
      setTimeout(() => setPhase('answered'), 1500);
    }
  };

  // ====== RENDER: JOIN SCREEN ======
  if (phase === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <button onClick={() => navigate(-1)} className="mb-4 p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎯</div>
            <h1 className="text-2xl font-bold text-gray-800">Live Quiz</h1>
            <p className="text-gray-500 text-sm mt-1">6 xonali kodni kiriting</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder="000000"
              maxLength={6}
              className="w-full text-center text-4xl font-mono font-bold tracking-[0.5em] border-2 border-gray-200 rounded-2xl p-4 focus:border-indigo-500 focus:outline-none"
            />

            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value.slice(0, 50))}
              placeholder="Ismingiz"
              className="w-full text-center text-lg border-2 border-gray-200 rounded-2xl p-3 focus:border-indigo-500 focus:outline-none"
            />

            <div className="flex flex-wrap justify-center gap-2">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-2xl p-2 rounded-xl transition-all ${avatar === a ? 'bg-indigo-100 scale-125 ring-2 ring-indigo-500' : 'hover:bg-gray-100'}`}
                >
                  {a}
                </button>
              ))}
            </div>

            {error && <p className="text-red-500 text-center text-sm font-medium">{error}</p>}

            <button
              onClick={handleJoin}
              disabled={loading || joinCode.length !== 6}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
              {loading ? 'Ulanmoqda...' : "Qo'shilish"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== RENDER: WAITING SCREEN ======
  if (phase === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-bounce">{avatar}</div>
          <h2 className="text-3xl font-bold mb-2">{displayName}</h2>
          <p className="text-white/80 text-lg mb-6">{quizTitle}</p>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 max-w-sm mx-auto">
            <Loader2 className="animate-spin mx-auto mb-3" size={40} />
            <p className="text-lg font-medium">O'qituvchini kuting...</p>
            <p className="text-white/60 text-sm mt-2">Quiz tez orada boshlanadi</p>
          </div>
        </div>
      </div>
    );
  }

  // ====== RENDER: PLAYING (QUESTION) ======
  if (phase === 'playing' && question) {
    const timePercent = question.time_limit ? (timeLeft / question.time_limit) * 100 : 100;
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Top bar */}
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-white">
            <span className="text-lg font-bold">{question.question_number}/{question.total_questions}</span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-lg ${timeLeft <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-800'}`}>
            <Clock size={18} />
            {timeLeft}s
          </div>
          <div className="flex items-center gap-2 text-white">
            <Star size={18} className="text-yellow-400" />
            <span className="font-bold">{totalScore}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : 'bg-green-400'}`}
              style={{ width: `${timePercent}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-2xl w-full text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">{question.text}</h2>
            {question.image && <img src={question.image} alt="" className="mt-4 max-h-48 mx-auto rounded-xl" />}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
            {question.options?.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = answerResult && answerResult.is_correct && isSelected;
              const isWrong = answerResult && !answerResult.is_correct && isSelected;

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={selectedAnswer !== null || timeLeft === 0}
                  className={`p-4 md:p-6 rounded-2xl text-white font-bold text-lg shadow-lg transition-all active:scale-95 ${isCorrect ? 'ring-4 ring-green-300 scale-105' : ''} ${isWrong ? 'ring-4 ring-red-300 opacity-60' : ''} ${selectedAnswer !== null && !isSelected ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: OPTION_COLORS[idx % 4] }}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Answer feedback */}
          {answerResult && (
            <div className={`mt-6 p-4 rounded-2xl text-center text-white font-bold text-lg ${answerResult.is_correct ? 'bg-green-500' : 'bg-red-500'}`}>
              {answerResult.is_correct ? (
                <span className="flex items-center justify-center gap-2"><CheckCircle size={24} /> To'g'ri! +{answerResult.points_earned} ball</span>
              ) : (
                <span className="flex items-center justify-center gap-2"><X size={24} /> Noto'g'ri</span>
              )}
            </div>
          )}
        </div>

        {/* Streak bar */}
        {streak > 1 && (
          <div className="p-4 text-center">
            <span className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold inline-flex items-center gap-2">
              🔥 {streak} ta ketma-ket to'g'ri!
            </span>
          </div>
        )}
      </div>
    );
  }

  // ====== RENDER: ANSWERED (waiting for next question) ======
  if (phase === 'answered') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold mb-2">Keyingi savolni kuting...</h2>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="bg-white/10 rounded-xl px-4 py-2">
              <span className="text-yellow-400 font-bold">{totalScore}</span>
              <span className="text-white/60 text-sm ml-1">ball</span>
            </div>
            {streak > 0 && (
              <div className="bg-white/10 rounded-xl px-4 py-2">
                <span className="text-orange-400 font-bold">🔥 {streak}</span>
                <span className="text-white/60 text-sm ml-1">seriya</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ====== RENDER: RESULTS ======
  if (phase === 'results') {
    const rankEmoji = results?.rank === 1 ? '🥇' : results?.rank === 2 ? '🥈' : results?.rank === 3 ? '🥉' : '🏅';
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">{rankEmoji}</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">{results?.quiz_title || 'Quiz tugadi!'}</h1>

          {results?.rank && (
            <div className="text-5xl font-black text-indigo-600 my-4">#{results.rank}</div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-indigo-50 p-4 rounded-2xl">
              <div className="text-2xl font-bold text-indigo-600">{results?.total_score || totalScore}</div>
              <div className="text-xs text-gray-500 mt-1">Jami ball</div>
            </div>
            <div className="bg-green-50 p-4 rounded-2xl">
              <div className="text-2xl font-bold text-green-600">{results?.correct_count || 0}</div>
              <div className="text-xs text-gray-500 mt-1">To'g'ri javob</div>
            </div>
            <div className="bg-red-50 p-4 rounded-2xl">
              <div className="text-2xl font-bold text-red-600">{results?.wrong_count || 0}</div>
              <div className="text-xs text-gray-500 mt-1">Noto'g'ri</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-2xl">
              <div className="text-2xl font-bold text-orange-600">🔥 {results?.best_streak || 0}</div>
              <div className="text-xs text-gray-500 mt-1">Eng yaxshi seriya</div>
            </div>
          </div>

          {results?.coins_earned > 0 && (
            <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              <Coins size={20} className="text-yellow-600" />
              <span className="font-bold text-yellow-800">+{results.coins_earned} coin ishlandi!</span>
            </div>
          )}

          <button
            onClick={() => navigate('/student-dashboard')}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg"
          >
            Dashboardga qaytish
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin" size={48} />
    </div>
  );
};

export default LiveQuizStudent;
