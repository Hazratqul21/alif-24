import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Gift } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';

const GlobalSubscriptionModal = () => {
    const { subscription, loading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [subPlans, setSubPlans] = useState([]);
    const [subLoading, setSubLoading] = useState(false);
    const [message, setMessage] = useState('');

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
                            {subPlans.map(plan => (
                                <div key={plan.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-all">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{plan.name}</h4>
                                            {plan.description && <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-indigo-600">
                                                {plan.price ? `${plan.price.toLocaleString()} UZS` : 'Bepul'}
                                            </p>
                                            <p className="text-[10px] text-gray-400">{plan.duration_days} kun</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap mb-3">
                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-medium">{plan.max_children} bola</span>
                                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[10px] font-medium">{plan.duration_days} kunlik</span>
                                    </div>
                                    {plan.price > 0 && (
                                        <button
                                            onClick={async () => {
                                                console.log('🔔 Payment clicked, plan:', plan.id, plan.name);
                                                try {
                                                    const res = await apiService.post('/payments/checkout', {
                                                        plan_config_id: plan.id,
                                                        return_url: window.location.origin + '/student-dashboard?payment=success'
                                                    });
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
                                                    console.error('💥 Error:', e);
                                                    alert("To'lov tizimi bilan bog'lanib bo'lmadi");
                                                }
                                            }}
                                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2.5 rounded-xl font-bold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md flex items-center justify-center gap-2"
                                        >
                                            💳 To'lov qilish — {plan.price.toLocaleString()} UZS
                                        </button>
                                    )}
                                </div>
                            ))}
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
