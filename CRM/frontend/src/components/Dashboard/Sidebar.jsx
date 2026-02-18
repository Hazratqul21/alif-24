import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    Trophy,
    Settings,
    LogOut,
    Menu,
    X,
    CreditCard,
    Building,
    GraduationCap
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen, isMobile }) => {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const menuItems = [
        {
            path: '/crm',
            icon: LayoutDashboard,
            label: t('dashboard') || 'Dashboard',
            roles: ['teacher', 'organization', 'moderator']
        },
        {
            path: '/organization',
            icon: Building,
            label: t('organization') || 'Tashkilot',
            roles: ['organization', 'moderator']
        },
        {
            path: '/students',
            icon: Users,
            label: t('students') || "O'quvchilar",
            roles: ['teacher', 'organization']
        },
        {
            path: '/teachers',
            icon: GraduationCap,
            label: t('teachers') || "O'qituvchilar",
            roles: ['organization']
        },
        {
            path: '/billing',
            icon: CreditCard,
            label: t('billing') || "To'lovlar",
            roles: ['organization']
        },
        {
            path: '/profile',
            icon: Settings,
            label: t('profile') || 'Profil',
            roles: ['teacher', 'organization', 'moderator']
        }
    ];

    const filteredMenu = menuItems.filter(item =>
        !item.roles || (user && item.roles.includes(user.role))
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
        fixed top-0 left-0 h-full bg-[#1a1a2e] text-white z-50 transition-all duration-300 border-r border-white/10
        ${isOpen ? 'w-64 translate-x-0' : isMobile ? '-translate-x-full w-64' : 'w-20'}
      `}>
                {/* Logo Area */}
                <div className="h-[70px] flex items-center justify-center border-b border-white/10">
                    <div className="flex items-center gap-2 font-bold text-xl">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">A</span>
                        </div>
                        {isOpen && <span className="transition-opacity duration-300">Alif24 CRM</span>}
                    </div>
                </div>

                {/* User Info */}
                {isOpen && user && (
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.first_name} {user.last_name}</p>
                                <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="p-2 space-y-1 mt-2">
                    {filteredMenu.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => isMobile && setIsOpen(false)}
                            className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                ${isActive
                                    ? 'bg-[#4b30fb] text-white shadow-lg shadow-blue-900/20'
                                    : 'text-gray-400 hover:bg-white/10 hover:text-white'}
                ${!isOpen && 'justify-center'}
              `}
                            title={!isOpen ? item.label : ''}
                        >
                            <item.icon size={20} className={`${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                            {isOpen && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout Button */}
                <div className="absolute bottom-4 left-0 right-0 px-2">
                    <button
                        onClick={handleLogout}
                        className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-red-400 hover:bg-red-500/10 hover:text-red-300
              ${!isOpen && 'justify-center'}
            `}
                        title="Chiqish"
                    >
                        <LogOut size={20} />
                        {isOpen && <span className="font-medium">Chiqish</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
