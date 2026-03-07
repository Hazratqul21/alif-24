import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, BookMarked, ArrowLeft, ChevronRight } from 'lucide-react';

export default function OlympiadContent() {
    const { olympiadId } = useParams();
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
            {/* Stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[
                    { top: '5%', left: '10%', sz: 'w-1 h-1', d: '0s', dur: '2s' },
                    { top: '15%', left: '30%', sz: 'w-1.5 h-1.5', d: '0.5s', dur: '3s' },
                    { top: '20%', left: '70%', sz: 'w-2 h-2', d: '1.5s', dur: '3.5s' },
                    { top: '50%', left: '85%', sz: 'w-1 h-1', d: '0.8s', dur: '2.8s' },
                    { top: '70%', left: '20%', sz: 'w-1.5 h-1.5', d: '1.2s', dur: '3.2s' },
                    { top: '85%', left: '55%', sz: 'w-2 h-2', d: '0.4s', dur: '2.4s' },
                ].map((s, i) => (
                    <div key={i} className={`absolute ${s.sz} bg-white rounded-full animate-pulse`} style={{ top: s.top, left: s.left, animationDelay: s.d, animationDuration: s.dur }} />
                ))}
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-white/5">
                <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Kontentlar</h1>
                            <p className="text-xs text-white/50">olimp.alif24.uz</p>
                        </div>
                    </div>
                    <Link to={`/olympiad/${olympiadId}`} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> Bosh sahifa
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="relative z-10 max-w-4xl mx-auto px-4 py-16 text-center">
                <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-bold text-white mb-4">
                    📚 Olimpiada Kontentlari
                </motion.h2>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="text-white/50 text-lg max-w-xl mx-auto">
                    Darsliklar va ertaklar — o'rganish va o'qish uchun
                </motion.p>
            </section>

            {/* Cards */}
            <div className="relative z-10 max-w-4xl mx-auto px-4 pb-20">
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Darsliklar */}
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <Link to={`/olympiad/${olympiadId}/content/lessons`}
                            className="block bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8 hover:border-blue-500/40 hover:bg-blue-500/15 transition-all group">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BookOpen className="w-8 h-8 text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">📚 Darsliklar</h3>
                            <p className="text-white/50 mb-6">Fan bo'yicha interaktiv darsliklar bilan o'rganing</p>
                            <div className="flex items-center gap-2 text-blue-400 font-medium">
                                Ko'rish <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </motion.div>

                    {/* Ertaklar */}
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <Link to={`/olympiad/${olympiadId}/content/ertaklar`}
                            className="block bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm border border-purple-500/20 rounded-3xl p-8 hover:border-purple-500/40 hover:bg-purple-500/15 transition-all group">
                            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BookMarked className="w-8 h-8 text-purple-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">✨ Ertaklar</h3>
                            <p className="text-white/50 mb-6">Ertaklarni o'qi, ovoz yoz va savollarga javob ber!</p>
                            <div className="flex items-center gap-2 text-purple-400 font-medium">
                                Ko'rish <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
