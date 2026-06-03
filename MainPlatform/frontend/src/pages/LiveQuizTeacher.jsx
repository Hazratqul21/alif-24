import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import quizService from '../services/quizService';
import {
  Plus, Trash2, Play, Users, Trophy, ArrowLeft, Loader2, CheckCircle, Copy,
  Clock, BarChart3, ChevronRight, X, Target, Save, Pause, PlayCircle, History, List, FileText
} from 'lucide-react';

const OPTION_COLORS = ['#E53935', '#1E88E5', '#43A047', '#FB8C00'];

const LiveQuizTeacher = () => {
  const navigate = useNavigate();

  // Phases: templates, create, add_questions, lobby, live, question_result, leaderboard, finished, history
  const [phase, setPhase] = useState('templates');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateHistory, setTemplateHistory] = useState([]);

  // Quiz creation
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [quizId, setQuizId] = useState(null); // Actually templateId or sessionId depending on phase
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
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const timerRef = useRef(null);
  const livePollRef = useRef(null);
  const autoNextTimeoutRef = useRef(null);

  // Finished Session
  const [sessionName, setSessionName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Bulk add
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Load Templates on Mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await quizService.getTemplates();
      setTemplates(res.templates || []);
      setPhase('templates');
    } catch (err) {
      setError(err.message || 'Shablonlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const cleanupIntervals = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (livePollRef.current) clearInterval(livePollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
  };

  useEffect(() => {
    return cleanupIntervals;
  }, []);

  // ====== TEMPLATES ======
  const handleStartFromTemplate = async (templateId) => {
    setLoading(true);
    try {
      const session = await quizService.startSession(templateId);
      setQuizId(session.quiz_id);
      
      const lobby = await quizService.openLobby(session.quiz_id);
      setJoinCode(lobby.join_code);
      setPhase('lobby');
      startLobbyPoll(session.quiz_id);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleViewHistory = async (template) => {
    setLoading(true);
    try {
      const res = await quizService.getTemplateHistory(template.id);
      setTemplateHistory(res.history || []);
      setSelectedTemplate(template);
      setPhase('history');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  // ====== CREATE QUIZ ======
  const handleCreate = async () => {
    if (!title.trim()) { setError('Quiz nomini kiriting'); return; }
    setLoading(true); setError('');
    try {
      const res = await quizService.createQuiz(title.trim(), description.trim(), timePerQuestion);
      setQuizId(res.quiz_id); // This is a template ID
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

  const handleParseBulkText = () => {
    if (!bulkText.trim()) return;
    setError('');
    const questionBlocks = bulkText.split(/(?=\n\d+\.)|(?=^\d+\.)/gm);
    const newQuestions = [];
    
    for (let block of questionBlocks) {
      if (!block.trim()) continue;
      const lines = block.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 3) continue;
      
      let qText = lines[0].replace(/^\d+\.\s*/, '');
      let options = ['', '', '', ''];
      let correct = -1;
      
      let optIndex = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const optMatch = line.match(/^([A-D])[).]\s*(.+)/i);
        if (optMatch && optIndex < 4) {
          options[optIndex] = optMatch[2].trim();
          optIndex++;
        }
        
        const ansMatch = line.match(/^Javob:\s*([A-D])/i);
        if (ansMatch) {
          correct = ['A', 'B', 'C', 'D'].indexOf(ansMatch[1].toUpperCase());
        }
      }
      
      if (qText && optIndex >= 2 && correct !== -1) {
        newQuestions.push({ text: qText, options: options, correct: correct, points: 100 });
      }
    }
    
    if (newQuestions.length > 0) {
      if (questions.length === 1 && !questions[0].text) {
        setQuestions(newQuestions);
      } else {
        setQuestions([...questions, ...newQuestions]);
      }
      setShowBulkModal(false);
      setBulkText('');
    } else {
      setError("Matndan savollarni aniqlab bo'lmadi. Format to'g'riligini tekshiring.");
    }
  };

  const handleSaveQuestions = async () => {
    const invalid = questions.find(q => !q.text.trim() || q.options.some(o => !o.trim()));
    if (invalid) { setError('Barcha savollar va variantlarni to\'ldiring'); return; }
    const noCorrect = questions.find(q => q.correct < 0);
    if (noCorrect) { setError('Har bir savolda to\'g\'ri javobni belgilang'); return; }
    
    setLoading(true); setError('');
    try {
      await quizService.addQuestions(quizId, questions);
      // Start a session from this new template immediately
      const session = await quizService.startSession(quizId);
      setQuizId(session.quiz_id); // Switch quizId to session ID
      
      const lobby = await quizService.openLobby(session.quiz_id);
      setJoinCode(lobby.join_code);
      setPhase('lobby');
      startLobbyPoll(session.quiz_id);
    } catch (err) {
      setError(err.message || 'Xatolik');
    } finally { setLoading(false); }
  };

  // ====== LOBBY ======
  const startLobbyPoll = (sessionId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await quizService.getLobbyStatus(sessionId);
        setParticipants(res.participants || []);
        setParticipantCount(res.participants_count || 0);
      } catch (e) { console.error(e); }
    }, 2000);
  };

  const handleStartQuiz = async () => {
    if (participantCount === 0) { setError('Kamida 1 ta qatnashchi kerak'); return; }
    cleanupIntervals();
    setLoading(true); setError('');
    try {
      await quizService.startQuiz(quizId);
      const q = await quizService.getCurrentQuestion(quizId);
      startLiveQuestion(q);
    } catch (err) {
      setError(err.message || 'Xatolik');
      setLoading(false);
    } 
  };

  // ====== LIVE ======
  const startLiveQuestion = (q) => {
    setCurrentQuestion(q);
    setQuestionResults(null);
    setPhase('live');
    setTimeLeft(q.time_limit || 30);
    setIsPaused(false);
    setLoading(false);

    // Start teacher timer
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

    // Poll for answers
    if (livePollRef.current) clearInterval(livePollRef.current);
    livePollRef.current = setInterval(async () => {
      try {
        const res = await quizService.getQuestionResults(quizId, q.question_id);
        // If everyone answered or time's up, auto show results
        const isTimeUp = (timeLeft <= 0); // Need to rely on local state or careful logic. 
        // Actually, we can check inside the interval using a ref or state updater, but fetching here is fine.
        if (res.total_answers >= participantCount) {
           clearInterval(livePollRef.current);
           clearInterval(timerRef.current);
           handleShowResults(q.question_id, res);
        }
      } catch (e) { console.error(e); }
    }, 1000);
  };

  // Check for time up effect
  useEffect(() => {
    if (phase === 'live' && timeLeft === 0 && currentQuestion) {
      if (livePollRef.current) clearInterval(livePollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      // Auto show results when time is up
      quizService.getQuestionResults(quizId, currentQuestion.question_id)
        .then(res => handleShowResults(currentQuestion.question_id, res))
        .catch(console.error);
    }
  }, [timeLeft, phase, currentQuestion, quizId]);

  const handleShowResults = (qId, preFetchedResults = null) => {
    const perform = async () => {
      try {
        const res = preFetchedResults || await quizService.getQuestionResults(quizId, qId);
        setQuestionResults(res);
        setPhase('question_result');
        
        // Auto next after 5 seconds IF not paused
        if (!isPaused) {
          autoNextTimeoutRef.current = setTimeout(() => {
            handleNextQuestion();
          }, 5000);
        }
      } catch (err) { setError(err.message); }
    };
    perform();
  };

  useEffect(() => {
    if (phase === 'question_result') {
      if (isPaused) {
        if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
      } else {
        // If unpaused on results screen, schedule next
        if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
        autoNextTimeoutRef.current = setTimeout(() => {
          handleNextQuestion();
        }, 5000);
      }
    }
  }, [isPaused, phase]);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleNextQuestion = async () => {
    cleanupIntervals();
    setLoading(true); setError('');
    try {
      const res = await quizService.nextQuestion(quizId);
      if (res.finished) {
        const lb = await quizService.getLeaderboard(quizId);
        setLeaderboard(lb);
        setPhase('finished');
      } else {
        startLiveQuestion(res);
      }
    } catch (err) {
      setError(err.message || 'Xatolik');
    } finally { setLoading(false); }
  };

  const handleEndQuiz = async () => {
    cleanupIntervals();
    try {
      const res = await quizService.endQuiz(quizId);
      setLeaderboard(res.leaderboard || []);
      setPhase('finished');
    } catch (err) { setError(err.message); }
  };

  // ====== FINISHED ======
  const handleSaveSession = async () => {
    if (!sessionName.trim()) { setError('Nom kiriting'); return; }
    try {
      await quizService.saveSession(quizId, sessionName);
      setShowSaveModal(false);
      fetchTemplates(); // Return to templates list
    } catch (err) { setError(err.message); }
  };

  const handleTerminate = async () => {
    try {
      await quizService.deleteSession(quizId);
      fetchTemplates();
    } catch (err) { setError(err.message); }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(joinCode);
  };

  // ====== RENDER: TEMPLATES ======
  if (phase === 'templates') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 text-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Mening Live Quizlarim</h1>
            <button onClick={() => setPhase('create')} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700">
              <Plus size={20} /> Yangi Quiz Yaratish
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>
          ) : templates.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
              Hali quizlar yaratilmagan. Birinchi quizingizni yarating!
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map(t => (
                <div key={t.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                  <h3 className="text-xl font-bold mb-2">{t.title}</h3>
                  <p className="text-gray-500 mb-6 line-clamp-2">{t.description || "Tavsif yo'q"}</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleStartFromTemplate(t.id)} className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-green-600">
                      <Play size={18} /> Boshlash
                    </button>
                    <button onClick={() => handleViewHistory(t)} className="flex-1 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-indigo-100">
                      <History size={18} /> Natijalar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====== RENDER: HISTORY ======
  if (phase === 'history') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 text-gray-900">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setPhase('templates')} className="mb-4 p-2 hover:bg-gray-200 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-6">{selectedTemplate?.title} - O'tkazilgan o'yinlar tarixi</h1>
            {templateHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Bu quiz hali hech qaysi sinfda o'tkazilmagan yoki saqlanmagan.</p>
            ) : (
              <div className="space-y-4">
                {templateHistory.map(session => (
                  <div key={session.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{session.session_name}</h3>
                        <p className="text-sm text-gray-500">{new Date(session.ended_at).toLocaleString()}</p>
                      </div>
                      <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                        <Users size={16} /> {session.participants_count} o'quvchi
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="text-sm font-bold text-gray-600 mb-2">Kuchli uchlik:</h4>
                      {session.leaderboard.length > 0 ? (
                        <div className="space-y-1">
                          {session.leaderboard.map((p, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span>{i + 1}. {p.display_name}</span>
                              <span className="font-bold">{p.total_score} ball</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Hech kim qatnashmadi</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ====== RENDER: CREATE ======
  if (phase === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 text-gray-900">
        <div className="max-w-xl mx-auto">
          <button onClick={() => setPhase('templates')} className="mb-4 p-2 hover:bg-gray-200 rounded-full">
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
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Masalan: 3-G sinf Matematika"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ixtiyoriy"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Har bir savol uchun vaqt (soniya)</label>
                <select value={timePerQuestion} onChange={e => setTimePerQuestion(Number(e.target.value))}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-white">
                  <option value={15}>15 soniya</option>
                  <option value={30}>30 soniya</option>
                  <option value={60}>1 daqiqa</option>
                  <option value={120}>2 daqiqa</option>
                </select>
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <ChevronRight />}
                Davom etish
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
      <div className="min-h-screen bg-gray-50 p-4 text-gray-900 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Savollar qo'shish</h1>
            <div className="flex gap-2">
              <button onClick={() => setShowBulkModal(true)} className="bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-50">
                <FileText size={20} /> Matndan qo'shish
              </button>
              <button onClick={addQuestion} className="bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-200">
                <Plus size={20} /> Yangi savol
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-white rounded-2xl shadow-sm p-6 relative">
                <button onClick={() => removeQuestion(qIdx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500">
                  <Trash2 size={20} />
                </button>
                <h3 className="font-bold text-gray-500 mb-4">{qIdx + 1}-savol</h3>

                <input
                  value={q.text} onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                  placeholder="Savol matni..."
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none mb-4 text-lg font-medium text-gray-900 bg-white"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuestion(qIdx, 'correct', oIdx)}
                        className={`p-3 rounded-xl transition-all ${q.correct === oIdx ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                      >
                        <CheckCircle size={24} />
                      </button>
                      <input
                        value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                        placeholder={`${oIdx + 1}-variant`}
                        className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none text-gray-900 bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="max-w-3xl mx-auto flex justify-between items-center">
              {error && <p className="text-red-500 font-medium">{error}</p>}
              <button
                onClick={handleSaveQuestions}
                disabled={loading}
                className="ml-auto px-8 py-3 bg-green-500 text-white font-bold rounded-xl shadow-lg hover:bg-green-600 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                Saqlash va Boshlash
              </button>
            </div>
          </div>
          
          {/* Bulk Add Modal */}
          {showBulkModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-2xl font-bold">Matndan savollarni ajratish</h3>
                   <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full"><X size={24} /></button>
                 </div>
                 <p className="text-gray-500 mb-4 text-sm">
                   Savollarni quyidagi formatda tashlang:<br/>
                   <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 mt-2 inline-block">
                     1. Savol matni?<br/>
                     A) Variant 1<br/>
                     B) Variant 2<br/>
                     C) Variant 3<br/>
                     D) Variant 4<br/>
                     Javob: C) Variant 3
                   </span>
                 </p>
                 
                 <textarea 
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder="Matnni shu yerga tashlang..."
                    className="w-full flex-1 min-h-[200px] p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none mb-4 text-sm font-mono bg-white text-gray-900 resize-y"
                 />
                 
                 {error && <p className="text-red-500 mb-4 font-medium">{error}</p>}
                 
                 <div className="flex gap-3 mt-auto">
                   <button onClick={() => setShowBulkModal(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200">Bekor qilish</button>
                   <button onClick={handleParseBulkText} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-md">Ajratish va Qo'shish</button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====== RENDER: LOBBY ======
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 text-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">
            <h2 className="text-gray-500 font-bold mb-2">O'quvchilar qo'shilishi uchun kod:</h2>
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="text-6xl md:text-8xl font-black tracking-widest text-indigo-600 font-mono bg-indigo-50 px-8 py-4 rounded-3xl border-4 border-indigo-100">
                {joinCode}
              </div>
              <button onClick={copyCode} className="p-4 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-600 transition-colors">
                <Copy size={32} />
              </button>
            </div>
            <p className="text-xl">Qo'shilish sayti: <strong className="text-indigo-600">alif24.uz/join-quiz</strong></p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Users className="text-indigo-600" />
              Qatnashchilar: {participantCount}
            </h3>
            <button
              onClick={handleStartQuiz}
              disabled={loading || participantCount === 0}
              className="px-8 py-4 bg-green-500 text-white font-bold text-xl rounded-2xl shadow-lg hover:bg-green-600 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Play size={24} />}
              O'yinni boshlash
            </button>
          </div>

          {error && <p className="text-red-500 text-left mb-4">{error}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {participants.map((p, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm text-center animate-in zoom-in duration-300">
                <div className="text-4xl mb-2">{p.avatar_emoji}</div>
                <div className="font-bold truncate text-gray-900">{p.display_name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ====== RENDER: LIVE (QUESTION) ======
  if (phase === 'live' && currentQuestion) {
    const timePercent = currentQuestion.time_limit ? (timeLeft / currentQuestion.time_limit) * 100 : 100;
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
        <div className="p-4 bg-white shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-gray-500 font-bold">Savol {currentQuestion.question_number}/{currentQuestion.total_questions}</span>
            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full text-indigo-700 font-bold">
              <Users size={18} /> {participantCount}
            </div>
          </div>
          
          {/* TEACHER TIMER & PAUSE */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-xl ${timeLeft <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-800'}`}>
              <Clock size={24} /> {timeLeft}s
            </div>
          </div>

          <button onClick={handleEndQuiz} className="text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
            O'yinni to'xtatish
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 w-full">
          <div 
            className={`h-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${timePercent}%` }}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-5xl mx-auto w-full">
          <div className="bg-white rounded-3xl p-8 shadow-xl w-full text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-800 leading-tight">
              {currentQuestion.text}
            </h2>
            {currentQuestion.image && <img src={currentQuestion.image} alt="Savol" className="mt-8 max-h-64 mx-auto rounded-2xl shadow-md" />}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            {currentQuestion.options?.map((opt, idx) => (
              <div key={idx} className="p-6 rounded-2xl text-white font-bold text-2xl shadow-md flex items-center" style={{ backgroundColor: OPTION_COLORS[idx % 4] }}>
                <span className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0">{['A','B','C','D'][idx]}</span>
                {opt}
              </div>
            ))}
          </div>
          
          <div className="mt-8 text-center text-gray-500">
             O'quvchilar javob berishi kutilmoqda... Agar barchasi javob bersa avtomat keyingi bosqichga o'tiladi.
          </div>
        </div>
      </div>
    );
  }

  // ====== RENDER: QUESTION RESULTS ======
  if (phase === 'question_result' && questionResults) {
    const totalAns = questionResults.total_answers || 1; // avoid div/0
    
    return (
      <div className="min-h-screen bg-gray-50 p-4 text-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Savol natijalari</h2>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={togglePause} 
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${isPaused ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                {isPaused ? <PlayCircle size={20} /> : <Pause size={20} />}
                {isPaused ? "Davom etish" : "Pauza"}
              </button>
              
              <button
                onClick={handleNextQuestion}
                disabled={loading}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Keyingi"} <ChevronRight />
              </button>
            </div>
          </div>
          
          {isPaused && (
             <div className="bg-orange-100 border border-orange-300 text-orange-800 px-4 py-3 rounded-xl mb-8 flex items-center gap-2 font-bold">
                <Pause /> Avtomatik davom etish to'xtatildi. Tushuntirib bo'lgach, 'Davom etish' yoki 'Keyingi' tugmasini bosing.
             </div>
          )}

          <div className="bg-white rounded-3xl p-8 shadow-xl mb-12 text-center">
            <h3 className="text-2xl font-bold text-gray-800">{questionResults.question_text}</h3>
          </div>

          <div className="flex items-end justify-center gap-4 h-64 mb-8">
            {questionResults.options.map((opt, idx) => {
              const count = questionResults.option_counts[idx] || 0;
              const percent = (count / totalAns) * 100;
              const isCorrect = idx === questionResults.correct_answer;

              return (
                <div key={idx} className="flex flex-col items-center flex-1 max-w-[150px]">
                  <div className="text-2xl font-bold mb-2">{count}</div>
                  <div 
                    className={`w-full rounded-t-xl transition-all duration-1000 relative overflow-hidden ${isCorrect ? 'bg-green-500' : 'bg-gray-300'}`}
                    style={{ height: `${Math.max(percent, 5)}%`, minHeight: '40px', backgroundColor: isCorrect ? '#43A047' : OPTION_COLORS[idx % 4] }}
                  >
                    {!isCorrect && <div className="absolute inset-0 bg-white/40"></div>}
                    {isCorrect && <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white"><CheckCircle size={24} /></div>}
                  </div>
                  <div className="mt-4 p-3 bg-white w-full text-center rounded-xl shadow-sm text-sm font-bold truncate border-2" style={{ borderColor: isCorrect ? '#43A047' : 'transparent' }}>
                    {opt}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ====== RENDER: LEADERBOARD & FINISHED ======
  if (phase === 'leaderboard' || phase === 'finished') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 text-gray-900">
        <div className="max-w-3xl mx-auto">
          {phase === 'finished' && (
            <div className="text-center mb-8 animate-in slide-in-from-top fade-in duration-500">
              <div className="inline-flex items-center justify-center p-4 bg-yellow-100 rounded-full mb-4">
                <Trophy size={64} className="text-yellow-500" />
              </div>
              <h1 className="text-4xl font-black text-gray-800">Quiz Yakunlandi!</h1>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-gray-100">
            <div className="bg-indigo-600 p-6 text-white text-center">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                <BarChart3 /> Natijalar (Top 10)
              </h2>
            </div>
            <div className="p-2">
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-gray-500 font-medium">Hech qanday ma'lumot yo'q</div>
              ) : (
                leaderboard.slice(0, 10).map((p, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-4 mb-2 rounded-2xl ${idx === 0 ? 'bg-yellow-50 border border-yellow-200' : idx === 1 ? 'bg-gray-50 border border-gray-200' : idx === 2 ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {idx + 1}
                      </div>
                      <div className="text-3xl">{p.avatar_emoji}</div>
                      <div>
                        <div className="font-bold text-lg text-gray-800">{p.display_name}</div>
                        <div className="text-sm text-gray-500">{p.correct_count} ta to'g'ri</div>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-indigo-600">{p.total_score}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {phase === 'finished' && (
            <div className="flex gap-4 mb-12">
               <button onClick={() => setShowSaveModal(true)} className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-green-600 transition-all flex justify-center items-center gap-2">
                 <Save /> Saqlash
               </button>
               <button onClick={handleTerminate} className="flex-1 bg-gray-200 text-gray-800 py-4 rounded-2xl font-bold text-lg shadow-md hover:bg-gray-300 transition-all flex justify-center items-center gap-2">
                 <X /> Tugatish (Saqlamasdan)
               </button>
            </div>
          )}
        </div>
        
        {/* Save Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
               <h3 className="text-2xl font-bold mb-4">Natijani saqlash</h3>
               <p className="text-gray-500 mb-6">Ushbu sinf natijasini qanday nom bilan saqlamoqchisiz? (masalan: 3-G sinf)</p>
               
               <input 
                  autoFocus
                  value={sessionName}
                  onChange={e => setSessionName(e.target.value)}
                  placeholder="Sinf nomi..."
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none mb-6 text-lg font-medium bg-white text-gray-900"
               />
               
               {error && <p className="text-red-500 mb-4 font-medium">{error}</p>}
               
               <div className="flex gap-3">
                 <button onClick={() => setShowSaveModal(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200">Bekor qilish</button>
                 <button onClick={handleSaveSession} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-md">Saqlash</button>
               </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
    </div>
  );
};

export default LiveQuizTeacher;
