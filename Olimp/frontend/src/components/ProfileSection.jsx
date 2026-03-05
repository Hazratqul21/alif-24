import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Clock, CheckCircle, Coins, ChevronDown, ChevronUp, User, Flame, Medal, ShoppingBag, BrainCircuit } from 'lucide-react';
import apiService from '../services/apiService';
import { useGamification } from '../context/GamificationContext';
import ShopModal from './ShopModal';
import AnalyticsModal from './AnalyticsModal';
import FriendsModal from './FriendsModal';

export default function ProfileSection({ isOpen, onClose }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [showShop, setShowShop] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showFriends, setShowFriends] = useState(false);
    const { coins, current_streak, longest_streak, badges, refreshGamification } = useGamification();

    useEffect(() => {
        if (!isOpen) return;
        loadProfile();
        refreshGamification();
    }, [isOpen]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            // Get current user info
            const meData = await apiService.get('/auth/me');
            const userId = meData.data?.id || meData.user?.id || meData.id;
            if (!userId) return;

            const data = await apiService.get('/olympiad/my-profile', { student_id: userId });
            setProfile(data.data);
        } catch (err) {
            console.error('Profile load error:', err);
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
                className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
                onClick={onClose}
            >
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <motion.div
                    initial={{ opacity: 0, y: -30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-[28rem] bg-slate-50 dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900 border border-indigo-100 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="relative pt-6 flex flex-col h-full max-h-[85vh]">
                        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white transition-colors bg-white dark:bg-transparent rounded-full p-1 shadow-sm dark:shadow-none">
                            <X className="w-5 h-5" />
                        </button>

                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            </div>
                        ) : profile ? (
                            <>
                                <div className="px-6 flex-shrink-0">
                                    {/* Avatar + name & Streak */}
                                    <div className="flex items-center justify-between mb-5 bg-white dark:bg-white/5 p-4 rounded-2xl border border-indigo-50 dark:border-white/5 shadow-sm dark:shadow-none">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                                <User className="w-7 h-7 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-slate-800 dark:text-white font-bold text-lg">{profile.name}</h3>
                                                <p className="text-indigo-500 dark:text-indigo-400 text-sm font-medium">{profile.participations_count} ta olimpiada</p>
                                            </div>
                                        </div>

                                        {/* Streak Badge */}
                                        <div className="flex flex-col items-center bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-3 py-2 rounded-xl">
                                            <Flame className={`w-6 h-6 ${current_streak > 0 ? 'text-orange-500' : 'text-slate-300 dark:text-white/20'}`} />
                                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{current_streak} kun</span>
                                        </div>
                                    </div>

                                    {/* Coin balance & Shop Button */}
                                    <div className="flex gap-3 mb-4">
                                        <div className="flex-1 bg-gradient-to-r from-yellow-100 to-amber-50 dark:from-yellow-500/15 dark:to-amber-500/10 border border-yellow-200 dark:border-yellow-500/25 rounded-2xl p-4 shadow-sm dark:shadow-none">
                                            <p className="text-yellow-700/60 dark:text-white/50 text-xs uppercase tracking-wider font-bold mb-1">Olimpiada coinlari</p>
                                            <p className="text-3xl font-black text-yellow-600 dark:text-yellow-400">
                                                {coins || profile.coin_balance} <span className="text-xl">🪙</span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowShop(true)}
                                            className="flex flex-col items-center justify-center gap-1 w-24 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all font-medium shadow-sm dark:shadow-none"
                                        >
                                            <ShoppingBag className="w-6 h-6" />
                                            <span className="text-sm">Do'kon</span>
                                        </button>
                                    </div>

                                    {/* Badges Section */}
                                    {badges && badges.length > 0 && (
                                        <div className="mb-4 bg-white dark:bg-white/5 p-4 rounded-2xl border border-indigo-50 dark:border-white/5 shadow-sm dark:shadow-none">
                                            <h4 className="text-slate-700 dark:text-white/70 text-sm font-bold mb-3 flex items-center gap-2">
                                                <Medal className="w-4 h-4 text-indigo-500" /> Mening Nishonlarim
                                            </h4>
                                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                                                {badges.map((badge, idx) => (
                                                    <div key={idx} className="flex-shrink-0 flex flex-col items-center w-20 group" title={badge.description}>
                                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-sm">
                                                            <span className="text-2xl">{badge.icon_url || '🌟'}</span>
                                                        </div>
                                                        <span className="text-[10px] text-center font-medium text-slate-600 dark:text-indigo-200 leading-tight line-clamp-2">{badge.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Scrollable Content Area */}
                                <div className="px-6 pb-6 mt-2 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-white/10">

                                    {/* Secondary Actions (History & Analytics & Friends) */}
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => setShowFriends(true)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-500/20 dark:hover:to-teal-500/20 transition-colors text-sm font-bold shadow-sm dark:shadow-none"
                                        >
                                            <span className="flex items-center gap-2"><User className="w-4 h-4" /> Do'stlar</span>
                                            <span className="text-xs bg-emerald-200 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">Yangi</span>
                                        </button>

                                        <button
                                            onClick={() => setShowAnalytics(true)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl text-blue-700 dark:text-blue-400 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-500/20 dark:hover:to-indigo-500/20 transition-colors text-sm font-bold shadow-sm dark:shadow-none"
                                        >
                                            <span className="flex items-center gap-2"><BrainCircuit className="w-4 h-4" /> Smart Analitika (AI)</span>
                                            <span className="text-xs bg-blue-200 dark:bg-blue-500/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">Yangi</span>
                                        </button>

                                        <button
                                            onClick={() => setShowHistory(!showHistory)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-white/5 border border-indigo-50 dark:border-transparent rounded-xl text-slate-700 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors text-sm font-medium shadow-sm dark:shadow-none"
                                        >
                                            <span>Olimpiada tarixi</span>
                                            {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </button>
                                    </div>

                                    {/* History list */}
                                    <AnimatePresence>
                                        {showHistory && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-3 space-y-2 pr-1">
                                                    {profile.history.length === 0 ? (
                                                        <p className="text-slate-500 dark:text-white/30 text-sm text-center py-4">Hali olimpiada tarixi yo'q</p>
                                                    ) : profile.history.map((h, i) => (
                                                        <div key={i} className="bg-white dark:bg-white/5 rounded-xl p-3 border border-indigo-50 dark:border-white/5 shadow-sm dark:shadow-none">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <p className="text-slate-800 dark:text-white text-sm font-bold truncate flex-1">{h.olympiad_title}</p>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full ml-2 font-medium ${h.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                                    h.status === 'registered' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                                                                        'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/50'
                                                                    }`}>
                                                                    {h.status === 'completed' ? 'Tugatildi' : h.status === 'registered' ? "Ro'yxatda" : h.status}
                                                                </span>
                                                            </div>
                                                            {h.status === 'completed' && (
                                                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-white/40 mt-1 font-medium">
                                                                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-transparent px-1.5 py-0.5 rounded">
                                                                        <Trophy className="w-3 h-3 text-indigo-400" /> {h.score} ball
                                                                    </span>
                                                                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-transparent px-1.5 py-0.5 rounded">
                                                                        <CheckCircle className="w-3 h-3 text-emerald-400" /> {h.correct_answers}/{h.correct_answers + h.wrong_answers}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400/70 bg-yellow-50 dark:bg-transparent px-1.5 py-0.5 rounded">
                                                                        +{h.coins_earned} 🪙
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        ) : (
                            <div className="px-6 pb-6 flex items-center justify-center flex-1">
                                <p className="text-slate-500 dark:text-white/40 font-medium">Profil topilmadi</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Shop Modal */}
                <ShopModal isOpen={showShop} onClose={() => setShowShop(false)} />

                {/* Analytics Modal */}
                <AnalyticsModal isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} />

                {/* Friends Modal */}
                <FriendsModal isOpen={showFriends} onClose={() => setShowFriends(false)} />
            </motion.div>
        </AnimatePresence>
    );
}
