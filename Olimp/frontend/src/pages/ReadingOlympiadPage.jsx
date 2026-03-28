import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Calendar, Users, Clock, Trophy, CheckCircle, AlertCircle,
    Medal, BookOpen
} from 'lucide-react';
import apiService from '../services/apiService';

// ─── Helper ────────────────────────────────────────────────────────────────────
const fmtSec = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ReadingOlympiadPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [olympiad, setOlympiad] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [registered, setRegistered] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [regError, setRegError] = useState(null);
    const [lbLoading, setLbLoading] = useState(false);

    // ─── Load data ──────────────────────────────────────────────────────────────
    useEffect(() => {
        apiService.get('/auth/me').then(data => {
            const user = data.data || data;
            if (user?.id) {
                setCurrentUserId(user.id);
                localStorage.setItem('userId', user.id);
                loadAll(user.id);
            } else {
                loadAll(null);
            }
        }).catch(() => {
            loadAll(localStorage.getItem('userId'));
        });
    }, [id]);

    const loadAll = async (userId) => {
        try {
            setLoading(true);
            const studentId = userId || localStorage.getItem('userId');
            const url = studentId ? `/olympiad/${id}?student_id=${studentId}` : `/olympiad/${id}`;
            const data = await apiService.get(url);
            const oData = data.data || data;
            setOlympiad(oData);

            if (oData.my_participation) {
                setRegistered(true);
            }

            loadLeaderboard();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadLeaderboard = useCallback(async () => {
        try {
            setLbLoading(true);
            const data = await apiService.get(`/olympiad/${id}/reading-leaderboard`);
            const lb = data.data?.leaderboard || [];
            setLeaderboard(Array.isArray(lb) ? lb : []);
        } catch { }
        finally { setLbLoading(false); }
    }, [id]);

    // ─── WebSocket ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        const apiUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api/v1`;
        const wsBase = apiUrl.replace(/^http/, 'ws');
        const ws = new WebSocket(`${wsBase}/olympiads/${id}/ws/leaderboard`);
        ws.onmessage = () => loadLeaderboard();
        return () => ws.close();
    }, [id, loadLeaderboard]);

    // ─── Registration ───────────────────────────────────────────────────────────
    const handleRegister = async () => {
        const studentId = currentUserId || localStorage.getItem('userId');
        if (!studentId) {
            setRegError("Iltimos, avval tizimga kiring. alif24.uz ga o'ting.");
            return;
        }
        try {
            setRegistering(true);
            setRegError(null);
            await apiService.post(`/olympiad/${id}/register`, { student_id: studentId });
            setRegistered(true);
        } catch (err) {
            setRegError(err.message);
        } finally {
            setRegistering(false);
        }
    };

    // ─── Navigate to ErtaklarPage ───────────────────────────────────────────────
    const goToReading = () => {
        navigate(`/olympiad/${id}/content/ertaklar?from=reading`);
    };

    // ─── Render ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error && !olympiad) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">❌ {error}</p>
                    <Link to="/" className="text-indigo-400 hover:text-white">← Bosh sahifaga qaytish</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-md bg-white/5 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-indigo-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Orqaga
                    </Link>
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-400" />
                        <span className="text-white/60 text-sm">O'qish olimpiadasi</span>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* Olympiad Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{olympiad?.title}</h1>
                    {olympiad?.description && <p className="text-indigo-300 mb-5">{olympiad.description}</p>}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <MiniCard icon={<Calendar className="w-4 h-4" />} label="Boshlanish" value={olympiad?.start_time ? new Date(olympiad.start_time).toLocaleDateString('uz') : '—'} />
                        <MiniCard icon={<Clock className="w-4 h-4" />} label="Tugash" value={olympiad?.end_time ? new Date(olympiad.end_time).toLocaleDateString('uz') : '—'} />
                        <MiniCard icon={<Users className="w-4 h-4" />} label="Ishtirokchilar" value={`${olympiad?.participant_count || 0} nafar`} />
                        <MiniCard icon={<Trophy className="w-4 h-4" />} label="Fan" value={olympiad?.subject || '—'} />
                    </div>

                    {/* Registration / Start reading */}
                    {!registered ? (
                        <div>
                            <button onClick={handleRegister} disabled={registering || !['active', 'upcoming'].includes(olympiad?.status)}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-purple-600/30">
                                {registering ? 'Yuklanmoqda...' : "Ro'yxatdan o'tish"}
                            </button>
                            {regError && <p className="text-red-400 text-sm mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {regError}</p>}
                        </div>
                    ) : (
                        <div className="text-center">
                            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                            <p className="text-green-400 font-medium mb-4">Ro'yxatdan o'tdingiz!</p>
                            <button onClick={goToReading}
                                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
                                📖 O'qishni boshlash
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* Leaderboard */}
                <LeaderboardTable
                    leaderboard={leaderboard}
                    loading={lbLoading}
                    currentUserId={currentUserId}
                    olympiadTitle={olympiad?.title}
                />
            </div>
        </div>
    );
}


