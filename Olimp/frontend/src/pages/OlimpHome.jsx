import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Users, ChevronRight, Search, BookOpen, User, Coins } from 'lucide-react';
import apiService from '../services/apiService';
import ProfileSection from '../components/ProfileSection';
import HeroSection from '../components/HeroSection';
import CountdownTimer from '../components/CountdownTimer';
import ThemeToggle from '../components/ThemeToggle';
import { SkeletonGrid } from '../components/Skeleton';

const statusColors = {
    draft: 'bg-gray-100 text-gray-600',
    upcoming: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    finished: 'bg-purple-100 text-purple-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-600',
};

const statusLabels = {
    draft: 'Tayyorlanmoqda',
    upcoming: 'Tez kunda',
    active: 'Faol',
    finished: 'Tugallangan',
    completed: 'Tugallangan',
    cancelled: 'Bekor qilingan',
};

const difficultyColors = {
    easy: 'text-green-600',
    medium: 'text-yellow-600',
    hard: 'text-red-600',
};

export default function OlimpHome() {
    const [olympiads, setOlympiads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showProfile, setShowProfile] = useState(false);

    useEffect(() => {
        loadOlympiads();
    }, [filter]);

    const loadOlympiads = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filter !== 'all') params.status = filter;
            const data = await apiService.get('/olympiad', params);
            const list = data.data?.olympiads || data.data || data.olympiads || [];
            setOlympiads(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filtered = olympiads.filter(o =>
        o.title?.toLowerCase().includes(search.toLowerCase()) ||
        o.subject?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 transition-colors duration-300">
            {/* Profile Modal */}
            <ProfileSection isOpen={showProfile} onClose={() => setShowProfile(false)} />

            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-50 border-b border-indigo-500/10 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-white dark:to-indigo-200">Olimp</h1>
                            <p className="text-xs text-indigo-600/70 dark:text-indigo-400">alif24 • Platform</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <ThemeToggle />
                        <button
                            onClick={() => setShowProfile(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 hover:bg-yellow-500/20 transition-all font-medium text-sm shadow-md"
                        >
                            <Coins className="w-4 h-4" />
                            <span className="hidden sm:inline">Profil & Coinlar</span>
                        </button>
                        <a
                            href="https://alif24.uz"
                            className="text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-white transition-colors ml-2"
                        >
                            ← Qaytish
                        </a>
                    </div>
                </div>
            </header>

            {/* AI-driven Hero Section */}
            <HeroSection onStart={() => document.getElementById('olympiads-section')?.scrollIntoView({ behavior: 'smooth' })} />

            {/* Content Section wrapper */}
            <div id="olympiads-section" className="pt-8">

                {/* Reading Competition Card */}
                <div className="max-w-7xl mx-auto px-4 mb-8" id="reading-section">
                    <Link to="/reading" className="block relative overflow-hidden bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border border-emerald-500/20 rounded-3xl p-8 hover:from-emerald-800/50 hover:to-teal-800/50 transition-all group shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all" />
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shrink-0">
                                <BookOpen className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white">O'qish Musobaqasi</h3>
                                <p className="text-emerald-400/70 text-sm">Haftalik hikoyalar o'qish, savollar va reyting</p>
                            </div>
                            <ChevronRight className="w-6 h-6 text-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </Link>
                </div>

                {/* Filters & Search */}
                <div className="max-w-7xl mx-auto px-4 mb-8">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                            <input
                                type="text"
                                placeholder="Kasb, fan yoki olimpiada nomini yozing..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 border border-indigo-100 dark:border-white/10 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-indigo-300/50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {[
                                ['all', 'Barchasi'],
                                ['active', 'Faollari 🔥'],
                                ['completed', 'Yopilgan'],
                            ].map(([value, label]) => (
                                <button
                                    key={value}
                                    onClick={() => setFilter(value)}
                                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${filter === value
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                        : 'bg-white dark:bg-white/10 border border-indigo-100 dark:border-transparent text-slate-600 dark:text-indigo-300 hover:bg-slate-50 dark:hover:bg-white/20'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-7xl mx-auto px-4 pb-20">
                    {loading ? (
                        <SkeletonGrid count={4} />
                    ) : error ? (
                        <div className="text-center py-20">
                            <p className="text-red-400 mb-4">❌ {error}</p>
                            <button
                                onClick={loadOlympiads}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Qayta urinish
                            </button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-transparent rounded-3xl border border-indigo-50 dark:border-transparent">
                            <div className="text-5xl mb-4">🏅</div>
                            <p className="text-slate-600 dark:text-indigo-300 text-lg font-medium">Hozircha olimpiadalar yo'q</p>
                            <p className="text-slate-400 dark:text-indigo-500 text-sm mt-2">Tez kunda yangi olimpiadalar e'lon qilinadi</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((olympiad, i) => (
                                <motion.div
                                    key={olympiad.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Link
                                        to={`/olympiad/${olympiad.id}`}
                                        className="block bg-white dark:bg-white/5 backdrop-blur-sm border border-indigo-50 dark:border-white/10 rounded-2xl p-6 hover:shadow-xl dark:hover:shadow-none hover:border-indigo-200 dark:hover:bg-white/10 dark:hover:border-indigo-500/30 transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[olympiad.status] || statusColors.draft}`}>
                                                {statusLabels[olympiad.status] || olympiad.status}
                                            </span>
                                            <ChevronRight className="w-5 h-5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>

                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 line-clamp-2">
                                            {olympiad.title}
                                        </h3>

                                        <p className="text-sm text-slate-500 dark:text-indigo-400 mb-4 font-medium">
                                            📚 {olympiad.subject}
                                            {olympiad.difficulty && (
                                                <span className={`ml-2 ${difficultyColors[olympiad.difficulty] || ''}`}>
                                                    • {olympiad.difficulty === 'easy' ? 'Oson' : olympiad.difficulty === 'medium' ? "O'rta" : 'Qiyin'}
                                                </span>
                                            )}
                                        </p>

                                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-indigo-500">
                                            <span className="flex items-center gap-1 bg-slate-50 dark:bg-transparent px-2 py-1 rounded-md">
                                                <Calendar className="w-3 h-3" />
                                                {olympiad.start_date ? new Date(olympiad.start_date).toLocaleDateString('uz') : '—'}
                                            </span>
                                            <span className="flex items-center gap-1 bg-slate-50 dark:bg-transparent px-2 py-1 rounded-md">
                                                <Users className="w-3 h-3" />
                                                {olympiad.max_participants || '∞'} max
                                            </span>
                                        </div>

                                        {olympiad.status === 'active' && olympiad.end_date && (
                                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
                                                <span className="text-slate-500 dark:text-indigo-300 text-[10px] uppercase tracking-wider font-bold">Faol Musobaqa — Vaqt qoldi:</span>
                                                <CountdownTimer targetDate={olympiad.end_date} />
                                            </div>
                                        )}
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
