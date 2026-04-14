import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, Trophy, CheckCircle, TrendingUp, ArrowLeft, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiService from '../services/apiService';
import { SkeletonGrid } from '../components/Skeleton';

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const adminKey = localStorage.getItem('adminKey') || '';
            const res = await apiService.get('/olympiad/admin/analytics/overview', {}, {
                headers: { 'X-Admin-Key': adminKey }
            });
            setData(res.data);
        } catch (err) {
            setError(err.message || 'Analytics yuklanmadi');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6">
                <div className="max-w-6xl mx-auto">
                    <SkeletonGrid count={6} className="grid-cols-2 md:grid-cols-3" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">❌ {error}</p>
                    <Link to="/" className="text-indigo-400 hover:text-white">← Qaytish</Link>
                </div>
            </div>
        );
    }

    const stats = [
        { icon: <Users className="w-6 h-6" />, label: "O'quvchilar", value: data?.total_students || 0, color: 'from-blue-500 to-cyan-500' },
        { icon: <Trophy className="w-6 h-6" />, label: 'Olimpiadalar', value: data?.total_olympiads || 0, color: 'from-amber-500 to-orange-500' },
        { icon: <TrendingUp className="w-6 h-6" />, label: 'Faol olimpiadalar', value: data?.active_olympiads || 0, color: 'from-emerald-500 to-green-500' },
        { icon: <CheckCircle className="w-6 h-6" />, label: 'Ishtiroklar', value: data?.total_participations || 0, color: 'from-purple-500 to-violet-500' },
        { icon: <BarChart3 className="w-6 h-6" />, label: "O'rtacha ball", value: data?.average_score || 0, color: 'from-rose-500 to-pink-500' },
        { icon: <CheckCircle className="w-6 h-6" />, label: "Yakunlash %", value: `${data?.completion_rate || 0}%`, color: 'from-indigo-500 to-blue-500' },
    ];

    const scoreDist = data?.score_distribution || {};
    const maxDist = Math.max(...Object.values(scoreDist).map(v => Number(v) || 0), 1);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-md bg-white/5">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="text-indigo-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h1 className="text-white font-bold text-lg">Admin Analytics</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/admin/build"
                            className="px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Olympiada
                        </Link>
                        <Link
                            to="/admin/reading"
                            className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> O'qish musob.
                        </Link>
                        <button
                            onClick={loadAnalytics}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Yangilash
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors"
                        >
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-white mb-3 shadow-lg`}>
                                {stat.icon}
                            </div>
                            <p className="text-white/50 text-xs uppercase tracking-wide">{stat.label}</p>
                            <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Score Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6"
                >
                    <h2 className="text-white font-bold mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-400" />
                        Ball taqsimoti
                    </h2>
                    <div className="flex items-end gap-4 h-40">
                        {Object.entries(scoreDist).map(([range, count], idx) => {
                            const heightPct = Math.max((count / maxDist) * 100, 5);
                            const colors = ['from-red-500 to-red-400', 'from-amber-500 to-amber-400', 'from-blue-500 to-blue-400', 'from-emerald-500 to-emerald-400'];
                            return (
                                <div key={range} className="flex-1 flex flex-col items-center gap-2">
                                    <span className="text-white text-sm font-bold">{count}</span>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${heightPct}%` }}
                                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                                        className={`w-full rounded-t-xl bg-gradient-to-t ${colors[idx % colors.length]} shadow-lg`}
                                    />
                                    <span className="text-white/50 text-xs">{range}</span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Top Olympiads */}
                {data?.top_olympiads?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-6"
                    >
                        <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-400" />
                            Eng mashhur olimpiadalar
                        </h2>
                        <div className="space-y-2">
                            {data.top_olympiads.map((o, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-500/20 text-gray-300' : i === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-white/10 text-indigo-400'}`}>
                                            {i + 1}
                                        </span>
                                        <span className="text-white font-medium text-sm">{o.title}</span>
                                    </div>
                                    <span className="text-indigo-400 text-sm font-bold">{o.participants} ishtirokchi</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
