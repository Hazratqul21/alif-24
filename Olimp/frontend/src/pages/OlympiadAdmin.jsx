import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, CheckCircle, X, Phone } from 'lucide-react';
import apiService from '../services/apiService';

export default function OlympiadAdmin() {
    const { olympiadId } = useParams();
    const navigate = useNavigate();
    const [participants, setParticipants] = useState([]);
    const [olympiadTitle, setOlympiadTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedParticipant, setSelectedParticipant] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState(null);

    useEffect(() => {
        loadParticipants();
    }, [olympiadId]);

    const loadParticipants = async () => {
        try {
            setLoading(true);
            const data = await apiService.get(`/olympiad/${olympiadId}/participants`);
            setParticipants(data.data?.participants || []);
            setOlympiadTitle(data.data?.olympiad_title || '');
        } catch (err) {
            console.error('Load participants error:', err);
        } finally {
            setLoading(false);
        }
    };

    const openDetail = async (participant) => {
        setSelectedParticipant(participant);
        setDetailLoading(true);
        try {
            const data = await apiService.get(`/olympiad/${olympiadId}/participants/${participant.participant_id}`);
            setDetail(data.data);
        } catch (err) {
            console.error('Load detail error:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setSelectedParticipant(null);
        setDetail(null);
    };

    const fmtTime = (seconds) => {
        if (!seconds) return '—';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-md bg-white/5">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-indigo-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white">Ishtirokchilar</h1>
                        <p className="text-xs text-indigo-400">{olympiadTitle}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-indigo-400 text-sm">
                        <Users className="w-4 h-4" />
                        <span>{participants.length} ta</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                    </div>
                ) : participants.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">👥</div>
                        <p className="text-indigo-300">Hali ishtirokchilar yo'q</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs text-indigo-400 uppercase tracking-wider border-b border-white/10">
                                        <th className="pb-3 px-3">#</th>
                                        <th className="pb-3 px-3">Ism</th>
                                        <th className="pb-3 px-3">Telefon</th>
                                        <th className="pb-3 px-3">Holat</th>
                                        <th className="pb-3 px-3 text-center">Ball</th>
                                        <th className="pb-3 px-3 text-center">To'g'ri</th>
                                        <th className="pb-3 px-3 text-center">Noto'g'ri</th>
                                        <th className="pb-3 px-3 text-center">Vaqt</th>
                                        <th className="pb-3 px-3 text-center">Coin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.map((p, i) => (
                                        <tr
                                            key={p.participant_id}
                                            onClick={() => openDetail(p)}
                                            className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                                        >
                                            <td className="py-3 px-3 text-white/40 text-sm">{p.rank}</td>
                                            <td className="py-3 px-3">
                                                <p className="text-white font-medium text-sm">{p.student_name}</p>
                                            </td>
                                            <td className="py-3 px-3 text-white/50 text-sm">{p.phone || '—'}</td>
                                            <td className="py-3 px-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        p.status === 'registered' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-white/10 text-white/50'
                                                    }`}>
                                                    {p.status === 'completed' ? '✅' : p.status === 'registered' ? '📝' : p.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className={`font-bold text-sm ${p.score >= 80 ? 'text-emerald-400' : p.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                    {p.score || 0}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-center text-emerald-400 text-sm">{p.correct_answers || 0}</td>
                                            <td className="py-3 px-3 text-center text-red-400 text-sm">{p.wrong_answers || 0}</td>
                                            <td className="py-3 px-3 text-center text-white/50 text-sm">{fmtTime(p.time_spent_seconds)}</td>
                                            <td className="py-3 px-3 text-center text-yellow-400 font-bold text-sm">{p.coins_earned || 0} 🪙</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-3">
                            {participants.map((p) => (
                                <div
                                    key={p.participant_id}
                                    onClick={() => openDetail(p)}
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 active:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white/30 text-xs">#{p.rank}</span>
                                            <p className="text-white font-medium text-sm">{p.student_name}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {p.status === 'completed' ? '✅' : '📝'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-white/40">
                                        <span>🏆 {p.score || 0}</span>
                                        <span>✅ {p.correct_answers || 0}</span>
                                        <span>❌ {p.wrong_answers || 0}</span>
                                        <span className="text-yellow-400 ml-auto">{p.coins_earned || 0} 🪙</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedParticipant && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={closeDetail}
                    >
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6"
                        >
                            <button onClick={closeDetail} className="absolute top-4 right-4 text-white/40 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>

                            {detailLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                </div>
                            ) : detail ? (
                                <>
                                    {/* Student info */}
                                    <div className="mb-5">
                                        <h3 className="text-white font-bold text-xl">{detail.student_name}</h3>
                                        {detail.phone && (
                                            <p className="text-indigo-400 text-sm flex items-center gap-1 mt-1">
                                                <Phone className="w-3 h-3" /> {detail.phone}
                                            </p>
                                        )}
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-3 gap-2 mb-5">
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                            <p className={`text-xl font-black ${detail.score >= 80 ? 'text-emerald-400' : detail.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                {detail.score || 0}
                                            </p>
                                            <p className="text-white/40 text-[10px]">Ball</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                            <p className="text-xl font-black text-emerald-400">{detail.correct_answers || 0}/{(detail.correct_answers || 0) + (detail.wrong_answers || 0)}</p>
                                            <p className="text-white/40 text-[10px]">To'g'ri</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                            <p className="text-xl font-black text-purple-400">{fmtTime(detail.time_spent_seconds)}</p>
                                            <p className="text-white/40 text-[10px]">Vaqt</p>
                                        </div>
                                    </div>

                                    {/* Coin */}
                                    <div className="bg-gradient-to-r from-yellow-500/15 to-amber-500/10 border border-yellow-500/25 rounded-xl p-3 text-center mb-5">
                                        <p className="text-2xl font-black text-yellow-400">+{detail.coins_earned || 0} 🪙</p>
                                    </div>

                                    {/* Answer details */}
                                    {detail.answers && detail.answers.length > 0 && (
                                        <div>
                                            <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Savollar va javoblar</p>
                                            <div className="space-y-3">
                                                {detail.answers.map((a, i) => (
                                                    <div key={i} className={`rounded-xl p-3 border ${a.is_correct ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                                        <p className="text-white text-sm font-medium mb-2">
                                                            {i + 1}. {a.question_text}
                                                        </p>
                                                        {a.options && a.options.map((opt, j) => (
                                                            <div key={j} className={`text-xs px-3 py-1.5 rounded-lg mb-1 ${j === a.correct_answer && j === a.selected_answer ? 'bg-emerald-500/30 text-emerald-300 font-bold' :
                                                                    j === a.correct_answer ? 'bg-emerald-500/20 text-emerald-400' :
                                                                        j === a.selected_answer ? 'bg-red-500/20 text-red-400' :
                                                                            'text-white/40'
                                                                }`}>
                                                                {String.fromCharCode(65 + j)}) {opt}
                                                            </div>
                                                        ))}
                                                        <div className="flex items-center gap-2 mt-2 text-xs">
                                                            {a.is_correct ? (
                                                                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> To'g'ri</span>
                                                            ) : (
                                                                <span className="text-red-400 flex items-center gap-1"><X className="w-3 h-3" /> Noto'g'ri</span>
                                                            )}
                                                            <span className="text-white/30 ml-auto">+{a.points_earned || 0} ball</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-white/40 text-center py-8">Ma'lumot topilmadi</p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
