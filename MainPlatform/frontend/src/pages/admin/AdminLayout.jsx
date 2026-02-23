import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, Database, Send, BookOpen, LogOut, Shield, Menu, X, Trophy, Mic, Crown, Zap } from 'lucide-react';
import { useState } from 'react';
import adminService from '../../services/adminService';

const NAV_ITEMS = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: null },
    { path: '/admin/users', label: 'Foydalanuvchilar', icon: Users, perm: 'users' },
    { path: '/admin/teachers', label: "O'qituvchilar", icon: GraduationCap, perm: 'teachers' },
    { path: '/admin/database', label: 'Database', icon: Database, perm: 'all' },
    { path: '/admin/content', label: 'Kontentlar', icon: BookOpen, perm: 'content' },
    { path: '/admin/telegram', label: 'Telegram', icon: Send, perm: 'telegram' },
    { path: '/admin/olympiads', label: 'Olimpiadalar', icon: Trophy, perm: null },
    { path: '/admin/reading', label: "O'qish Musobaqasi", icon: Mic, perm: 'content' },
];

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    if (!adminService.isLoggedIn()) {
        return <Navigate to="/admin/login" replace />;
    }

    const role = adminService.getRole();
    const visibleItems = NAV_ITEMS.filter(item => {
        if (!item.perm) return true;
        return adminService.hasPermission(item.perm);
    });

    const handleLogout = () => {
        adminService.logout();
        navigate('/admin/login');
    };

    const roleLabels = {
        hazratqul: { label: 'Hazratqul', Icon: Crown, color: 'text-amber-400' },
        nurali: { label: 'Nurali', Icon: Zap, color: 'text-blue-400' },
        pedagog: { label: 'Pedagog', Icon: BookOpen, color: 'text-green-400' },
    };

    const currentRole = roleLabels[role] || roleLabels.hazratqul;

    return (
        <div className="min-h-screen bg-gray-950 flex">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Logo */}
                <div className="p-5 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-sm">Admin Panel</h2>
                            <p className="text-gray-500 text-xs">Alif24 Platform</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {visibleItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User info */}
                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center gap-3 mb-3">
                        <currentRole.Icon size={20} className={currentRole.color} />
                        <div>
                            <p className={`text-sm font-bold ${currentRole.color}`}>{currentRole.label}</p>
                            <p className="text-gray-500 text-xs capitalize">{role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 text-gray-400 rounded-xl text-sm hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Chiqish
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="bg-gray-900/50 border-b border-gray-800 px-4 py-3 lg:px-6 flex items-center gap-4">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-gray-400 hover:text-white"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${currentRole.color}`}>
                            <currentRole.Icon size={16} className="inline" /> {currentRole.label}
                        </span>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
