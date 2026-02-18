import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, GraduationCap, Search, BookMarked } from 'lucide-react';
import apiService from '../services/apiService';

const difficultyBadge = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
};

const difficultyLabel = {
    easy: 'Oson',
    medium: "O'rta",
    hard: 'Qiyin',
};

export default function LessionsHome() {
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');

    useEffect(() => {
        loadLessons();
    }, [subjectFilter]);

    const loadLessons = async () => {
        try {
            setLoading(true);
            const params = {};
            if (subjectFilter) params.subject = subjectFilter;
            const data = await apiService.get('/lessons', params);
            setLessons(data.data || data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filtered = lessons.filter(l =>
        l.title?.toLowerCase().includes(search.toLowerCase()) ||
        l.subject?.toLowerCase().includes(search.toLowerCase())
    );

    const subjects = [...new Set(lessons.map(l => l.subject).filter(Boolean))];

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-md bg-white/5">
                <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Darsliklar</h1>
                            <p className="text-xs text-emerald-300">alif24 • Ta'lim materiallari</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            to="/ertaklar"
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-emerald-300 hover:bg-emerald-600/30 transition-colors text-sm"
                        >
                            <BookMarked className="w-4 h-4" />
                            Ertaklar
                        </Link>
                        <a href="https://alif24.uz" className="text-sm text-emerald-300 hover:text-white transition-colors">
                            ← Bosh sahifa
                        </a>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="max-w-6xl mx-auto px-4 py-12 text-center">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-bold text-white mb-4"
                >
                    📚 Darsliklar
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-emerald-300 text-lg max-w-xl mx-auto"
                >
                    Interaktiv darsliklar bilan o'rganing
                </motion.p>
            </section>

            {/* Filters */}
            <div className="max-w-6xl mx-auto px-4 mb-8">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                        <input
                            type="text"
                            placeholder="Darslik qidirish..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    {subjects.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setSubjectFilter('')}
                                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${!subjectFilter ? 'bg-emerald-600 text-white' : 'bg-white/10 text-emerald-300 hover:bg-white/20'
                                    }`}
                            >
                                Hammasi
                            </button>
                            {subjects.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSubjectFilter(s)}
                                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${subjectFilter === s ? 'bg-emerald-600 text-white' : 'bg-white/10 text-emerald-300 hover:bg-white/20'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Lessons Grid */}
            <div className="max-w-6xl mx-auto px-4 pb-16">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                        <p className="text-emerald-400 mt-4">Yuklanmoqda...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400 mb-4">❌ {error}</p>
                        <button onClick={loadLessons} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                            Qayta urinish
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">📖</div>
                        <p className="text-emerald-300 text-lg">Hozircha darsliklar yo'q</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((lesson, i) => (
                            <motion.div
                                key={lesson.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Link
                                    to={`/lesson/${lesson.id}`}
                                    className="block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-emerald-500/30 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyBadge[lesson.difficulty] || difficultyBadge.medium}`}>
                                            {difficultyLabel[lesson.difficulty] || lesson.difficulty}
                                        </span>
                                        {lesson.language && (
                                            <span className="text-xs text-emerald-500 uppercase">{lesson.language}</span>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{lesson.title}</h3>

                                    {lesson.description && (
                                        <p className="text-sm text-emerald-400/70 mb-4 line-clamp-2">{lesson.description}</p>
                                    )}

                                    <div className="flex items-center gap-4 text-xs text-emerald-500">
                                        <span className="flex items-center gap-1">
                                            <GraduationCap className="w-3 h-3" />
                                            {lesson.subject || '—'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {lesson.duration_minutes || 30} min
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
