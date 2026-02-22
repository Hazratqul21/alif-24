import { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import adminService from '../../services/adminService';

const ROLES = ['student', 'teacher', 'parent', 'moderator', 'organization'];
const STATUSES = ['active', 'pending', 'suspended', 'deleted'];

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [offset, setOffset] = useState(0);
    const limit = 20;

    // Modal states
    const [editModal, setEditModal] = useState(null);
    const [createModal, setCreateModal] = useState(false);
    const [detailModal, setDetailModal] = useState(null);
    const [saving, setSaving] = useState(false);

    // Create form
    const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '', phone: '', role: 'student', password: '' });

    useEffect(() => {
        loadUsers();
    }, [search, roleFilter, statusFilter, offset]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const params = { limit, offset };
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;
            if (statusFilter) params.status = statusFilter;
            const { data } = await adminService.getUsers(params);
            setUsers(data.users);
            setTotal(data.total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!editModal) return;
        try {
            setSaving(true);
            await adminService.updateUser(editModal.id, editModal);
            setEditModal(null);
            loadUsers();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async () => {
        try {
            setSaving(true);
            await adminService.createUser(newUser);
            setCreateModal(false);
            setNewUser({ first_name: '', last_name: '', email: '', phone: '', role: 'student', password: '' });
            loadUsers();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const canDelete = adminService.hasPermission('all');

    const handleDelete = async (id) => {
        if (!canDelete) {
            alert("Foydalanuvchini o'chirish faqat super admin uchun!");
            return;
        }
        if (!confirm("Rostdan o'chirmoqchimisiz? Telegram ham uziladi.")) return;
        try {
            const { data } = await adminService.deleteUser(id);
            alert(data.message || "Foydalanuvchi o'chirildi");
            loadUsers();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        }
    };

    const viewDetail = async (id) => {
        try {
            const { data } = await adminService.getUser(id);
            setDetailModal(data);
        } catch (err) {
            console.error(err);
        }
    };

    const roleBadge = (role) => {
        const colors = {
            student: 'bg-blue-500/10 text-blue-400',
            teacher: 'bg-purple-500/10 text-purple-400',
            parent: 'bg-amber-500/10 text-amber-400',
            moderator: 'bg-red-500/10 text-red-400',
            organization: 'bg-green-500/10 text-green-400',
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] || 'bg-gray-700 text-gray-300'}`}>{role}</span>;
    };

    const statusBadge = (status) => {
        const colors = {
            active: 'bg-green-500/10 text-green-400',
            pending: 'bg-yellow-500/10 text-yellow-400',
            suspended: 'bg-red-500/10 text-red-400',
            deleted: 'bg-gray-700 text-gray-400',
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-700 text-gray-300'}`}>{status}</span>;
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Foydalanuvchilar</h1>
                    <p className="text-gray-500 text-sm">{total} ta topildi</p>
                </div>
                <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
                    <Plus className="w-4 h-4" /> Yangi
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Qidirish..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                </div>
                <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setOffset(0); }} className="px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-gray-300 text-sm focus:outline-none">
                    <option value="">Barcha rollar</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} className="px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-gray-300 text-sm focus:outline-none">
                    <option value="">Barcha statuslar</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left px-4 py-3 text-gray-400 font-medium">ID</th>
                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Ism</th>
                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Email / Tel</th>
                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Rol</th>
                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                                <th className="text-left px-4 py-3 text-gray-400 font-medium">Sana</th>
                                <th className="text-right px-4 py-3 text-gray-400 font-medium">Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-500">Yuklanmoqda...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-500">Ma'lumot topilmadi</td></tr>
                            ) : users.map(u => (
                                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{u.id}</td>
                                    <td className="px-4 py-3 text-white font-medium">{u.first_name} {u.last_name}</td>
                                    <td className="px-4 py-3 text-gray-400 text-xs">{u.email || u.phone || '—'}</td>
                                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                                    <td className="px-4 py-3">{statusBadge(u.status)}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{u.created_at?.split('T')[0]}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => viewDetail(u.id)} className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors"><Eye className="w-4 h-4" /></button>
                                            <button onClick={() => setEditModal({ ...u })} className="p-1.5 text-gray-500 hover:text-emerald-400 transition-colors"><Pencil className="w-4 h-4" /></button>
                                            {canDelete && <button onClick={() => handleDelete(u.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > limit && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                        <span className="text-gray-500 text-xs">{offset + 1}–{Math.min(offset + limit, total)} / {total}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total} className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editModal && (
                <Modal title="Tahrirlash" onClose={() => setEditModal(null)}>
                    <div className="space-y-3">
                        <Input label="Ism" value={editModal.first_name || ''} onChange={(v) => setEditModal({ ...editModal, first_name: v })} />
                        <Input label="Familiya" value={editModal.last_name || ''} onChange={(v) => setEditModal({ ...editModal, last_name: v })} />
                        <Input label="Email" value={editModal.email || ''} onChange={(v) => setEditModal({ ...editModal, email: v })} />
                        <Input label="Telefon" value={editModal.phone || ''} onChange={(v) => setEditModal({ ...editModal, phone: v })} />
                        <Select label="Rol" value={editModal.role || ''} options={ROLES} onChange={(v) => setEditModal({ ...editModal, role: v })} />
                        <Select label="Status" value={editModal.status || ''} options={STATUSES} onChange={(v) => setEditModal({ ...editModal, status: v })} />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setEditModal(null)} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                        <button onClick={handleUpdate} disabled={saving} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Create Modal */}
            {createModal && (
                <Modal title="Yangi foydalanuvchi" onClose={() => setCreateModal(false)}>
                    <div className="space-y-3">
                        <Input label="Ism" value={newUser.first_name} onChange={(v) => setNewUser({ ...newUser, first_name: v })} />
                        <Input label="Familiya" value={newUser.last_name} onChange={(v) => setNewUser({ ...newUser, last_name: v })} />
                        <Input label="Email" value={newUser.email} onChange={(v) => setNewUser({ ...newUser, email: v })} />
                        <Input label="Telefon" value={newUser.phone} onChange={(v) => setNewUser({ ...newUser, phone: v })} />
                        <Input label="Parol" value={newUser.password} onChange={(v) => setNewUser({ ...newUser, password: v })} type="password" />
                        <Select label="Rol" value={newUser.role} options={ROLES} onChange={(v) => setNewUser({ ...newUser, role: v })} />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setCreateModal(false)} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                        <button onClick={handleCreate} disabled={saving || !newUser.first_name || !newUser.last_name} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                            {saving ? 'Yaratilmoqda...' : 'Yaratish'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Detail Modal */}
            {detailModal && (
                <Modal title="Foydalanuvchi tafsilotlari" onClose={() => setDetailModal(null)}>
                    <div className="space-y-2 text-sm">
                        {Object.entries(detailModal.user || {}).map(([k, v]) => (
                            <div key={k} className="flex justify-between py-1.5 border-b border-gray-800">
                                <span className="text-gray-400">{k}</span>
                                <span className="text-white font-mono text-xs">{v ?? '—'}</span>
                            </div>
                        ))}
                        {detailModal.profile && (
                            <>
                                <p className="text-gray-400 font-medium mt-4 mb-2">Profil:</p>
                                {Object.entries(detailModal.profile).map(([k, v]) => (
                                    <div key={k} className="flex justify-between py-1.5 border-b border-gray-800">
                                        <span className="text-gray-400">{k}</span>
                                        <span className="text-white font-mono text-xs">{v ?? '—'}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}

// Reusable UI components
const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {children}
        </div>
    </div>
);

const Input = ({ label, value, onChange, type = 'text' }) => (
    <div>
        <label className="text-gray-400 text-xs mb-1 block">{label}</label>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
    </div>
);

const Select = ({ label, value, options, onChange }) => (
    <div>
        <label className="text-gray-400 text-xs mb-1 block">{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);
