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
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
            {/* Stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-[5%] left-[10%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '2s' }} />
              <div className="absolute top-[15%] left-[30%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
              <div className="absolute top-[20%] left-[70%] w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '3.5s' }} />
              <div className="absolute top-[50%] left-[85%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.8s', animationDuration: '2.8s' }} />
              <div className="absolute top-[70%] left-[20%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.2s', animationDuration: '3.2s' }} />
              <div className="absolute top-[85%] left-[55%] w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s', animationDuration: '2.4s' }} />
            </div>
            {/* Header */}
            <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-white/5">
                <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-xl flex items-center justify-center">
                            <BookMarked className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Ertaklar</h1>
                            <p className="text-xs text-white/50">lessions.alif24.uz • Ertaklar</p>
                        </div>
                    </div>
                    <Link to="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" />
                        Darsliklar
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 text-center">
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
                    className="text-white/50 text-lg max-w-xl mx-auto"
                >
                    Qiziqarli hikoyalar va ertaklar to'plami
                </motion.p>
            </section>

            {/* Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-4 pb-16">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin mx-auto" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400 mb-4">❌ {error}</p>
                        <button onClick={loadErtaklar} className="px-6 py-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-lg hover:scale-105 transition-transform">
                            Qayta urinish
                        </button>
                    </div>
                ) : ertaklar.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">📖</div>
                        <p className="text-white/50 text-lg">Hozircha ertaklar yo'q</p>
                        <p className="text-white/30 text-sm mt-2">Tez kunda yangi ertaklar qo'shiladi</p>
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
                                            <div className="flex items-center gap-3 text-xs text-white/50">
                                                <span>{ertak.language === 'uz' ? "O'zbek" : ertak.language === 'ru' ? 'Русский' : 'English'}</span>
                                                <span>Yosh: {ertak.age_group || '6-8'}</span>
                                                {ertak.has_audio && (
                                                    <span className="flex items-center gap-1 text-[#4b30fb]">
                                                        <Volume2 className="w-3 h-3" /> Audio
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-white/40 text-xl">{selected === ertak.id ? '▲' : '▼'}</span>
                                    </div>

                                    {selected === ertak.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-4 pt-4 border-t border-white/10"
                                        >
                                            <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{ertak.content}</p>
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