// ─── Leaderboard Table Component ───────────────────────────────────────────────
function LeaderboardTable({ leaderboard, loading, currentUserId }) {
    if (loading) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="text-xl font-bold text-white">Reyting jadvali</h3>
                </div>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-xl font-bold text-white">Reyting jadvali</h3>
                <span className="text-white/40 text-sm ml-auto">{leaderboard.length} ishtirokchi</span>
            </div>

            {leaderboard.length === 0 ? (
                <p className="text-center py-8 text-indigo-400">Hali ishtirokchilar yo'q</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-white/40 text-xs uppercase tracking-wide border-b border-white/10">
                                <th className="text-left py-3 px-2">#</th>
                                <th className="text-left py-3 px-2">Ism</th>
                                <th className="text-center py-3 px-2">Ball (jami)</th>
                                <th className="text-center py-3 px-2 hidden sm:table-cell">Tezlik</th>
                                <th className="text-center py-3 px-2 hidden sm:table-cell">O'qilgan</th>
                                <th className="text-center py-3 px-2 hidden md:table-cell">Vaqt</th>
                                <th className="text-center py-3 px-2">Coin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((entry) => {
                                const userId = localStorage.getItem('userId');
                                const isMe = entry.student_id === userId || entry.student_id === currentUserId;
                                const medalColors = { 1: 'text-yellow-400', 2: 'text-gray-300', 3: 'text-amber-600' };
                                const rowBg = isMe ? 'bg-indigo-600/20 border-l-2 border-l-indigo-500' : entry.rank <= 3 ? 'bg-white/5' : '';

                                return (
                                    <tr key={entry.student_id || entry.rank}
                                        className={`${rowBg} border-b border-white/5 hover:bg-white/5 transition-colors`}>
                                        <td className="py-3 px-2">
                                            {entry.rank <= 3 ? (
                                                <span className={`font-bold ${medalColors[entry.rank]}`}>
                                                    <Medal className="w-5 h-5 inline" />
                                                </span>
                                            ) : (
                                                <span className="text-white/50 font-mono">{entry.rank}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className={`font-medium ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                                                {entry.student_name}{isMe ? ' (Siz)' : ''}
                                            </span>
                                            {entry.status === 'registered' && (
                                                <span className="ml-2 text-[10px] text-white/30 bg-white/10 px-1.5 py-0.5 rounded">kutilmoqda</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <span className={`font-bold text-base ${entry.total_score >= 80 ? 'text-emerald-400' : entry.total_score >= 50 ? 'text-amber-400' : entry.total_score > 0 ? 'text-red-400' : 'text-white/30'}`}>
                                                {entry.total_score || '—'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-center hidden sm:table-cell">
                                            <span className="text-white/70">{entry.reading_wpm || '—'}</span>
                                            {entry.reading_wpm > 0 && <span className="text-white/30 text-[10px] ml-0.5">s/d</span>}
                                        </td>
                                        <td className="py-3 px-2 text-center hidden sm:table-cell">
                                            <span className="text-blue-400">{entry.reading_percent > 0 ? `${entry.reading_percent}%` : '—'}</span>
                                        </td>
                                        <td className="py-3 px-2 text-center hidden md:table-cell">
                                            <span className="text-purple-400 font-mono text-xs">
                                                {entry.reading_time_seconds > 0 ? fmtSec(entry.reading_time_seconds) : '—'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <span className="text-yellow-400 font-bold">{entry.reading_coins || 0}</span>
                                            <span className="text-[10px] ml-0.5">🪙</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </motion.div>
    );
}


// ─── Mini Card ─────────────────────────────────────────────────────────────────
function MiniCard({ icon, label, value }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-indigo-500 text-xs mb-1">{icon} {label}</div>
            <p className="text-white font-medium text-sm">{value}</p>
        </div>
    );
}
