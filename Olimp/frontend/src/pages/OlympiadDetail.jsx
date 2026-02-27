import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Users, Clock, Trophy, CheckCircle, AlertCircle, Medal, BarChart3 } from 'lucide-react';
import apiService from '../services/apiService';

export default function OlympiadDetail() {
    const { id } = useParams();
    const [olympiad, setOlympiad] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [registering, setRegistering] = useState(false);
    const [registered, setRegistered] = useState(false);
    const [regError, setRegError] = useState(null);

    // Quiz state
    const [quizStarted, setQuizStarted] = useState(false);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [lbLoading, setLbLoading] = useState(false);

    useEffect(() => {
        loadOlympiad();
    }, [id]);

    const loadOlympiad = async () => {
        try {
            setLoading(true);
            const data = await apiService.get(`/olympiad/${id}`);
            setOlympiad(data.data || data.olympiad || data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        try {
            setRegistering(true);
            setRegError(null);
            const studentId = localStorage.getItem('userId') || `guest_${Date.now()}`;
            await apiService.post(`/olympiad/${id}/register`, { student_id: studentId });
            setRegistered(true);

            // Load questions after registration
            const qData = await apiService.get(`/olympiad/${id}/questions`);
            const qs = qData.data?.questions || qData.data || qData.questions || [];
            setQuestions(Array.isArray(qs) ? qs : []);
        } catch (err) {
            setRegError(err.message);
        } finally {
            setRegistering(false);
        }
    };

    const handleAnswer = (questionId, answerIndex) => {
        if (submitted) return;
        setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    };

    const handleSubmit = async () => {
        try {
            const answerList = Object.entries(answers).map(([qId, aIdx]) => ({
                question_id: qId,
                answer_index: aIdx,
            }));
            const studentId = localStorage.getItem('userId') || `guest_${Date.now()}`;
            const data = await apiService.post(`/olympiad/${id}/submit?student_id=${studentId}`, answerList);
            setResult(data.data || data.result || data);
            setSubmitted(true);
            loadLeaderboard();
        } catch (err) {
            setError(err.message);
        }
    };

    const loadLeaderboard = async () => {
        try {
            setLbLoading(true);
            const data = await apiService.get(`/olympiad/${id}/leaderboard`);
            const lb = data.data?.leaderboard || data.leaderboard || [];
            setLeaderboard(Array.isArray(lb) ? lb : []);
        } catch (err) {
            console.error('Leaderboard error:', err);
        } finally {
            setLbLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">❌ {error}</p>
                    <Link to="/" className="text-indigo-400 hover:text-white">← Bosh sahifaga qaytish</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-md bg-white/5">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <Link to="/" className="inline-flex items-center gap-2 text-indigo-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Barcha olimpiadalar
                    </Link>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Olympiad Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8"
                >
                    <h1 className="text-3xl font-bold text-white mb-4">{olympiad?.title}</h1>

                    {olympiad?.description && (
                        <p className="text-indigo-300 mb-6">{olympiad.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <InfoCard icon={<Calendar className="w-4 h-4" />} label="Boshlanish" value={olympiad?.start_time ? new Date(olympiad.start_time).toLocaleDateString('uz') : '—'} />
                        <InfoCard icon={<Clock className="w-4 h-4" />} label="Tugash" value={olympiad?.end_time ? new Date(olympiad.end_time).toLocaleDateString('uz') : '—'} />
                        <InfoCard icon={<Users className="w-4 h-4" />} label="Maksimum" value={`${olympiad?.max_participants || '∞'} nafar`} />
                        <InfoCard icon={<Trophy className="w-4 h-4" />} label="Fan" value={olympiad?.subject || '—'} />
                    </div>

                    {/* Registration */}
                    {!registered && !quizStarted && (
                        <div>
                            <button
                                onClick={handleRegister}
                                disabled={registering || !['active', 'upcoming'].includes(olympiad?.status)}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30"
                            >
                                {registering ? 'Yuklanmoqda...' : ['active', 'upcoming'].includes(olympiad?.status) ? "Ro'yxatdan o'tish va boshlash" : 'Olimpiada faol emas'}
                            </button>
                            {regError && <p className="text-red-400 text-sm mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {regError}</p>}
                        </div>
                    )}

                    {/* Success registration */}
                    {registered && !quizStarted && (
                        <div className="text-center">
                            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                            <p className="text-green-400 font-medium mb-4">Ro'yxatdan muvaffaqiyatli o'tdingiz!</p>
                            <button
                                onClick={() => setQuizStarted(true)}
                                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all"
                            >
                                Testni boshlash ({questions.length} savol)
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Quiz */}
                {quizStarted && !submitted && (
                    <div className="space-y-6">
                        {questions.map((q, qi) => (
                            <motion.div
                                key={q.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: qi * 0.05 }}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                            >
                                <p className="text-white font-medium mb-4">
                                    <span className="text-indigo-400 mr-2">{qi + 1}.</span>
                                    {q.question_text}
                                    <span className="text-indigo-500 text-sm ml-2">({q.points} ball)</span>
                                </p>

                                <div className="grid gap-2">
                                    {(q.options || []).map((opt, oi) => (
                                        <button
                                            key={oi}
                                            onClick={() => handleAnswer(q.id, oi)}
                                            className={`w-full text-left p-4 rounded-xl border transition-all ${answers[q.id] === oi
                                                ? 'bg-indigo-600/30 border-indigo-500 text-white'
                                                : 'bg-white/5 border-white/10 text-indigo-300 hover:bg-white/10'
                                                }`}
                                        >
                                            <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        ))}

                        <button
                            onClick={handleSubmit}
                            disabled={Object.keys(answers).length === 0}
                            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 shadow-lg"
                        >
                            Javoblarni yuborish ({Object.keys(answers).length}/{questions.length})
                        </button>
                    </div>
                )}

                {/* Results */}
                {submitted && result && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center"
                    >
                        <div className="text-6xl mb-4">🏆</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Natija</h2>
                        <p className="text-4xl font-bold text-indigo-400 mb-2">
                            {result.total_score || result.score || 0} / {result.total_points || questions.reduce((s, q) => s + (q.points || 10), 0)}
                        </p>
                        <p className="text-indigo-500 mb-6">
                            To'g'ri javoblar: {result.correct_answers || 0} / {result.total_questions || questions.length}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => setShowLeaderboard(!showLeaderboard)}
                                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-bold"
                            >
                                <BarChart3 className="w-5 h-5" /> {showLeaderboard ? 'Reytingni yashirish' : 'Reytingni ko\'rish'}
                            </button>
                            <Link
                                to="/"
                                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                            >
                                Bosh sahifaga qaytish
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* Leaderboard */}
                {showLeaderboard && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mt-6"
                    >
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-400" /> Reyting jadvali
                        </h3>
                        {lbLoading ? (
                            <div className="text-center py-8">
                                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <p className="text-center py-8 text-indigo-400">Hali natijalar yo'q</p>
                        ) : (
                            <div className="space-y-2">
                                {leaderboard.map((entry) => {
                                    const isMe = entry.student_id === localStorage.getItem('studentProfileId');
                                    const medalColor = entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : 'text-indigo-500';
                                    return (
                                        <div
                                            key={entry.student_id || `rank-${entry.rank}`}
                                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isMe ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 flex items-center justify-center font-bold text-sm ${medalColor}`}>
                                                {entry.rank <= 3 ? <Medal className="w-5 h-5" /> : `#${entry.rank}`}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-medium truncate ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                                                    {entry.student_name}{isMe ? ' (Siz)' : ''}
                                                </p>
                                                <p className="text-xs text-indigo-500">
                                                    {entry.correct_answers}/{entry.total_questions} to'g'ri
                                                    {entry.time_taken_seconds > 0 && ` | ${Math.floor(entry.time_taken_seconds / 60)}:${String(entry.time_taken_seconds % 60).padStart(2, '0')}`}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-indigo-400">{entry.score}</p>
                                                <p className="text-xs text-indigo-600">/{entry.total_points} ball</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function InfoCard({ icon, label, value }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-indigo-500 text-xs mb-1">
                {icon} {label}
            </div>
            <p className="text-white font-medium text-sm">{value}</p>
        </div>
    );
}
