import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Users, ChevronRight, Search, Filter, BookOpen } from 'lucide-react';
import apiService from '../services/apiService';

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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-md bg-white/5">
                <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Olimp</h1>
                            <p className="text-xs text-indigo-300">alif24 • Olimpiadalar</p>
                        </div>
                    </div>
                    <a
                        href="https://alif24.uz"
                        className="text-sm text-indigo-300 hover:text-white transition-colors"
                    >
                        ← Bosh sahifaga
                    </a>
                </div>
            </header>

            {/* Hero */}
            <section className="max-w-6xl mx-auto px-4 py-12 text-center">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-bold text-white mb-4"
                >
                    🏆 Olimpiadalar
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-indigo-300 text-lg max-w-xl mx-auto"
                >
                    O'z bilimingizni sinab ko'ring va eng yaxshilar qatoriga qo'shiling
                </motion.p>
            </section>

            {/* Reading Competition Card */}
            <div className="max-w-6xl mx-auto px-4 mb-8">
                <Link to="/reading" className="block bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 hover:from-emerald-500/20 hover:to-teal-500/20 transition-all group">
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
            <div className="max-w-6xl mx-auto px-4 mb-8">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                        <input
                            type="text"
                            placeholder="Qidirish..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-indigo-400 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                    <div className="flex gap-2">
                        {[
                            ['all', 'Hammasi'],
                            ['active', 'Faol'],
                            ['completed', 'Tugallangan'],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setFilter(value)}
                                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${filter === value
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                        : 'bg-white/10 text-indigo-300 hover:bg-white/20'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 pb-16">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                        <p className="text-indigo-400 mt-4">Yuklanmoqda...</p>
                    </div>
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
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">🏅</div>
                        <p className="text-indigo-300 text-lg">Hozircha olimpiadalar yo'q</p>
                        <p className="text-indigo-500 text-sm mt-2">Tez kunda yangi olimpiadalar e'lon qilinadi</p>
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
                                    className="block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-indigo-500/30 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[olympiad.status] || statusColors.draft}`}>
                                            {statusLabels[olympiad.status] || olympiad.status}
                                        </span>
                                        <ChevronRight className="w-5 h-5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                                        {olympiad.title}
                                    </h3>

                                    <p className="text-sm text-indigo-400 mb-4">
                                        📚 {olympiad.subject}
                                        {olympiad.difficulty && (
                                            <span className={`ml-2 ${difficultyColors[olympiad.difficulty] || ''}`}>
                                                • {olympiad.difficulty === 'easy' ? 'Oson' : olympiad.difficulty === 'medium' ? "O'rta" : 'Qiyin'}
                                            </span>
                                        )}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-indigo-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {olympiad.start_date ? new Date(olympiad.start_date).toLocaleDateString('uz') : '—'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {olympiad.max_participants || '∞'} max
                                        </span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
