import { useState, useEffect } from 'react';
import { Trophy, MapPin, Clock, ChevronRight, Lock, Unlock, Star, Users } from 'lucide-react';
import apiService from '../services/apiService';

/**
 * StudentOlympiadDashboard — O'quvchining ko'p bosqichli olimpiada sahifasi
 * - HeroSection: ism, maktab, viloyat
 * - StageJourney: 1→2→3→4 progress
 * - CurrentStageCard: joriy bosqich
 * - RivalsTable: scope bo'yicha raqiblar
 */
export default function StudentOlympiadDashboard({ olympiadId, studentId }) {
    const [data, setData] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeStageId, setActiveStageId] = useState(null);

    useEffect(() => {
        loadDashboard();
    }, [olympiadId, studentId]);

    const loadDashboard = async () => {
        try {
            const res = await apiService.get(`/olympiad/multi-stage/${olympiadId}/dashboard?student_id=${studentId}`);
            if (res.success) {
                setData(res.data);
                // Auto-select current stage for leaderboard
                const current = res.data.stages?.find(s => s.is_accessible && s.is_active);
                if (current) {
                    setActiveStageId(current.id);
                    loadLeaderboard(current.id);
                }
            }
        } catch (err) {
            console.error("Dashboard yuklashda xatolik:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadLeaderboard = async (stageId) => {
        try {
            const res = await apiService.get(
                `/olympiad/multi-stage/${olympiadId}/stages/${stageId}/leaderboard?student_id=${studentId}`
            );
            if (res.success) {
                setLeaderboard(res.data.leaderboard || []);
            }
        } catch (err) {
            console.error("Leaderboard xatolik:", err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20 text-white/50">
                <p>Ma'lumotlar topilmadi</p>
            </div>
        );
    }

    const { student, olympiad, stages } = data;

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-2xl p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{student.name}</h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                            <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" /> {student.region}, {student.district}
                            </span>
                            <span>🏫 {student.school_number}-maktab</span>
                            <span>📚 {student.class_number}-sinf</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-white/50">Joriy bosqich</p>
                        <p className="text-3xl font-bold text-indigo-400">{student.current_stage}</p>
                    </div>
                </div>
            </div>

            {/* Stage Journey */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" /> Bosqichlar yo'li
                </h2>
                <div className="flex items-center gap-2">
                    {stages.map((s, idx) => (
                        <div key={s.id} className="flex items-center flex-1">
                            <button
                                onClick={() => {
                                    if (s.is_accessible) {
                                        setActiveStageId(s.id);
                                        loadLeaderboard(s.id);
                                    }
                                }}
                                className={`relative flex-1 p-4 rounded-xl border-2 transition-all ${
                                    s.is_accessible && s.is_active
                                        ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-400/30'
                                        : s.my_result?.is_passed
                                        ? 'bg-emerald-600/20 border-emerald-500'
                                        : s.is_accessible
                                        ? 'bg-white/5 border-white/20 hover:border-white/40 cursor-pointer'
                                        : 'bg-white/5 border-white/10 opacity-50'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {s.is_accessible ? (
                                        <Unlock className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <Lock className="w-4 h-4 text-white/30" />
                                    )}
                                    <span className="text-sm font-bold text-white">{s.stage_number}-bosqich</span>
                                </div>
                                <p className="text-xs text-white/50">{s.title}</p>
                                <p className="text-xs text-white/30 mt-1">
                                    {s.scope_type === 'school' && '🏫 Maktab'}
                                    {s.scope_type === 'district' && '🏘️ Tuman'}
                                    {s.scope_type === 'region' && '🗺️ Viloyat'}
                                    {s.scope_type === 'republic' && '🇺🇿 Respublika'}
                                </p>

                                {s.my_result && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xs font-bold text-amber-400">⭐ {s.my_result.score} ball</span>
                                        <span className="text-xs text-white/40">#{s.my_result.rank}</span>
                                        {s.my_result.is_passed && (
                                            <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">O'tdi ✓</span>
                                        )}
                                    </div>
                                )}
                            </button>
                            {idx < stages.length - 1 && (
                                <ChevronRight className={`w-5 h-5 mx-1 flex-shrink-0 ${
                                    s.my_result?.is_passed ? 'text-emerald-400' : 'text-white/20'
                                }`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Current Stage Details */}
            {stages.filter(s => s.is_accessible).map(s => (
                <div key={s.id} className={`bg-white/5 border rounded-2xl p-6 ${
                    s.is_active ? 'border-indigo-500/50' : 'border-white/10'
                }`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm">{s.stage_number}</span>
                            {s.title}
                            {s.is_active && (
                                <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full animate-pulse">FAOL</span>
                            )}
                        </h3>
                        <div className="text-right text-xs text-white/40">
                            <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.start_time ? new Date(s.start_time).toLocaleString('uz') : '—'}</div>
                            <div>↓ {s.end_time ? new Date(s.end_time).toLocaleString('uz') : '—'}</div>
                        </div>
                    </div>

                    {s.requirements && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                            <p className="text-sm text-amber-300 font-medium">📋 Shartlar:</p>
                            <p className="text-sm text-white/70 mt-1">{s.requirements}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-3 text-sm text-white/50">
                        <span>📝 Kontent: {s.content_type === 'test' ? 'Test' : s.content_type === 'reading' ? "O'qish" : 'Aralash'}</span>
                        <span>🎯 Qamrov: {s.scope_type === 'school' ? 'Maktab' : s.scope_type === 'district' ? 'Tuman' : s.scope_type === 'region' ? 'Viloyat' : 'Respublika'}</span>
                    </div>

                    {s.is_active && !s.my_result && (
                        <button className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                            🚀 Boshlash
                        </button>
                    )}
                </div>
            ))}

            {/* Rivals Table */}
            {leaderboard.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-400" /> Raqiblar jadvali
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-white/40 border-b border-white/10">
                                    <th className="text-left py-2 px-3">#</th>
                                    <th className="text-left py-2 px-3">Ism</th>
                                    <th className="text-left py-2 px-3">Maktab</th>
                                    <th className="text-right py-2 px-3">Ball</th>
                                    <th className="text-right py-2 px-3">Holat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map(r => (
                                    <tr key={r.rank} className={`border-b border-white/5 ${r.is_me ? 'bg-indigo-600/20' : ''}`}>
                                        <td className="py-3 px-3">
                                            {r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank - 1] : <span className="text-white/40">{r.rank}</span>}
                                        </td>
                                        <td className="py-3 px-3 text-white font-medium">
                                            {r.name} {r.is_me && <span className="text-xs text-indigo-400">(Siz)</span>}
                                        </td>
                                        <td className="py-3 px-3 text-white/50">{r.school_number}-maktab</td>
                                        <td className="py-3 px-3 text-right font-bold text-amber-400">{r.score}</td>
                                        <td className="py-3 px-3 text-right">
                                            {r.is_passed ? (
                                                <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full">O'tdi</span>
                                            ) : (
                                                <span className="text-xs text-white/30">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
