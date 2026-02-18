import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookMarked, Volume2 } from 'lucide-react';
import apiService from '../services/apiService';

export default function ErtaklarPage() {
    const [ertaklar, setErtaklar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        loadErtaklar();
    }, []);

    const loadErtaklar = async () => {
        try {
            setLoading(true);
            const data = await apiService.get('/ertaklar');
            setErtaklar(data.data || data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-md bg-white/5">
                <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                            <BookMarked className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Ertaklar</h1>
                            <p className="text-xs text-amber-300">alif24 • Bolalar uchun hikoyalar</p>
                        </div>
                    </div>
                    <Link to="/" className="flex items-center gap-2 text-amber-300 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" />
                        Darsliklar
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="max-w-6xl mx-auto px-4 py-12 text-center">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-bold text-white mb-4"
                >
                    ✨ Ertaklar
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-amber-300 text-lg max-w-xl mx-auto"
                >
                    Qiziqarli hikoyalar va ertaklar to'plami
                </motion.p>
            </section>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 pb-16">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400 mb-4">❌ {error}</p>
                        <button onClick={loadErtaklar} className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                            Qayta urinish
                        </button>
                    </div>
                ) : ertaklar.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">📖</div>
                        <p className="text-amber-300 text-lg">Hozircha ertaklar yo'q</p>
                        <p className="text-amber-500 text-sm mt-2">Tez kunda yangi ertaklar qo'shiladi</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ertaklar.map((ertak, i) => (
                            <motion.div
                                key={ertak.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <button
                                    onClick={() => setSelected(selected === ertak.id ? null : ertak.id)}
                                    className="w-full text-left bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">{ertak.title}</h3>
                                            <div className="flex items-center gap-3 text-xs text-amber-500">
                                                <span>{ertak.language === 'uz' ? "O'zbek" : ertak.language === 'ru' ? 'Русский' : 'English'}</span>
                                                <span>Yosh: {ertak.age_group || '6-8'}</span>
                                                {ertak.has_audio && (
                                                    <span className="flex items-center gap-1 text-amber-400">
                                                        <Volume2 className="w-3 h-3" /> Audio
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-amber-500 text-xl">{selected === ertak.id ? '▲' : '▼'}</span>
                                    </div>

                                    {selected === ertak.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-4 pt-4 border-t border-white/10"
                                        >
                                            <p className="text-amber-100 leading-relaxed whitespace-pre-wrap">{ertak.content}</p>
                                        </motion.div>
                                    )}
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
