import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, ArrowLeft, Crown, Sparkles, TrendingUp, Coins, Star, ChevronUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';

const API_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/^https?:\/\//, window.location.protocol + '//');

const LeaderboardPage = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const { isAuthenticated, user } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
        if (isAuthenticated) loadMyRank();
    }, []);

    const loadLeaderboard = async () => {
        try {
            const res = await fetch(`${API_URL}/coins/leaderboard?limit=100`, { credentials: 'include' });
            const data = await res.json();
            setLeaderboard(data.leaderboard || []);
        } catch (err) {
            console.error('Leaderboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMyRank = async () => {
        try {
            const res = await fetch(`${API_URL}/coins/my-rank`, { credentials: 'include' });
            const data = await res.json();
            setMyRank(data.data);
        } catch (err) {
            console.error('My rank error:', err);
        }
    };

    const podiumColors = [
        { bg: 'from-yellow-500/20 to-amber-600/10', border: 'border-yellow-500/40', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
        { bg: 'from-gray-300/20 to-gray-400/10', border: 'border-gray-400/40', text: 'text-gray-300', glow: 'shadow-gray-400/20' },
        { bg: 'from-orange-600/20 to-orange-700/10', border: 'border-orange-600/40', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
    ];

    const rankEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const avatarColors = [
        'from-violet-500 to-purple-600',
        'from-cyan-500 to-blue-600',
        'from-emerald-500 to-green-600',
        'from-rose-500 to-pink-600',
        'from-amber-500 to-orange-600',
        'from-indigo-500 to-blue-700',
        'from-teal-500 to-cyan-700',
        'from-fuchsia-500 to-purple-700',
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#111133] to-[#0a0a1a]">
            <Navbar />

            {/* Floating particles */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-yellow-400/30 animate-pulse"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 3}s`,
                        }}
                    />
                ))}
            </div>

            <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-5 py-2 mb-4">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        <span className="text-yellow-400 font-bold text-sm">UMUMIY REYTING</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                        Eng yaxshi <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">o'quvchilar</span>
                    </h1>
                    <p className="text-white/40 text-sm">Coin yig'ib, reytingda birinchi bo'ling!</p>
                </div>

                {/* My rank card */}
                {myRank && (
                    <div className="mb-6 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-4 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/30">
                                    {myRank.student_name?.[0]?.toUpperCase() || 'M'}
                                </div>
                                <div>
                                    <p className="text-white font-bold">{myRank.student_name || "Siz"}</p>
                                    <p className="text-indigo-300 text-xs">Sizning o'rningiz</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-black text-white">#{myRank.rank}</span>
                                    <span className="text-white/30 text-xs">/ {myRank.total_students}</span>
                                </div>
                                <p className="text-yellow-400 text-sm font-bold">{myRank.total_earned} 🪙</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🏆</div>
                        <p className="text-white/50 text-lg">Hali reyting yo'q</p>
                        <p className="text-white/30 text-sm mt-2">Birinchi bo'lib coin yig'ing!</p>
                    </div>
                ) : (
                    <>
                        {/* Top 3 Podium */}
                        {leaderboard.length >= 3 && (
                            <div className="grid grid-cols-3 gap-3 mb-8">
                                {/* 2nd place */}
                                <div className="mt-8">
                                    <div className={`bg-gradient-to-b ${podiumColors[1].bg} border ${podiumColors[1].border} rounded-2xl p-4 text-center backdrop-blur-sm shadow-lg ${podiumColors[1].glow}`}>
                                        <div className="text-2xl mb-2">🥈</div>
                                        <div className={`w-12 h-12 mx-auto bg-gradient-to-br ${avatarColors[1]} rounded-xl flex items-center justify-center text-white font-black text-lg mb-2 shadow-md`}>
                                            {leaderboard[1].avatar_initial}
                                        </div>
                                        <p className="text-white font-bold text-xs truncate">{leaderboard[1].student_name}</p>
                                        <p className="text-yellow-400 font-black text-sm mt-1">{leaderboard[1].total_earned} 🪙</p>
                                    </div>
                                </div>
                                {/* 1st place */}
                                <div>
                                    <div className={`bg-gradient-to-b ${podiumColors[0].bg} border ${podiumColors[0].border} rounded-2xl p-4 text-center backdrop-blur-sm shadow-xl ${podiumColors[0].glow} relative overflow-hidden`}>
                                        <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-500/20 rounded-full blur-md" />
                                        <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                                        <div className="text-2xl mb-2">🥇</div>
                                        <div className={`w-14 h-14 mx-auto bg-gradient-to-br ${avatarColors[0]} rounded-xl flex items-center justify-center text-white font-black text-xl mb-2 shadow-lg ring-2 ring-yellow-400/30`}>
                                            {leaderboard[0].avatar_initial}
                                        </div>
                                        <p className="text-white font-bold text-sm truncate">{leaderboard[0].student_name}</p>
                                        <p className="text-yellow-400 font-black text-lg mt-1">{leaderboard[0].total_earned} 🪙</p>
                                    </div>
                                </div>
                                {/* 3rd place */}
                                <div className="mt-12">
                                    <div className={`bg-gradient-to-b ${podiumColors[2].bg} border ${podiumColors[2].border} rounded-2xl p-4 text-center backdrop-blur-sm shadow-lg ${podiumColors[2].glow}`}>
                                        <div className="text-2xl mb-2">🥉</div>
                                        <div className={`w-12 h-12 mx-auto bg-gradient-to-br ${avatarColors[2]} rounded-xl flex items-center justify-center text-white font-black text-lg mb-2 shadow-md`}>
                                            {leaderboard[2].avatar_initial}
                                        </div>
                                        <p className="text-white font-bold text-xs truncate">{leaderboard[2].student_name}</p>
                                        <p className="text-yellow-400 font-black text-sm mt-1">{leaderboard[2].total_earned} 🪙</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Full list */}
                        <div className="space-y-2">
                            {leaderboard.map((entry, i) => {
                                const isMe = myRank && entry.student_name === myRank.student_name;
                                const colorIdx = i % avatarColors.length;
                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isMe
                                                ? 'bg-indigo-600/20 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                                                : i < 3
                                                    ? 'bg-white/5 border border-white/10'
                                                    : 'bg-white/[0.03] border border-transparent hover:bg-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        {/* Rank */}
                                        <div className={`w-8 text-center font-black text-sm ${i === 0 ? 'text-yellow-400' :
                                                i === 1 ? 'text-gray-300' :
                                                    i === 2 ? 'text-orange-400' :
                                                        'text-white/30'
                                            }`}>
                                            {i < 3 ? rankEmoji(i + 1) : entry.rank}
                                        </div>

                                        {/* Avatar */}
                                        <div className={`w-10 h-10 bg-gradient-to-br ${avatarColors[colorIdx]} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                                            {entry.avatar_initial}
                                        </div>

                                        {/* Name */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold text-sm truncate ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                                                {entry.student_name}
                                                {isMe && <span className="text-indigo-400 text-xs ml-2">(Siz)</span>}
                                            </p>
                                            {entry.grade && (
                                                <p className="text-white/20 text-[10px]">{entry.grade}-sinf</p>
                                            )}
                                        </div>

                                        {/* Coins */}
                                        <div className="text-right">
                                            <p className={`font-black text-sm ${i < 3 ? 'text-yellow-400' : 'text-white/70'}`}>
                                                {entry.total_earned.toLocaleString()}
                                            </p>
                                            <p className="text-white/20 text-[10px]">coin</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
};

export default LeaderboardPage;
