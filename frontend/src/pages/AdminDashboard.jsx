import React, { useState, useEffect } from 'react';
import { 
    Users, TrendingUp, BookOpen, Activity, 
    Search, Filter, RefreshCw, Eye, Lock 
} from 'lucide-react';

const AdminDashboard = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminKey, setAdminKey] = useState('');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [analyses, setAnalyses] = useState([]);
    const [activeTab, setActiveTab] = useState('stats');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const API_BASE = import.meta.env.VITE_API_URL 
        ? import.meta.env.VITE_API_URL.replace('/v1', '') 
        : "http://localhost:8000";

    // Login функцияси
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE}/api/admin/stats`, {
                headers: {
                    'X-Admin-Key': adminKey
                }
            });
            
            if (response.ok) {
                localStorage.setItem('admin_key', adminKey);
                setIsAuthenticated(true);
                loadData();
            } else {
                window.appAlert('Нотўғри махфий калит!');
            }
        } catch (error) {
            console.error('Login error:', error);
            window.appAlert('Хатолик юз берди');
        }
    };

    // Маълумотларни юклаш
    const loadData = async () => {
        const key = localStorage.getItem('admin_key');
        if (!key) return;

        setLoading(true);
        try {
            // Статистика
            const statsRes = await fetch(`${API_BASE}/api/admin/stats`, {
                headers: { 'X-Admin-Key': key }
            });
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }

            // Фойдаланувчилар
            const usersRes = await fetch(`${API_BASE}/api/admin/users?limit=50`, {
                headers: { 'X-Admin-Key': key }
            });
            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(data.users);
            }

            // Таҳлиллар
            const analysesRes = await fetch(`${API_BASE}/api/admin/reading-analyses?limit=20`, {
                headers: { 'X-Admin-Key': key }
            });
            if (analysesRes.ok) {
                const data = await analysesRes.json();
                setAnalyses(data.analyses);
            }
        } catch (error) {
            console.error('Load error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Дастлабки юклаш
    useEffect(() => {
        const key = localStorage.getItem('admin_key');
        if (key) {
            setAdminKey(key);
            setIsAuthenticated(true);
            loadData();
        }
    }, []);

    // Чиқиш
    const handleLogout = () => {
        localStorage.removeItem('admin_key');
        setIsAuthenticated(false);
        setAdminKey('');
    };

    // Фильтрлаш
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Роль номини олиш
    const getRoleName = (role) => {
        const roles = {
            'student': 'Ўқувчи',
            'teacher': 'Ўқитувчи',
            'parent': 'Ота-она',
            'admin': 'Админ'
        };
        return roles[role] || role;
    };

    // Login экрани
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                    <div className="text-center mb-8">
                        <Lock size={64} className="mx-auto text-blue-500 mb-4" />
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Админ Панель</h1>
                        <p className="text-gray-600">Alif24 Platform</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Махфий Калит
                            </label>
                            <input
                                type="password"
                                value={adminKey}
                                onChange={(e) => setAdminKey(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Калитни киритинг..."
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                        >
                            Кириш
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Dashboard
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Админ Панель</h1>
                            <p className="text-sm text-gray-600">Alif24 Platform Бошқаруви</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={loadData}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                            >
                                <RefreshCw size={18} />
                                Янгилаш
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            >
                                Чиқиш
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex gap-8 px-6">
                            {[
                                { key: 'stats', label: 'Статистика', icon: TrendingUp },
                                { key: 'users', label: 'Фойдаланувчилар', icon: Users },
                                { key: 'analyses', label: 'SmartReader', icon: BookOpen }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium transition-colors ${
                                        activeTab === tab.key
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <tab.icon size={20} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Статистика */}
                {activeTab === 'stats' && stats && (
                    <div className="space-y-6">
                        {/* Фойдаланувчилар статистикаси */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">📊 Фойдаланувчилар</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard
                                    label="Жами"
                                    value={stats.users.total}
                                    icon="👥"
                                    color="blue"
                                />
                                <StatCard
                                    label="Ўқувчилар"
                                    value={stats.users.students}
                                    icon="👨‍🎓"
                                    color="green"
                                />
                                <StatCard
                                    label="Ўқитувчилар"
                                    value={stats.users.teachers}
                                    icon="👨‍🏫"
                                    color="purple"
                                />
                                <StatCard
                                    label="Ота-оналар"
                                    value={stats.users.parents}
                                    icon="👨‍👩‍👧"
                                    color="orange"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                                <StatCard
                                    label="Охирги хафта"
                                    value={stats.users.last_week}
                                    icon="📅"
                                    color="cyan"
                                />
                                <StatCard
                                    label="Охирги ой"
                                    value={stats.users.last_month}
                                    icon="📆"
                                    color="teal"
                                />
                                <StatCard
                                    label="Фаол"
                                    value={stats.users.active}
                                    icon="✅"
                                    color="green"
                                />
                                <StatCard
                                    label="Тасдиқланган"
                                    value={stats.users.verified}
                                    icon="✓"
                                    color="blue"
                                />
                            </div>
                        </div>

                        {/* SmartReader статистикаси */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">📖 SmartReader</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard
                                    label="Жами таҳлиллар"
                                    value={stats.reading.total_analyses}
                                    icon="📊"
                                    color="indigo"
                                />
                                <StatCard
                                    label="Ўқилган сўзлар"
                                    value={stats.reading.total_words}
                                    icon="📝"
                                    color="pink"
                                />
                                <StatCard
                                    label="Ўқиган фойдаланувчилар"
                                    value={stats.reading.users_reading}
                                    icon="👤"
                                    color="blue"
                                />
                                <StatCard
                                    label="Охирги хафта"
                                    value={stats.reading.last_week_analyses}
                                    icon="🗓️"
                                    color="green"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Фойдаланувчилар рўйхати */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-lg shadow-sm">
                        {/* Фильтрлар */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Қидириш (исм ёки email)..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Барча роллар</option>
                                    <option value="student">Ўқувчилар</option>
                                    <option value="teacher">Ўқитувчилар</option>
                                    <option value="parent">Ота-оналар</option>
                                </select>
                            </div>
                        </div>

                        {/* Жадвал */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Исм</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Роль</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ҳолат</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Рўйхатдан ўтган</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Охирги кириш</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    user.role === 'student' ? 'bg-blue-100 text-blue-800' :
                                                    user.role === 'teacher' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-orange-100 text-orange-800'
                                                }`}>
                                                    {getRoleName(user.role)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    {user.is_active && (
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                            Фаол
                                                        </span>
                                                    )}
                                                    {user.is_verified && (
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.registered_at}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.last_login || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredUsers.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                Фойдаланувчилар топилмади
                            </div>
                        )}
                    </div>
                )}

                {/* SmartReader таҳлиллар */}
                {activeTab === 'analyses' && (
                    <div className="bg-white rounded-lg shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Фойдаланувчи</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ҳикоя</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сўзлар</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Талаффуз</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тушуниш</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Хатолар</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сана</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {analyses.map(analysis => (
                                        <tr key={analysis.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{analysis.user_name}</div>
                                                <div className="text-xs text-gray-500">{analysis.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">{analysis.story_title}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {analysis.words_read}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    analysis.pronunciation >= 80 ? 'bg-green-100 text-green-800' :
                                                    analysis.pronunciation >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {analysis.pronunciation}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    analysis.comprehension >= 80 ? 'bg-green-100 text-green-800' :
                                                    analysis.comprehension >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {analysis.comprehension}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    analysis.errors === 0 ? 'bg-green-100 text-green-800' :
                                                    analysis.errors <= 3 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {analysis.errors}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {analysis.date}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {analyses.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                Таҳлиллар топилмади
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Статистика карточкаси
const StatCard = ({ label, value, icon, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
        cyan: 'bg-cyan-50 text-cyan-600',
        teal: 'bg-teal-50 text-teal-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        pink: 'bg-pink-50 text-pink-600'
    };

    return (
        <div className={`rounded-xl p-6 ${colors[color] || colors.blue}`}>
            <div className="text-3xl mb-2">{icon}</div>
            <div className="text-3xl font-bold mb-1">{value}</div>
            <div className="text-sm font-medium opacity-80">{label}</div>
        </div>
    );
};

export default AdminDashboard;
