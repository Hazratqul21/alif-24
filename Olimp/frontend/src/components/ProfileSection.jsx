import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Clock, CheckCircle, Coins, ChevronDown, ChevronUp, User } from 'lucide-react';
import apiService from '../services/apiService';

export default function ProfileSection({ isOpen, onClose }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        loadProfile();
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                <motion.div
                    initial={{ opacity: 0, y: -30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative px-6 pt-6 pb-4">
                        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>

                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            </div>
                        ) : profile ? (
                            <>
                                {/* Avatar + name */}
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                        <User className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">{profile.name}</h3>
                                        <p className="text-indigo-400 text-sm">{profile.participations_count} ta olimpiada</p>
                                    </div>
                                </div>

                                {/* Coin balance */}
                                <div className="bg-gradient-to-r from-yellow-500/15 to-amber-500/10 border border-yellow-500/25 rounded-2xl p-4 mb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white/50 text-xs uppercase tracking-wider">Olimpiada coinlari</p>
                                            <p className="text-3xl font-black text-yellow-400 mt-1">{profile.coin_balance} 🪙</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white/30 text-xs">Jami yig'ilgan</p>
                                            <p className="text-yellow-400/60 text-lg font-bold">{profile.total_coins_earned}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* History toggle */}
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 transition-colors text-sm"
                                >
                                    <span>Olimpiada tarixi</span>
                                    {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {/* History list */}
                                <AnimatePresence>
                                    {showHistory && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                                                {profile.history.length === 0 ? (
                                                    <p className="text-white/30 text-sm text-center py-4">Hali olimpiada yo'q</p>
                                                ) : profile.history.map((h, i) => (
                                                    <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-white text-sm font-medium truncate flex-1">{h.olympiad_title}</p>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${h.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                    h.status === 'registered' ? 'bg-blue-500/20 text-blue-400' :
                                                                        'bg-white/10 text-white/50'
                                                                }`}>
                                                                {h.status === 'completed' ? 'Tugatildi' : h.status === 'registered' ? "Ro'yxatda" : h.status}
                                                            </span>
                                                        </div>
                                                        {h.status === 'completed' && (
                                                            <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <Trophy className="w-3 h-3" /> {h.score} ball
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <CheckCircle className="w-3 h-3" /> {h.correct_answers}/{h.correct_answers + h.wrong_answers}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-yellow-400/70">
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
                            </>
                        ) : (
                            <p className="text-white/40 text-center py-8">Profil topilmadi</p>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
