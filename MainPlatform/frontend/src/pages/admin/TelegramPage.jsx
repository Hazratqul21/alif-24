import { useEffect, useState } from 'react';
import { Search, Send } from 'lucide-react';
import adminService from '../../services/adminService';

export default function TelegramPage() {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => { loadUsers(); }, [search]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const params = {};
            if (search) params.search = search;
            const { data } = await adminService.getTelegramUsers(params);
            setUsers(data.users || []);
            setTotal(data.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Telegram foydalanuvchilari</h1>
                <p className="text-gray-500 text-sm">{total} ta ulangan</p>
            </div>

            <div className="relative mb-4 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    placeholder="Tel raqam yoki username..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>
            ) : users.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">Ma'lumot topilmadi</div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {users.map(u => (
                        <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                    <Send className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-medium truncate">@{u.telegram_username || '—'}</p>
                                    <p className="text-gray-500 text-xs">{u.phone || '—'}</p>
                                </div>
                            </div>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Chat ID</span>
                                    <span className="text-gray-300 font-mono">{u.telegram_chat_id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Bildirishnoma</span>
                                    <span className={u.notifications_enabled ? 'text-green-400' : 'text-red-400'}>
                                        {u.notifications_enabled ? '✅ Yoqilgan' : '❌ O\'chirilgan'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Qo'shilgan</span>
                                    <span className="text-gray-300">{u.created_at?.split('T')[0]}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
