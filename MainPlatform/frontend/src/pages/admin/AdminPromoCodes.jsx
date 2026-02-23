import { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, X, Edit2, Copy, Gift, Percent, Calendar as CalendarIcon, Users } from 'lucide-react';
import adminService from '../../services/adminService';

export default function AdminPromoCodes() {
    const [codes, setCodes] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editCode, setEditCode] = useState(null);
    const [notification, setNotification] = useState(null);

    const defaultForm = {
        code: '', description: '', promo_type: 'free_days',
        discount_percent: 0, free_days_count: 14, plan_config_id: '',
        max_uses: 0, max_uses_per_user: 1, is_active: true,
        starts_at: '', expires_at: '',
    };
    const [form, setForm] = useState(defaultForm);

    const notify = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [codesRes, plansRes] = await Promise.allSettled([
                adminService.getPromoCodes(),
                adminService.getSubscriptionPlans(),
            ]);
            if (codesRes.status === 'fulfilled') setCodes(codesRes.value?.data?.promo_codes || codesRes.value?.promo_codes || []);
            if (plansRes.status === 'fulfilled') setPlans(plansRes.value?.data?.plans || plansRes.value?.plans || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        try {
            const payload = { ...form, code: form.code.toUpperCase() };
            if (!payload.starts_at) delete payload.starts_at;
            if (!payload.expires_at) delete payload.expires_at;
            if (!payload.plan_config_id) delete payload.plan_config_id;

            if (editCode) {
                const { code, ...updateData } = payload;
                await adminService.updatePromoCode(editCode.id, updateData);
                notify('success', 'Promocode yangilandi');
            } else {
                await adminService.createPromoCode(payload);
                notify('success', 'Promocode yaratildi');
            }
            setShowModal(false);
            setEditCode(null);
            setForm(defaultForm);
            loadAll();
        } catch (e) {
            notify('error', e.response?.data?.detail || e.message || 'Xatolik');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Bu promocodeni o'chirmoqchimisiz?")) return;
        try {
            await adminService.deletePromoCode(id);
            notify('success', "Promocode o'chirildi");
            loadAll();
        } catch (e) {
            notify('error', e.response?.data?.detail || e.message || 'Xatolik');
        }
    };

    const openEdit = (code) => {
        setEditCode(code);
        setForm({
            code: code.code, description: code.description || '',
            promo_type: code.promo_type, discount_percent: code.discount_percent,
            free_days_count: code.free_days_count, plan_config_id: code.plan_config_id || '',
            max_uses: code.max_uses, max_uses_per_user: code.max_uses_per_user,
            is_active: code.is_active,
            starts_at: code.starts_at ? code.starts_at.split('T')[0] : '',
            expires_at: code.expires_at ? code.expires_at.split('T')[0] : '',
        });
        setShowModal(true);
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        notify('success', `"${code}" nusxalandi`);
    };

    const typeLabel = { discount: 'Chegirma', free_days: 'Bepul kunlar', plan: 'Plan berish' };
    const typeColor = { discount: 'bg-amber-500/10 text-amber-400', free_days: 'bg-blue-500/10 text-blue-400', plan: 'bg-emerald-500/10 text-emerald-400' };
    const typeIcon = { discount: Percent, free_days: Gift, plan: Tag };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div>
            {notification && (
                <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {notification.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Tag className="w-6 h-6 text-amber-400" /> Promocodlar
                    </h1>
                    <p className="text-gray-500 text-sm">Chegirma, bepul kunlar va plan beradigan kodlar</p>
                </div>
                <button onClick={() => { setEditCode(null); setForm(defaultForm); setShowModal(true); }}
                    className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-700 transition">
                    <Plus size={16} /> Yangi promocode
                </button>
            </div>

            {/* List */}
            {codes.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                    <Tag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">Hozircha promocode yo'q</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {codes.map(code => {
                        const TypeIcon = typeIcon[code.promo_type] || Tag;
                        return (
                            <div key={code.id} className={`bg-gray-900 border rounded-2xl p-5 ${code.is_active ? 'border-gray-800' : 'border-red-500/20 opacity-60'}`}>
                                {/* Top */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold text-white font-mono tracking-wider">{code.code}</span>
                                        <button onClick={() => copyCode(code.code)} className="text-gray-600 hover:text-gray-300 transition"><Copy size={14} /></button>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEdit(code)} className="p-2 text-gray-500 hover:text-blue-400"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(code.id)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                {/* Type badge */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${typeColor[code.promo_type]}`}>
                                        <TypeIcon size={12} /> {typeLabel[code.promo_type]}
                                    </span>
                                    {!code.is_active && <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-lg text-xs">Nofaol</span>}
                                </div>

                                {/* Value */}
                                <div className="text-lg font-bold text-white mb-2">
                                    {code.promo_type === 'discount' && `${code.discount_percent}% chegirma`}
                                    {code.promo_type === 'free_days' && `${code.free_days_count} kun bepul`}
                                    {code.promo_type === 'plan' && 'Plan berish'}
                                </div>

                                {code.description && <p className="text-gray-500 text-sm mb-3">{code.description}</p>}

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-800 pt-3">
                                    <span className="flex items-center gap-1"><Users size={12} /> {code.current_uses}/{code.max_uses || '∞'}</span>
                                    {code.expires_at && (
                                        <span className="flex items-center gap-1"><CalendarIcon size={12} /> {new Date(code.expires_at).toLocaleDateString('uz')}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-white">{editCode ? 'Promocode tahrirlash' : 'Yangi promocode'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            {/* Code */}
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Kod</label>
                                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    disabled={!!editCode}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono tracking-wider focus:outline-none focus:border-amber-500 disabled:opacity-50 uppercase"
                                    placeholder="ALIF2026" />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Tavsif</label>
                                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                                    placeholder="Yangi foydalanuvchilar uchun" />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Turi</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['free_days', 'discount', 'plan'].map(t => (
                                        <button key={t} onClick={() => setForm({ ...form, promo_type: t })}
                                            className={`py-2.5 rounded-xl text-xs font-medium transition border ${form.promo_type === t ? 'bg-amber-600 text-white border-amber-600' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'}`}>
                                            {typeLabel[t]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Type-specific fields */}
                            {form.promo_type === 'discount' && (
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Chegirma (%)</label>
                                    <input type="number" value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                                        min="1" max="100" />
                                </div>
                            )}
                            {form.promo_type === 'free_days' && (
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Bepul kunlar soni</label>
                                    <input type="number" value={form.free_days_count} onChange={e => setForm({ ...form, free_days_count: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                                        min="1" />
                                </div>
                            )}
                            {form.promo_type === 'plan' && (
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Plan tanlash</label>
                                    <select value={form.plan_config_id} onChange={e => setForm({ ...form, plan_config_id: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500">
                                        <option value="">Plan tanlang...</option>
                                        {plans.filter(p => p.is_active).map(p => (
                                            <option key={p.id} value={p.id}>{p.name} — {p.price?.toLocaleString()} UZS</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Limits */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Jami limit (0=cheksiz)</label>
                                    <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Har user uchun</label>
                                    <input type="number" value={form.max_uses_per_user} onChange={e => setForm({ ...form, max_uses_per_user: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Boshlanish (ixtiyoriy)</label>
                                    <input type="date" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs mb-1 block">Tugash (ixtiyoriy)</label>
                                    <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                                </div>
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center gap-3">
                                <label className="text-gray-400 text-sm">Faol:</label>
                                <button onClick={() => setForm({ ...form, is_active: !form.is_active })}
                                    className={`w-10 h-6 rounded-full transition ${form.is_active ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform ${form.is_active ? 'translate-x-4' : ''}`} />
                                </button>
                            </div>

                            <button onClick={handleSave}
                                className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition">
                                {editCode ? 'Saqlash' : 'Yaratish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
