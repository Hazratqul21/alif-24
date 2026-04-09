import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Gift, Tag, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';

const GlobalSubscriptionModal = () => {
    const { subscription, loading, fetchSubscription } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [subPlans, setSubPlans] = useState([]);
    const [subLoading, setSubLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Promo code state (plan.id bo'yicha)
    const [promoOpen, setPromoOpen] = useState({});
    const [promoCode, setPromoCode] = useState({});
    const [promoResult, setPromoResult] = useState({});
    const [promoLoading, setPromoLoading] = useState({});
    const [promoError, setPromoError] = useState({});
    const [applyingPromo, setApplyingPromo] = useState({});

    useEffect(() => {
        const handleSubRequired = (e) => {
            const detail = e.detail || {};
            setMessage(detail.message || "Ushbu xizmatdan foydalanish uchun obuna talab etiladi.");
            setIsOpen(true);
            fetchPlans();
        };

        window.addEventListener('subscriptionRequired', handleSubRequired);
        return () => window.removeEventListener('subscriptionRequired', handleSubRequired);
    }, []);

    const fetchPlans = async () => {
        if (subPlans.length > 0) return;
        setSubLoading(true);
        try {
            const response = await apiService.get('/coins/subscription/plans');
            setSubPlans(response.plans || []);
        } catch (err) {
            console.error('Failed to fetch subscription plans:', err);
        } finally {
            setSubLoading(false);
        }
    };

    const validatePromo = async (planId) => {
        const code = (promoCode[planId] || '').trim();
        if (!code) return;

        setPromoLoading(p => ({ ...p, [planId]: true }));
        setPromoError(p => ({ ...p, [planId]: null }));
        setPromoResult(p => ({ ...p, [planId]: null }));

        try {
            const res = await apiService.get(`/payments/promo/${encodeURIComponent(code)}`);
            setPromoResult(p => ({ ...p, [planId]: res.promo }));
        } catch (err) {
            const msg = err?.response?.detail || err?.message || "Promokod noto'g'ri yoki muddati tugagan";
            setPromoError(p => ({ ...p, [planId]: msg }));
        } finally {
            setPromoLoading(p => ({ ...p, [planId]: false }));
        }
    };

    const applyFreePromo = async (planId) => {
        const code = (promoCode[planId] || '').trim();
        if (!code) return;

        setApplyingPromo(p => ({ ...p, [planId]: true }));
        try {
            await apiService.post(`/payments/promo/${encodeURIComponent(code)}/apply`);
            if (fetchSubscription) await fetchSubscription();
            setIsOpen(false);
        } catch (err) {
            const msg = err?.response?.detail || err?.message || "Promokodni qo'llashda xatolik";
            setPromoError(p => ({ ...p, [planId]: msg }));
        } finally {
            setApplyingPromo(p => ({ ...p, [planId]: false }));
        }
    };

    const clearPromo = (planId) => {
        setPromoCode(p => ({ ...p, [planId]: '' }));
        setPromoResult(p => ({ ...p, [planId]: null }));
        setPromoError(p => ({ ...p, [planId]: null }));
        setPromoOpen(p => ({ ...p, [planId]: false }));
    };

    const getDiscountedPrice = (plan) => {
        const result = promoResult[plan.id];
        if (result?.promo_type === 'discount' && result?.discount_percent > 0) {
            return Math.max(0, plan.price - Math.floor(plan.price * result.discount_percent / 100));
        }
        return plan.price;
    };

    if (!isOpen || loading) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        ⭐ Obuna rejalar
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Error message from event */}
                    {message && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 font-medium">
                            {message}
                        </div>
                    )}

                    {/* Current sub status */}
                    {subscription?.has_subscription ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle size={18} className="text-emerald-600" />
                                <span className="font-bold text-emerald-700">Faol obuna</span>
                            </div>
                            <p className="text-sm text-emerald-600">Plan: <span className="font-bold">{subscription.subscription?.plan_name || subscription.plan_name}</span></p>
                            {subscription.subscription?.expires_at && (
                                <p className="text-xs text-emerald-500 mt-1">Tugash: {new Date(subscription.subscription.expires_at).toLocaleDateString('uz')}</p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Gift size={18} className="text-yellow-600" />
                                <span className="font-bold text-yellow-700">Obuna yo'q</span>
                            </div>
                            <p className="text-xs text-yellow-600">Quyidagi planlardan birini tanlang</p>
                        </div>
                    )}

                    {/* Plans */}
                    {subLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                    ) : subPlans.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <p>Hozircha planlar mavjud emas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {subPlans.map(plan => {
                                const result = promoResult[plan.id];
                                const discountedPrice = getDiscountedPrice(plan);
                                const hasDiscount = result?.promo_type === 'discount' && discountedPrice < plan.price;
                                const isFreePromo = result?.promo_type === 'free_days' || result?.promo_type === 'plan';

                                return (
                                    <div key={plan.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-all">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h4 className="font-bold text-gray-800">{plan.name}</h4>
                                                {plan.description && <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>}
                                            </div>
                                            <div className="text-right">
                                                {hasDiscount ? (
                                                    <>
                                                        <p className="text-sm text-gray-400 line-through">{plan.price.toLocaleString()} UZS</p>
                                                        <p className="text-xl font-black text-green-600">{discountedPrice.toLocaleString()} UZS</p>
                                                    </>
                                                ) : (
                                                    <p className="text-xl font-black text-indigo-600">
                                                        {plan.price ? `${plan.price.toLocaleString()} UZS` : 'Bepul'}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-gray-400">{plan.duration_days} kun</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap mb-3">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-medium">{plan.max_children} bola</span>
                                            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[10px] font-medium">{plan.duration_days} kunlik</span>
                                        </div>

                                        {/* Promo code section */}
                                        {plan.price > 0 && (
                                            <div className="mb-3">
                                                {!promoOpen[plan.id] && !result ? (
                                                    <button
                                                        onClick={() => setPromoOpen(p => ({ ...p, [plan.id]: true }))}
                                                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <Tag size={13} />
                                                        Promokod bormi?
                                                    </button>
                                                ) : !result ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={promoCode[plan.id] || ''}
                                                            onChange={e => setPromoCode(p => ({ ...p, [plan.id]: e.target.value.toUpperCase() }))}
                                                            onKeyDown={e => e.key === 'Enter' && validatePromo(plan.id)}
                                                            placeholder="Promokodni kiriting..."
                                                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400 uppercase"
                                                        />
                                                        <button
                                                            onClick={() => validatePromo(plan.id)}
                                                            disabled={promoLoading[plan.id] || !(promoCode[plan.id] || '').trim()}
                                                            className="bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                        >
                                                            {promoLoading[plan.id] ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                        </button>
                                                        <button
                                                            onClick={() => clearPromo(plan.id)}
                                                            className="text-gray-400 hover:text-gray-600 p-1"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle size={14} className="text-green-600" />
                                                            <span className="text-xs font-medium text-green-700">{result.message}</span>
                                                        </div>
                                                        <button onClick={() => clearPromo(plan.id)} className="text-gray-400 hover:text-gray-600">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                                {promoError[plan.id] && (
                                                    <p className="text-xs text-red-500 mt-1">{promoError[plan.id]}</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Free promo apply button */}
                                        {isFreePromo && (
                                            <button
                                                onClick={() => applyFreePromo(plan.id)}
                                                disabled={applyingPromo[plan.id]}
                                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 mb-2"
                                            >
                                                {applyingPromo[plan.id] ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <>🎁 Faollashtirish — {result.message}</>
                                                )}
                                            </button>
                                        )}

                                        {/* Payment button */}
                                        {plan.price > 0 && !isFreePromo && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const body = {
                                                            plan_config_id: plan.id,
                                                            return_url: window.location.origin + '/student-dashboard?payment=success'
                                                        };
                                                        if (result?.promo_type === 'discount' && promoCode[plan.id]) {
                                                            body.promo_code = promoCode[plan.id];
                                                        }
                                                        const res = await apiService.post('/payments/checkout', body);
                                                        const data = res.data || res;
                                                        if (data.checkout_url) {
                                                            if (data.transaction_id) {
                                                                localStorage.setItem('pending_payment_txn', data.transaction_id);
                                                            }
                                                            window.location.href = data.checkout_url;
                                                        } else {
                                                            alert(data.detail || "To'lov tizimi hozir ishlamayapti");
                                                        }
                                                    } catch (e) {
                                                        console.error('Payment error:', e);
                                                        alert("To'lov tizimi bilan bog'lanib bo'lmadi");
                                                    }
                                                }}
                                                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2.5 rounded-xl font-bold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md flex items-center justify-center gap-2"
                                            >
                                                {hasDiscount ? (
                                                    <>💳 To'lov qilish — <span className="line-through opacity-60 mr-1">{plan.price.toLocaleString()}</span> {discountedPrice.toLocaleString()} UZS</>
                                                ) : (
                                                    <>💳 To'lov qilish — {plan.price.toLocaleString()} UZS</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Fallback Telegram contact */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center mt-3">
                        <p className="text-[11px] text-gray-500">Muammo bo'lsa: <a href="https://t.me/alif24_support" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Telegram orqali bog'lanish</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalSubscriptionModal;
