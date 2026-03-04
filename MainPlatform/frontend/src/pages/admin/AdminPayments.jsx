import { useEffect, useState } from 'react';
import { CreditCard, Plus, Settings, Trash2, Edit2, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, TrendingUp, RefreshCw, Shield } from 'lucide-react';
import adminService from '../../services/adminService';

const PROVIDERS = [
    { value: 'payme', label: 'Payme', color: '#00CDAC', icon: '💳' },
    { value: 'click', label: 'Click', color: '#0066FF', icon: '🔵' },
    { value: 'uzum', label: 'Uzum Bank', color: '#7C3AED', icon: '🏦' },
];

export default function AdminPayments() {
    const [tab, setTab] = useState('gateways');
    const [gateways, setGateways] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState(null);
    const [totalTxn, setTotalTxn] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editGw, setEditGw] = useState(null);
    const [form, setForm] = useState({ provider: 'payme', name: '', description: '', merchant_id: '', secret_key: '', service_id: '', is_active: true, is_test_mode: true, is_default: false, sort_order: 0 });

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [gwRes, statsRes] = await Promise.allSettled([
                adminService.getPaymentGateways(),
                adminService.getPaymentStats(),
            ]);
            if (gwRes.status === 'fulfilled') setGateways((gwRes.value?.data || gwRes.value)?.gateways || []);
            if (statsRes.status === 'fulfilled') setStats((statsRes.value?.data || statsRes.value));
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const loadTransactions = async () => {
        try {
            const res = await adminService.getPaymentTransactions({ limit: 50 });
            const data = res?.data || res;
            setTransactions(data?.transactions || []);
            setTotalTxn(data?.total || 0);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { if (tab === 'transactions') loadTransactions(); }, [tab]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editGw) {
                await adminService.updatePaymentGateway(editGw.id, form);
            } else {
                await adminService.createPaymentGateway(form);
            }
            setShowForm(false);
            setEditGw(null);
            setForm({ provider: 'payme', name: '', description: '', merchant_id: '', secret_key: '', service_id: '', is_active: true, is_test_mode: true, is_default: false, sort_order: 0 });
            loadAll();
        } catch (e) {
            alert('Xatolik: ' + (e?.response?.data?.detail || e.message));
        }
    };

    const handleEdit = (gw) => {
        setEditGw(gw);
        setForm({
            provider: gw.provider, name: gw.name, description: gw.description || '',
            merchant_id: '', secret_key: '', service_id: '',
            is_active: gw.is_active, is_test_mode: gw.is_test_mode, is_default: gw.is_default,
            sort_order: gw.sort_order || 0,
        });
        setShowForm(true);
    };

    const handleDelete = async (gw) => {
        if (!confirm(`"${gw.name}" gateway'ni o'chirishni xohlaysizmi?`)) return;
        try { await adminService.deletePaymentGateway(gw.id); loadAll(); }
        catch (e) { alert('Xatolik'); }
    };

    const handleToggle = async (gw, field) => {
        try { await adminService.updatePaymentGateway(gw.id, { [field]: !gw[field] }); loadAll(); }
        catch (e) { alert('Xatolik'); }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2"><CreditCard className="w-6 h-6 text-emerald-400" /> To'lov tizimi</h1>
                    <p className="text-gray-500 text-sm">Gateway'lar, tranzaksiyalar, statistika</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadAll} className="flex items-center gap-2 bg-gray-800 text-gray-300 px-4 py-2 rounded-xl text-sm hover:bg-gray-700"><RefreshCw size={14} /> Yangilash</button>
                    <button onClick={() => { setEditGw(null); setForm({ provider: 'payme', name: '', description: '', merchant_id: '', secret_key: '', service_id: '', is_active: true, is_test_mode: true, is_default: false, sort_order: 0 }); setShowForm(true); }} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-emerald-700"><Plus size={14} /> Gateway qo'shish</button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl w-fit">
                {[
                    { key: 'gateways', label: "Gateway'lar", icon: Settings },
                    { key: 'transactions', label: "Tranzaksiyalar", icon: CreditCard },
                    { key: 'stats', label: 'Statistika', icon: TrendingUp },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* GATEWAYS TAB */}
            {tab === 'gateways' && (
                <div className="space-y-4">
                    {gateways.length === 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
                            <Shield size={48} className="text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400 mb-2">Hech qanday to'lov gateway sozlanmagan</p>
                            <p className="text-gray-500 text-sm">Yuqoridagi "Gateway qo'shish" tugmasini bosing</p>
                        </div>
                    )}
                    {gateways.map(gw => {
                        const prov = PROVIDERS.find(p => p.value === gw.provider) || PROVIDERS[0];
                        return (
                            <div key={gw.id} className={`bg-gray-900 border rounded-2xl p-5 ${gw.is_active ? 'border-gray-800' : 'border-red-500/20 opacity-60'}`}>
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{prov.icon}</span>
                                        <div>
                                            <h3 className="text-white font-bold flex items-center gap-2">
                                                {gw.name}
                                                {gw.is_default && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">DEFAULT</span>}
                                                {gw.is_test_mode && <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">TEST</span>}
                                            </h3>
                                            <p className="text-gray-500 text-xs">{gw.provider.toUpperCase()} • Merchant: {gw.merchant_id || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleToggle(gw, 'is_active')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${gw.is_active ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}>
                                            {gw.is_active ? <><CheckCircle size={12} className="inline mr-1" />Faol</> : <><XCircle size={12} className="inline mr-1" />O'chiq</>}
                                        </button>
                                        <button onClick={() => handleToggle(gw, 'is_test_mode')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${gw.is_test_mode ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {gw.is_test_mode ? 'Test' : 'Production'}
                                        </button>
                                        <button onClick={() => handleToggle(gw, 'is_default')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${gw.is_default ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}> {gw.is_default ? '⭐ Default' : 'Default qilish'}</button>
                                        <button onClick={() => handleEdit(gw)} className="bg-blue-500/10 text-blue-400 p-2 rounded-lg hover:bg-blue-500/20"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(gw)} className="bg-red-500/10 text-red-400 p-2 rounded-lg hover:bg-red-500/20"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                {gw.webhook_url && <p className="text-gray-600 text-[10px] mt-2 font-mono">Webhook: {gw.webhook_url}</p>}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TRANSACTIONS TAB */}
            {tab === 'transactions' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                        <h3 className="text-white font-bold">Tranzaksiyalar ({totalTxn})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="text-gray-500 text-left border-b border-gray-800">
                                <th className="px-4 py-2">Foydalanuvchi</th>
                                <th className="px-4 py-2">Summa</th>
                                <th className="px-4 py-2">Provider</th>
                                <th className="px-4 py-2">Holat</th>
                                <th className="px-4 py-2">Vaqt</th>
                            </tr></thead>
                            <tbody>
                                {transactions.map(txn => (
                                    <tr key={txn.id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                                        <td className="px-4 py-2.5">
                                            <span className="text-white font-medium">{txn.user_name || txn.user_id}</span>
                                            {txn.user_phone && <span className="text-gray-500 text-xs ml-2">{txn.user_phone}</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-white font-bold">{(txn.amount || 0).toLocaleString()} <span className="text-gray-500 text-xs">UZS</span></td>
                                        <td className="px-4 py-2.5"><span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400">{txn.provider}</span></td>
                                        <td className="px-4 py-2.5">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${txn.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : txn.status === 'pending' || txn.status === 'processing' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {txn.status === 'completed' ? '✅ Muvaffaqiyatli' : txn.status === 'pending' ? '⏳ Kutilmoqda' : txn.status === 'processing' ? '🔄 Jarayonda' : txn.status === 'failed' ? '❌ Muvaffaqiyatsiz' : txn.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-500 text-xs">{txn.created_at ? new Date(txn.created_at).toLocaleString('uz') : '—'}</td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-500">Hali tranzaksiyalar yo'q</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* STATS TAB */}
            {tab === 'stats' && stats && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <p className="text-gray-400 text-sm mb-1">Jami daromad</p>
                            <p className="text-2xl font-bold text-emerald-400">{(stats.total_revenue || 0).toLocaleString()} <span className="text-sm text-gray-500">UZS</span></p>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <p className="text-gray-400 text-sm mb-1">Oylik daromad</p>
                            <p className="text-2xl font-bold text-blue-400">{(stats.monthly_revenue || 0).toLocaleString()} <span className="text-sm text-gray-500">UZS</span></p>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <p className="text-gray-400 text-sm mb-1">Muvaffaqiyat darajasi</p>
                            <p className="text-2xl font-bold text-white">{stats.success_rate || 0}%</p>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <p className="text-gray-400 text-sm mb-1">Jami tranzaksiyalar</p>
                            <p className="text-2xl font-bold text-white">{stats.total_transactions || 0}</p>
                            <p className="text-gray-500 text-xs mt-1">✅ {stats.completed || 0} | ⏳ {stats.pending || 0} | ❌ {stats.failed || 0}</p>
                        </div>
                    </div>
                    {Object.keys(stats.by_provider || {}).length > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-4">Provider bo'yicha</h3>
                            <div className="space-y-3">
                                {Object.entries(stats.by_provider).map(([prov, data]) => {
                                    const provInfo = PROVIDERS.find(p => p.value === prov) || { icon: '💳', label: prov };
                                    return (
                                        <div key={prov} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{provInfo.icon}</span>
                                                <span className="text-white font-medium">{provInfo.label}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-emerald-400 font-bold">{data.count} ta to'lov</span>
                                                <span className="text-gray-400">{(data.revenue || 0).toLocaleString()} UZS</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Gateway Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
                    <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-4">{editGw ? 'Gateway yangilash' : 'Yangi Gateway'}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            {!editGw && (
                                <div>
                                    <label className="text-gray-400 text-sm block mb-1">Provider</label>
                                    <div className="flex gap-2">
                                        {PROVIDERS.map(p => (
                                            <button key={p.value} type="button" onClick={() => setForm({ ...form, provider: p.value, name: form.name || p.label })}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition ${form.provider === p.value ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                                                <span>{p.icon}</span> {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div><label className="text-gray-400 text-sm block mb-1">Nomi</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 border border-gray-700 text-sm" required /></div>
                            <div><label className="text-gray-400 text-sm block mb-1">Merchant ID</label><input value={form.merchant_id} onChange={e => setForm({ ...form, merchant_id: e.target.value })} className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 border border-gray-700 text-sm" placeholder={editGw ? 'O\'zgartirish uchun yangi qiymat kiriting' : ''} /></div>
                            <div><label className="text-gray-400 text-sm block mb-1">Secret Key</label><input type="password" value={form.secret_key} onChange={e => setForm({ ...form, secret_key: e.target.value })} className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 border border-gray-700 text-sm" placeholder={editGw ? 'O\'zgartirish uchun yangi qiymat kiriting' : ''} /></div>
                            {(form.provider === 'click') && <div><label className="text-gray-400 text-sm block mb-1">Service ID</label><input value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 border border-gray-700 text-sm" /></div>}
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer"><input type="checkbox" checked={form.is_test_mode} onChange={() => setForm({ ...form, is_test_mode: !form.is_test_mode })} className="rounded" /> Test rejimi</label>
                                <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer"><input type="checkbox" checked={form.is_default} onChange={() => setForm({ ...form, is_default: !form.is_default })} className="rounded" /> Default</label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 text-gray-300 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700">Bekor qilish</button>
                                <button type="submit" className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700">{editGw ? 'Yangilash' : 'Yaratish'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
