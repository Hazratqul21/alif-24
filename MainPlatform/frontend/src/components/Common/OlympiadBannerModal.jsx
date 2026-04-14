import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Trophy, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';

const DISMISSED_KEY = 'olympiad_banners_dismissed';

const ADMIN_PATH_PREFIX = '/admin';

const OlympiadBannerModal = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const [banners, setBanners] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const isAdminPage = location.pathname.startsWith(ADMIN_PATH_PREFIX);

    useEffect(() => {
        if (!isAuthenticated || isAdminPage) return;

        let cancelled = false;
        const fetchBanners = async () => {
            try {
                const res = await apiService.get('/olympiads/public/active-banners');
                if (cancelled) return;
                const activeBanners = res.banners || [];
                if (activeBanners.length === 0) return;

                let dismissed = [];
                try { dismissed = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]'); } catch { sessionStorage.removeItem(DISMISSED_KEY); }
                const newBanners = activeBanners.filter(b => !dismissed.includes(b.id));

                if (newBanners.length > 0) {
                    setBanners(newBanners);
                    setIsOpen(true);
                }
            } catch {
                // Silent fail — student sessiyasini buzmaslik uchun
            }
        };

        const timer = setTimeout(fetchBanners, 1500);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [isAuthenticated, isAdminPage]);

    const handleClose = useCallback(() => {
        let dismissed = [];
        try { dismissed = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]'); } catch { /* corrupted */ }
        const ids = banners.map(b => b.id);
        sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...new Set([...dismissed, ...ids])]));
        setIsOpen(false);
    }, [banners]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, handleClose]);

    const handleViewDetails = (olympiadId) => {
        // Olimp platformasiga yo'naltirish
        window.open(`https://olimp.alif24.uz/olympiad/${olympiadId}`, '_blank');
    };

    if (!isOpen || banners.length === 0 || isAdminPage) return null;

    const safeIndex = Math.min(currentIndex, banners.length - 1);
    const banner = banners[safeIndex];

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={handleClose}
        >
            <div
                className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Yopish tugmasi */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-10 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-white/80" />
                </button>

                {/* Banner rasm */}
                {banner.banner_image && (
                    <div className="w-full h-56 sm:h-64 overflow-hidden">
                        <img
                            src={banner.banner_image}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </div>
                )}

                {/* Kontent */}
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-xl shrink-0">
                            <Trophy className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-tight">{banner.title}</h2>
                            {banner.description && (
                                <p className="text-sm text-white/60 mt-1 line-clamp-2">{banner.description}</p>
                            )}
                        </div>
                    </div>

                    {/* Vaqt ma'lumoti */}
                    {banner.start_time && (
                        <div className="flex items-center gap-2 text-sm text-indigo-300/80">
                            <span>
                                {new Date(banner.start_time).toLocaleDateString('uz-UZ', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </span>
                            {banner.end_time && (
                                <>
                                    <span>—</span>
                                    <span>
                                        {new Date(banner.end_time).toLocaleDateString('uz-UZ', {
                                            day: 'numeric', month: 'long', year: 'numeric'
                                        })}
                                    </span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Tugmalar */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={() => handleViewDetails(banner.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors text-sm"
                        >
                            <Trophy className="w-4 h-4" />
                            Batafsil ko'rish
                        </button>
                        <button
                            onClick={handleClose}
                            className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl font-medium transition-colors text-sm"
                        >
                            Yopish
                        </button>
                    </div>

                    {/* Pagination (bir nechta banner bo'lsa) */}
                    {banners.length > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-2">
                            <button
                                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                                disabled={safeIndex === 0}
                                className="p-1 text-white/40 hover:text-white disabled:opacity-30 transition"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-xs text-white/40">
                                {safeIndex + 1} / {banners.length}
                            </span>
                            <button
                                onClick={() => setCurrentIndex(i => Math.min(banners.length - 1, i + 1))}
                                disabled={safeIndex === banners.length - 1}
                                className="p-1 text-white/40 hover:text-white disabled:opacity-30 transition"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OlympiadBannerModal;
