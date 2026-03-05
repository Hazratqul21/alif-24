import { motion } from 'framer-motion';
import { Sparkles, Trophy, BookOpen } from 'lucide-react';
import StatsCounter from './StatsCounter';

export default function HeroSection({ onStart }) {
    return (
        <div className="relative overflow-hidden bg-slate-50 dark:bg-gradient-to-b dark:from-indigo-950 dark:via-slate-900 dark:to-slate-900 pt-32 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-3xl" style={{ animationDuration: '4s' }} />
            </div>

            <div className="relative max-w-4xl mx-auto text-center z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-white/5 border border-indigo-200 dark:border-white/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold mb-8 shadow-sm"
                >
                    <Sparkles className="w-4 h-4" />
                    <span>Yangi mavsum boshlandi!</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="text-5xl md:text-7xl font-extrabold text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-br dark:from-white dark:via-indigo-200 dark:to-indigo-400 tracking-tight mb-6"
                >
                    Bilimingni Sinashtir & <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400">G'olib Bo'l</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-lg md:text-xl text-slate-600 dark:text-indigo-200/80 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
                >
                    Alif24 Olimp orqali o'z bilimlaringizni sinab ko'ring. Respublika bo'ylab tengdoshlaringiz bilan bellashing va reytingda yuqoriga ko'tariling.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                >
                    <button
                        onClick={onStart}
                        className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-2xl hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:scale-105 transition-all flex items-center justify-center gap-3"
                    >
                        <Trophy className="w-5 h-5" /> Musobaqalarni Ko'rish
                    </button>
                    <button
                        onClick={() => document.getElementById('reading-section').scrollIntoView({ behavior: 'smooth' })}
                        className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-white/5 border border-indigo-100 dark:border-white/10 text-slate-700 dark:text-white font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-3 hover:scale-105 shadow-sm dark:shadow-none"
                    >
                        <BookOpen className="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> O'qish Musobaqasi
                    </button>
                </motion.div>

                <StatsCounter />
            </div>
        </div>
    );
}
