import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, CheckCircle, Coins } from 'lucide-react';
import { useGamification } from '../context/GamificationContext';

export default function ShopModal({ isOpen, onClose }) {
    const { coins, shopItems, purchaseItem, loading } = useGamification();
    const [buying, setBuying] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    if (!isOpen) return null;

    const handlePurchase = async (item) => {
        setErrorMessage('');
        setSuccessMessage('');

        if (coins < item.price) {
            setErrorMessage(`Sizda yetarli coin yo'q! Yana ${item.price - coins} 🪙 kerak.`);
            return;
        }

        setBuying(item.id);
        const result = await purchaseItem(item.id);
        setBuying(null);

        if (result.success) {
            setSuccessMessage(`${item.name} muvaffaqiyatli xarid qilindi! 🎉`);
            setTimeout(() => setSuccessMessage(''), 3000);
        } else {
            setErrorMessage(result.message || 'Xarid amalga oshmadi.');
        }
    };

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
                    className="relative w-full max-w-2xl bg-slate-50 dark:bg-slate-900 border border-indigo-100 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header */}
                    <div className="relative p-6 border-b border-indigo-100 dark:border-white/10 bg-white dark:bg-white/5 flex-shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Olimp Do'koni</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-500/20 px-4 py-2 rounded-full border border-yellow-200 dark:border-yellow-500/30">
                                <span className="font-bold text-yellow-700 dark:text-yellow-400">{coins}</span>
                                <span>🪙</span>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white transition-colors bg-slate-100 dark:bg-white/5 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    {successMessage && (
                        <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2 text-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5" />
                            {successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/20 dark:border-red-500/30 dark:text-red-400 rounded-xl text-sm font-medium text-center flex-shrink-0">
                            {errorMessage}
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-white/10">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            </div>
                        ) : shopItems.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-white/20" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 dark:text-white/70 mb-2">Do'kon bo'sh</h3>
                                <p className="text-slate-500 dark:text-white/40">Tez orada yangi narsalar qo'shiladi!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {shopItems.map((item) => (
                                    <div key={item.id} className="bg-white dark:bg-white/5 border border-indigo-50 dark:border-white/10 rounded-2xl p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow dark:shadow-none">
                                        <div className="h-32 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 flex items-center justify-center border border-slate-100 dark:border-white/5 relative overflow-hidden group">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                                                    {item.type === 'avatar_frame' ? '🖼️' : item.type === 'profile_theme' ? '🎨' : '🎁'}
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 bg-yellow-100 dark:bg-yellow-500 border border-yellow-300 dark:border-yellow-400 text-yellow-700 dark:text-yellow-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                                {item.price} 🪙
                                            </div>
                                        </div>

                                        <h3 className="text-slate-800 dark:text-white font-bold mb-1">{item.name}</h3>
                                        <p className="text-slate-500 dark:text-white/50 text-xs mb-4 flex-1">{item.description}</p>

                                        <button
                                            onClick={() => handlePurchase(item)}
                                            disabled={buying === item.id || coins < item.price}
                                            className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${buying === item.id
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-white/5 dark:text-white/30'
                                                    : coins >= item.price
                                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'
                                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-white/10 dark:text-white/30'
                                                }`}
                                        >
                                            {buying === item.id ? (
                                                <div className="w-5 h-5 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    {coins >= item.price ? 'Sotib olish' : "Coin yetarli emas"}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
