import { useEffect, useState } from 'react';
import { CreditCard, Plus, Trash2, X, Users, TrendingUp, Edit2, UserPlus, Search, Ban } from 'lucide-react';
import adminService from '../../services/adminService';

export default function AdminSubscriptions() {
    const [tab, setTab] = useState('stats'); // stats | plans | users
    const [stats, setStats] = useState(null);
    const [plans, setPlans] = useState([]);
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [editPlan, setEditPlan] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignUserId, setAssignUserId] = useState('');
    const [assignPlanId, setAssignPlanId] = useState('');
    const [assignAmount, setAssignAmount] = useState(0);
    const [assignNotes, setAssignNotes] = useState('');
    const [notification, setNotification] = useState(null);

    const [planForm, setPlanForm] = useState({
        name: '', slug: '', description: '', price: 0,
        duration_days: 30, max_children: 1, is_active: true, sort_order: 0,
        features: {},
    });

    const notify = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [statsRes, plansRes, subsRes] = await Promise.allSettled([
                adminService.getSubscriptionStats(),
                adminService.getSubscriptionPlans(),
                adminService.getSubscriptions(),
            ]);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value?.data || statsRes.value);
            if (plansRes.status === 'fulfilled') setPlans(plansRes.value?.data?.plans || plansRes.value?.plans || []);
            if (subsRes.status === 'fulfilled') setSubs(subsRes.value?.data?.subscriptions || subsRes.value?.subscriptions || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSavePlan = async () => {
        try {
            if (editPlan) {
                await adminService.updateSubscriptionPlan(editPlan.id, planForm);
                notify('success', 'Plan yangilandi');
            } else {
                await adminService.createSubscriptionPlan(planForm);
                notify('success', 'Plan yaratildi');
            }
            setShowPlanModal(false);
            setEditPlan(null);
            setPlanForm({ name: '', slug: '', description: '', price: 0, duration_days: 30, max_children: 1, is_active: true, sort_order: 0, features: {} });
            loadAll();
        } catch (e) {
            notify('error', e.response?.data?.detail || e.message || 'Xatolik');
        }
    };

    const handleDeletePlan = async (planId) => {
        if (!confirm("Bu planni o'chirmoqchimisiz?")) return;
        try {
            await adminService.deleteSubscriptionPlan(planId);
            notify('success', "Plan o'chirildi");
            loadAll();
        } catch (e) {
            notify('error', e.response?.data?.detail || e.message || 'Xatolik');
        }
    };

    const handleAssign = async () => {
        if (!assignUserId || !assignPlanId) return notify('error', 'User ID va Plan tanlang');
        try {
            const res = await adminService.assignSubscription(assignUserId, {
                plan_config_id: assignPlanId,
                amount_paid: assignAmount,
                notes: assignNotes || null,
            });
            notify('success', res?.data?.message || res?.message || 'Obuna berildi');
            setShowAssignModal(false);
            setAssignUserId('');
            setAssignPlanId('');
            setAssignAmount(0);
            setAssignNotes('');
            loadAll();
        } catch (e) {
            notify('error', e.response?.data?.detail || e.message || 'Xatolik');
        }
    };

    const handleCancel = async (userId) => {
        if (!confirm("Obunani bekor qilmoqchimisiz?")) return;
        try {
            await adminService.cancelSubscription(userId);
            notify('success', 'Obuna bekor qilindi');
            loadAll();
        } catch (e) {
            notify('error', e.response?.data?.detail || e.message || 'Xatolik');
        }
    };

    const openEdit = (plan) => {
        setEditPlan(plan);
        setPlanForm({
            name: plan.name, slug: plan.slug, description: plan.description || '',
            price: plan.price, duration_days: plan.duration_days, max_children: plan.max_children,
            is_active: plan.is_active, sort_order: plan.sort_order, features: plan.features || {},
        });
        setShowPlanModal(true);
    };

    const formatPrice = (price) => {
        if (!price) return 'Bepul';
        return price.toLocaleString() + ' UZS';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div>
            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {notification.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-emerald-400" /> Obunalar
                    </h1>
                    <p className="text-gray-500 text-sm">Plan sozlamalari va foydalanuvchi obunalari</p>
                </div>
                <button onClick={() => setShowAssignModal(true)}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition">
                    <UserPlus size={16} /> Obuna berish
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl w-fit">
                {[
                    { key: 'stats', label: 'Statistika', icon: TrendingUp },
                    { key: 'plans', label: 'Planlar', icon: CreditCard },
                    { key: 'users', label: 'Obunalar', icon: Users },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* === STATS TAB === */}
            {tab === 'stats' && stats && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <p className="text-gray-400 text-sm mb-1">Jami foydalanuvchilar</p>
                            <p className="text-3xl font-bold text-white">{stats.total_users?.toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <p className="text-gray-400 text-sm mb-1">Faol obunalar</p>
                            <p className="text-3xl font-bold text-emerald-400">{stats.total_active_subscriptions}</p>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <p className="text-gray-400 text-sm mb-1">Bepul foydalanuvchilar</p>
                            <p className="text-3xl font-bold text-gray-400">{stats.free_users?.toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-900 border border-emerald-500/20 rounded-2xl p-5">
                            <p className="text-emerald-400 text-sm mb-1">Jami daromad</p>
                            <p className="text-3xl font-bold text-emerald-400">{stats.total_revenue?.toLocaleString()} <span className="text-lg">UZS</span></p>
                        </div>
                    </div>

                    {stats.plans?.length > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-4">Planlar bo'yicha</h3>
                            <div className="space-y-3">
                                {stats.plans.map(p => (
                                    <div key={p.plan_id} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-4">
                                        <div>
                                            <span className="text-white font-medium">{p.plan_name}</span>
                                            <span className="text-gray-500 text-sm ml-2">{formatPrice(p.plan_price)}/oy</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-emerald-400 font-bold">{p.active_count} ta faol</span>
                                            <span className="text-gray-400">{p.total_revenue?.toLocaleString()} UZS</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* === PLANS TAB === */}
            {tab === 'plans' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => { setEditPlan(null); setPlanForm({ name: '', slug: '', description: '', price: 0, duration_days: 30, max_children: 1, is_active: true, sort_order: 0, features: {} }); setShowPlanModal(true); }}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                            <Plus size={16} /> Yangi plan
                        </button>
                    </div>

                    {plans.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                            <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500">Hozircha plan yaratilmagan</p>
                            <p className="text-gray-600 text-sm mt-1">"Yangi plan" tugmasini bosib boshlang</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {plans.map(plan => (
                                <div key={plan.id} className={`bg-gray-900 border rounded-2xl p-5 ${plan.is_active ? 'border-gray-800' : 'border-red-500/20 opacity-60'}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                                            <span className="text-gray-500 text-xs font-mono">{plan.slug}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => openEdit(plan)} className="p-2 text-gray-500 hover:text-blue-400 transition"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDeletePlan(plan.id)} className="p-2 text-gray-500 hover:text-red-400 transition"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-400 mb-2">{formatPrice(plan.price)}<span className="text-sm text-gray-500 font-normal">/{plan.duration_days} kun</span></p>
                                    {plan.description && <p className="text-gray-400 text-sm mb-3">{plan.description}</p>}
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded-lg">{plan.max_children} bola</span>
                                        {!plan.is_active && <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-lg">Nofaol</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* === USERS TAB === */}
            {tab === 'users' && (
                <div>
                    {subs.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500">Hozircha obuna yo'q</p>
                        </div>
                    ) : (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 border-b border-gray-800 text-left">
                                        <th className="px-4 py-3">Foydalanuvchi</th>
                                        <th className="px-4 py-3">Plan</th>
                                        <th className="px-4 py-3">Holat</th>
                                        <th className="px-4 py-3">Muddat</th>
                                        <th className="px-4 py-3">To'lov</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subs.map(sub => (
                                        <tr key={sub.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                            <td className="px-4 py-3">
                                                <span className="text-white font-medium">{sub.user_name}</span>
                                                <br /><span className="text-gray-500 text-xs">{sub.user_phone || sub.user_id}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg text-xs font-medium">{sub.plan_name}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${sub.status === 'active' ? 'bg-green-500/10 text-green-400' : sub.status === 'expired' ? 'bg-gray-500/10 text-gray-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {sub.status === 'active' ? 'Faol' : sub.status === 'expired' ? 'Tugagan' : 'Bekor'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">
                                                {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('uz') : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300">{sub.amount_paid?.toLocaleString()} UZS</td>
                                            <td className="px-4 py-3">
                                                {sub.status === 'active' && (
                                                    <button onClick={() => handleCancel(sub.user_id)}
                                                        className="text-gray-500 hover:text-red-400 transition p-1" title="Bekor qilish">
                                                        <Ban size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* === PLAN MODAL === */}
            {showPlanModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPlanModal(false)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-white">{editPlan ? 'Plan tahrirlash' : 'Yangi plan'}</h3>
                            <button onClick={() => setShowPlanModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Nomi</label>
                                    <input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                                        placeholder="Premium" />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Slug</label>
                                    <input value={planForm.slug} onChange={e => setPlanForm({ ...planForm, slug: e.target.value })}
                                        disabled={!!editPlan}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                                        placeholder="premium" />
                                </div>
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Tavsif</label>
                                <input value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                                    placeholder="Plan tavsifi" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Narx (UZS)</label>
                                    <input type="number" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Muddat (kun)</label>
                                    <input type="number" value={planForm.duration_days} onChange={e => setPlanForm({ ...planForm, duration_days: parseInt(e.target.value) || 30 })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Max bolalar</label>
                                    <input type="number" value={planForm.max_children} onChange={e => setPlanForm({ ...planForm, max_children: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-gray-400 text-sm">Faol:</label>
                                <button onClick={() => setPlanForm({ ...planForm, is_active: !planForm.is_active })}
                                    className={`w-10 h-6 rounded-full transition ${planForm.is_active ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform ${planForm.is_active ? 'translate-x-4' : ''}`} />
                                </button>
                            </div>
                            <button onClick={handleSavePlan}
                                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition">
                                {editPlan ? 'Saqlash' : 'Yaratish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === ASSIGN MODAL === */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-white">Obuna berish</h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Foydalanuvchi ID</label>
                                <input value={assignUserId} onChange={e => setAssignUserId(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                                    placeholder="8 xonalik user ID" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Plan tanlash</label>
                                <select value={assignPlanId} onChange={e => setAssignPlanId(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                                    <option value="">Plan tanlang...</option>
                                    {plans.filter(p => p.is_active).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)}/{p.duration_days} kun</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">To'langan summa (UZS)</label>
                                <input type="number" value={assignAmount} onChange={e => setAssignAmount(parseInt(e.target.value) || 0)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Izoh (ixtiyoriy)</label>
                                <input value={assignNotes} onChange={e => setAssignNotes(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                                    placeholder="Qo'shimcha izoh..." />
                            </div>
                            <button onClick={handleAssign}
                                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition">
                                Obuna berish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
