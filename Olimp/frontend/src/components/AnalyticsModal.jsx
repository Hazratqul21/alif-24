import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LineChart, Target, Zap, BrainCircuit, TrendingUp } from 'lucide-react';
import apiService from '../services/apiService';

export default function AnalyticsModal({ isOpen, onClose }) {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        loadAnalytics();
    }, [isOpen]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const meData = await apiService.get('/auth/me');
            const userId = meData.data?.id || meData.user?.id || meData.id;
            if (!userId) return;

            const res = await apiService.get('/olympiad/my-analytics/insights', { student_id: userId });
            if (res.success && res.data.has_data) {
                setAnalyticsData(res.data);
            } else {
                setAnalyticsData({ has_data: false, message: res.data?.message || "Hali ma'lumot yo'q" });
            }
        } catch (error) {
            console.error("Failed to load analytics:", error);
            setAnalyticsData({ has_data: false, message: "Xatolik yuz berdi" });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            >
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-3xl bg-slate-50 dark:bg-slate-900 border border-indigo-100 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="relative p-6 border-b border-indigo-100 dark:border-white/10 bg-white dark:bg-white/5 flex-shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                                <LineChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Smart Analitika</h2>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white transition-colors bg-slate-100 dark:bg-white/5 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-white/10">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        ) : !analyticsData?.has_data ? (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BrainCircuit className="w-10 h-10 text-slate-300 dark:text-white/20" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 dark:text-white/70 mb-2">Tahlil uchun ma'lumot yetarli emas</h3>
                                <p className="text-slate-500 dark:text-white/40">{analyticsData?.message}</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Top Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-indigo-50 dark:border-white/5 shadow-sm dark:shadow-none flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center">
                                            <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-slate-500 dark:text-white/50 text-xs font-bold uppercase">O'rtacha Ball</p>
                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{analyticsData.average_score}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-emerald-50 dark:border-white/5 shadow-sm dark:shadow-none flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-slate-500 dark:text-white/50 text-xs font-bold uppercase">Ishtiroklar</p>
                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{analyticsData.total_participations} ta</p>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-amber-50 dark:border-white/5 shadow-sm dark:shadow-none flex items-center gap-4">
                                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center">
                                            <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-slate-500 dark:text-white/50 text-xs font-bold uppercase">O'rtacha Vaqt/Savol</p>
                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{analyticsData.avg_time_per_question}s</p>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Insights */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                                    <h3 className="font-bold text-blue-800 dark:text-blue-300 text-lg flex items-center gap-2 mb-4">
                                        <BrainCircuit className="w-5 h-5" /> AI Tahlili
                                    </h3>
                                    <ul className="space-y-3">
                                        {analyticsData.insights.map((insight, idx) => (
                                            <li key={idx} className="flex gap-3 text-slate-700 dark:text-blue-100 text-sm bg-white/50 dark:bg-black/20 p-3 rounded-xl">
                                                <span className="text-blue-500 dark:text-blue-400 mt-0.5">•</span>
                                                <span className="leading-relaxed">{insight}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Progress Chart (Bar Chart Implementation using standard divs) */}
                                <div className="bg-white dark:bg-white/5 p-5 rounded-2xl border border-indigo-50 dark:border-white/5 shadow-sm dark:shadow-none">
                                    <h3 className="font-bold text-slate-700 dark:text-white mb-6">O'sish Dinamikasi</h3>
                                    <div className="h-48 flex items-end gap-2 sm:gap-4 overflow-x-auto pb-2 scrollbar-none">
                                        {analyticsData.progress_chart.map((data, idx) => (
                                            <div key={idx} className="flex-shrink-0 flex flex-col items-center w-12 sm:w-16 group relative">
                                                {/* Tooltip */}
                                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none">
                                                    {data.title}: {data.score} ({Math.round(data.percentage)}%)
                                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                </div>

                                                <div className="w-full flex justify-center items-end h-32 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg relative">
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${Math.max(data.percentage, 5)}%` }}
                                                        transition={{ duration: 1, delay: idx * 0.1 }}
                                                        className={`w-4 sm:w-8 rounded-t-md ${data.percentage >= 80 ? 'bg-emerald-500 dark:bg-emerald-400' :
                                                                data.percentage >= 50 ? 'bg-blue-500 dark:bg-blue-400' :
                                                                    'bg-amber-500 dark:bg-amber-400'
                                                            }`}
                                                    ></motion.div>
                                                </div>
                                                <div className="text-[10px] text-slate-500 dark:text-white/40 mt-2 rotate-45 transform origin-left truncate w-full group-hover:text-slate-800 dark:group-hover:text-white">
                                                    {data.date.slice(5)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
