import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Search, UserPlus, Check, UserMinus, Clock } from 'lucide-react';
import apiService from '../services/apiService';

export default function FriendsModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('friends'); // friends | search | requests
    const [friendsInfo, setFriendsInfo] = useState({ friends: [], pending_sent: [], pending_received: [] });
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadFriends();
        } else {
            // Reset state when closed
            setSearchQuery('');
            setSearchResults([]);
            setActiveTab('friends');
        }
    }, [isOpen]);

    const loadFriends = async () => {
        try {
            setLoading(true);
            const res = await apiService.get('/social/my-friends');
            if (res.success) {
                setFriendsInfo(res.data);
                // Also auto-switch to requests tab if there are incoming requests
                if (res.data.pending_received.length > 0 && activeTab === 'friends') {
                    setActiveTab('requests');
                }
            }
        } catch (error) {
            console.error("Failed to load friends", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const q = e.target.value;
        setSearchQuery(q);

        if (q.length < 3) {
            setSearchResults([]);
            return;
        }

        try {
            const res = await apiService.get('/social/users/search', { q });
            if (res.success) {
                setSearchResults(res.data);
            }
        } catch (error) {
            console.error("Search failed", error);
        }
    };

    const sendRequest = async (receiverId) => {
        try {
            const res = await apiService.post('/social/requests', { receiver_id: receiverId });
            if (res.success) {
                // Update local search results state mapping
                setSearchResults(prev => prev.map(u => u.id === receiverId ? { ...u, status: 'pending_sent' } : u));
                loadFriends();
            }
        } catch (error) {
            console.error("Send request failed", error);
            alert(error.response?.data?.detail || "Xatolik yuz berdi");
        }
    };

    const handleAction = async (friendshipId, action) => {
        try {
            const res = await apiService.put('/social/requests/action', { friendship_id: friendshipId, action });
            if (res.success) {
                loadFriends(); // Reload everything
            }
        } catch (error) {
            console.error("Action failed", error);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-lg bg-slate-50 dark:bg-slate-900 border border-indigo-100 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col h-[80vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-indigo-100 dark:border-white/10 bg-white dark:bg-white/5 flex-shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Do'stlar</h2>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white transition-colors bg-slate-100 dark:bg-white/5 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 bg-slate-100 dark:bg-black/20 p-1.5 rounded-xl">
                            <button
                                onClick={() => setActiveTab('friends')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'friends' ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                Do'stlarim ({friendsInfo.friends.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'requests' ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                So'rovlar
                                {friendsInfo.pending_received.length > 0 && (
                                    <span className="w-5 h-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                                        {friendsInfo.pending_received.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('search')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'search' ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                Qidirish
                            </button>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-white/10">
                        {loading && activeTab !== 'search' ? (
                            <div className="flex justify-center py-10">
                                <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* FRIENDS TAB */}
                                {activeTab === 'friends' && (
                                    <div className="space-y-3">
                                        {friendsInfo.friends.length === 0 ? (
                                            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                                                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                <p>Sizda hali do'stlar yo'q.</p>
                                                <button onClick={() => setActiveTab('search')} className="text-blue-500 text-sm mt-2 underline">Do'st qidirish</button>
                                            </div>
                                        ) : (
                                            friendsInfo.friends.map(friend => (
                                                <div key={friend.user_id} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                            {friend.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 dark:text-white text-sm">{friend.name}</p>
                                                            <p className="text-xs text-slate-500 dark:text-white/40">Ball: {friend.score || 0}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAction(friend.friendship_id, 'remove')}
                                                        className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                                                        title="Do'stlikdan o'chirish"
                                                    >
                                                        <UserMinus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* REQUESTS TAB */}
                                {activeTab === 'requests' && (
                                    <div className="space-y-6">
                                        {/* Received */}
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 ml-2">Kiruvchi so'rovlar</h3>
                                            {friendsInfo.pending_received.length === 0 ? (
                                                <p className="text-sm text-slate-500 dark:text-slate-500 ml-2">Yangi so'rovlar yo'q.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {friendsInfo.pending_received.map(req => (
                                                        <div key={req.user_id} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                                                                    {req.name.charAt(0)}
                                                                </div>
                                                                <p className="font-bold text-slate-800 dark:text-white text-sm">{req.name}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleAction(req.friendship_id, 'accept')}
                                                                    className="w-8 h-8 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction(req.friendship_id, 'decline')}
                                                                    className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 rounded-full transition-colors"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Sent */}
                                        {friendsInfo.pending_sent.length > 0 && (
                                            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 ml-2">Yuborilgan so'rovlar</h3>
                                                <div className="space-y-2">
                                                    {friendsInfo.pending_sent.map(req => (
                                                        <div key={req.user_id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl opacity-70">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs">
                                                                    {req.name.charAt(0)}
                                                                </div>
                                                                <p className="text-sm text-slate-700 dark:text-slate-300">{req.name}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded">
                                                                <Clock className="w-3 h-3" /> Kutilmoqda
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* SEARCH TAB */}
                                {activeTab === 'search' && (
                                    <div>
                                        <div className="relative mb-4">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Do'stlarni ismi bo'yicha qidiring..."
                                                value={searchQuery}
                                                onChange={handleSearch}
                                                className="w-full pl-9 pr-4 py-3 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors dark:text-white"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            {searchQuery.length > 0 && searchQuery.length < 3 && (
                                                <p className="text-center text-xs text-slate-500 py-4">Kamida 3 ta harf kiriting...</p>
                                            )}
                                            {searchQuery.length >= 3 && searchResults.length === 0 ? (
                                                <p className="text-center text-xs text-slate-500 py-4">Hech kim topilmadi.</p>
                                            ) : (
                                                searchResults.map(user => (
                                                    <div key={user.id} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                                {user.name.charAt(0)}
                                                            </div>
                                                            <p className="font-bold text-slate-800 dark:text-white text-sm">{user.name}</p>
                                                        </div>
                                                        <div>
                                                            {user.status === 'none' && (
                                                                <button
                                                                    onClick={() => sendRequest(user.id)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-500/30 transition-colors"
                                                                >
                                                                    <UserPlus className="w-3.5 h-3.5" /> Qo'shish
                                                                </button>
                                                            )}
                                                            {user.status === 'friends' && (
                                                                <span className="text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-500/20">Do'st</span>
                                                            )}
                                                            {user.status === 'pending_sent' && (
                                                                <span className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-500/20">Yuborilgan</span>
                                                            )}
                                                            {user.status === 'pending_received' && (
                                                                <button
                                                                    onClick={() => { setActiveTab('requests'); }}
                                                                    className="text-xs text-blue-500 underline"
                                                                >
                                                                    Ko'rib chiqish
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
