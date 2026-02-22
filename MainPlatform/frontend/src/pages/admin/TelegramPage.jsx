import { useEffect, useState } from 'react';
import { Search, Send, Users, Bell, UserCheck, Radio, Megaphone, Trophy, Tag, Newspaper, ChevronDown, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import adminService from '../../services/adminService';

const TEMPLATES = [
    {
        id: 'news',
        label: 'Yangilik',
        icon: Newspaper,
        bg: 'bg-blue-500/10',
        iconColor: 'text-blue-400',
        text: `📢 *Yangilik!*\n\nHurmatli foydalanuvchilar!\n\n[Yangilik matni]\n\n🌐 Batafsil: alif24.uz`,
    },
    {
        id: 'discount',
        label: 'Chegirma',
        icon: Tag,
        bg: 'bg-green-500/10',
        iconColor: 'text-green-400',
        text: `🎉 *Maxsus chegirma!*\n\nHurmatli foydalanuvchilar!\n\n🏷 [Chegirma tafsilotlari]\n⏰ Muddat: [sana]\n\n🌐 alif24.uz`,
    },
    {
        id: 'olympiad',
        label: 'Olimpiada',
        icon: Trophy,
        bg: 'bg-amber-500/10',
        iconColor: 'text-amber-400',
        text: `🏆 *Olimpiada e'loni!*\n\nHurmatli o'quvchilar!\n\n📋 Olimpiada: [nomi]\n📅 Sana: [sana]\n⏰ Boshlanish: [vaqt]\n\nRo'yxatdan o'tish: olimp.alif24.uz\n\nOmad tilaymiz! 💪`,
    },
    {
        id: 'maintenance',
        label: 'Texnik',
        icon: AlertCircle,
        bg: 'bg-red-500/10',
        iconColor: 'text-red-400',
        text: `⚙️ *Texnik xizmat*\n\nHurmatli foydalanuvchilar!\n\nPlatformada texnik ishlar olib boriladi.\n📅 [sana] soat [vaqt]\n⏱ Taxminiy muddat: [muddat]\n\nNoqulaylik uchun uzr so'raymiz!`,
    },
];

const FILTER_OPTIONS = [
    { value: 'all', label: 'Hammaga', desc: 'Barcha foydalanuvchilar' },
    { value: 'students', label: 'O\'quvchilar', desc: 'Faqat o\'quvchilarga' },
    { value: 'parents', label: 'Ota-onalar', desc: 'Faqat ota-onalarga' },
    { value: 'teachers', label: 'O\'qituvchilar', desc: 'Faqat o\'qituvchilarga' },
];

export default function TelegramPage() {
    const [activeSection, setActiveSection] = useState('broadcast');
    // Stats
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    // Broadcast
    const [message, setMessage] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [sending, setSending] = useState(false);
    const [broadcastResult, setBroadcastResult] = useState(null);
    // Users
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [usersLoading, setUsersLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        if (activeSection === 'users') loadUsers();
    }, [activeSection, search]);

    const loadStats = async () => {
        try {
            setStatsLoading(true);
            const { data } = await adminService.getTelegramStats();
            setStats(data);
        } catch (err) {
            console.error('Stats error:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            setUsersLoading(true);
            const params = {};
            if (search) params.search = search;
            const { data } = await adminService.getTelegramUsers(params);
            setUsers(data.users || []);
            setTotal(data.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!message.trim()) return;
        if (!confirm(`Xabarni ${FILTER_OPTIONS.find(f => f.value === filterType)?.label || 'hammaga'} yuborishni tasdiqlaysizmi?`)) return;

        try {
            setSending(true);
            setBroadcastResult(null);
            const { data } = await adminService.sendBroadcast({
                message: message.trim(),
                parse_mode: 'Markdown',
                filter_type: filterType,
            });
            setBroadcastResult(data);
            if (data.success) {
                setTimeout(() => setBroadcastResult(null), 8000);
            }
        } catch (err) {
            setBroadcastResult({ success: false, message: err.response?.data?.detail || 'Xatolik yuz berdi' });
        } finally {
            setSending(false);
        }
    };

    const applyTemplate = (template) => {
        setMessage(template.text);
    };

    const statCards = [
        { label: 'Jami foydalanuvchilar', value: stats?.total_telegram_users, icon: Users, bg: 'bg-blue-500/10', text: 'text-blue-400' },
        { label: 'Bildirishnoma yoqilgan', value: stats?.notifications_enabled, icon: Bell, bg: 'bg-green-500/10', text: 'text-green-400' },
        { label: 'Platformaga ulangan', value: stats?.linked_to_platform, icon: UserCheck, bg: 'bg-purple-500/10', text: 'text-purple-400' },
        { label: 'Ulanmagan', value: stats?.unlinked, icon: Radio, bg: 'bg-gray-500/10', text: 'text-gray-400' },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Megaphone className="w-7 h-7 text-blue-400" />
                    Telegram Rassilka
                </h1>
                <p className="text-gray-500 text-sm mt-1">Yangiliklar, chegirmalar va olimpiada sanalari yuborish</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {statCards.map(card => (
                    <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center`}>
                                <card.icon className={`w-4 h-4 ${card.text}`} />
                            </div>
                            <span className="text-gray-500 text-xs">{card.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {statsLoading ? '...' : (card.value ?? 0)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Section tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveSection('broadcast')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeSection === 'broadcast' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white bg-gray-900 border border-gray-800'}`}
                >
                    <Send className="w-4 h-4 inline mr-2" />Rassilka
                </button>
                <button
                    onClick={() => setActiveSection('users')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeSection === 'users' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white bg-gray-900 border border-gray-800'}`}
                >
                    <Users className="w-4 h-4 inline mr-2" />Foydalanuvchilar ({total || stats?.total_telegram_users || 0})
                </button>
            </div>

            {/* ===== BROADCAST SECTION ===== */}
            {activeSection === 'broadcast' && (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Message composer */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Send className="w-5 h-5 text-blue-400" /> Xabar yozish
                            </h3>

                            {/* Filter */}
                            <div className="mb-4">
                                <label className="text-gray-400 text-xs font-medium mb-2 block">Kimga yuborish</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {FILTER_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setFilterType(opt.value)}
                                            className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${filterType === opt.value
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-600'
                                            }`}
                                        >
                                            {opt.label}
                                            <span className="block text-[10px] text-gray-500 mt-0.5">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message textarea */}
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={10}
                                placeholder="Xabar matnini kiriting...&#10;&#10;Markdown formatlash:&#10;*qalin* _kursiv_ `kod`"
                                className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-y min-h-[200px]"
                            />

                            <div className="flex items-center justify-between mt-4">
                                <span className="text-gray-500 text-xs">{message.length} belgi | Markdown qo'llab-quvvatlanadi</span>
                                <button
                                    onClick={handleSendBroadcast}
                                    disabled={!message.trim() || sending}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                >
                                    {sending ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Yuborilmoqda...</>
                                    ) : (
                                        <><Send className="w-4 h-4" /> Yuborish</>
                                    )}
                                </button>
                            </div>

                            {/* Broadcast result */}
                            {broadcastResult && (
                                <div className={`mt-4 p-4 rounded-xl border ${broadcastResult.success
                                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        {broadcastResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {broadcastResult.message}
                                    </div>
                                    {broadcastResult.success && broadcastResult.total > 0 && (
                                        <p className="text-xs mt-1 opacity-70">
                                            Yuborildi: {broadcastResult.sent}/{broadcastResult.total} | Xatolik: {broadcastResult.failed}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Templates sidebar */}
                    <div className="space-y-3">
                        <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Tayyor shablonlar</h3>
                        {TEMPLATES.map(tmpl => (
                            <button
                                key={tmpl.id}
                                onClick={() => applyTemplate(tmpl)}
                                className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-left hover:border-gray-700 transition-colors group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-8 h-8 ${tmpl.bg} rounded-lg flex items-center justify-center`}>
                                        <tmpl.icon className={`w-4 h-4 ${tmpl.iconColor}`} />
                                    </div>
                                    <span className="text-white text-sm font-medium group-hover:text-blue-400 transition-colors">{tmpl.label}</span>
                                </div>
                                <p className="text-gray-500 text-xs line-clamp-2">{tmpl.text.replace(/\*/g, '').replace(/\n/g, ' ').slice(0, 80)}...</p>
                            </button>
                        ))}

                        {/* Preview */}
                        {message && (
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                                <h4 className="text-gray-400 text-xs font-medium mb-2">Ko'rinish</h4>
                                <div className="bg-[#1a2332] rounded-xl p-3 text-sm text-gray-200 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                                    {message.replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1')}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== USERS SECTION ===== */}
            {activeSection === 'users' && (
                <div>
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

                    {usersLoading ? (
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
                                                {u.notifications_enabled ? 'Yoqilgan' : 'O\'chirilgan'}
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
            )}
        </div>
    );
}
