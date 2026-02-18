import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Users,
  BookOpen,
  TrendingUp,
  Award,
  Calendar,
  Settings,
  LogOut,
  Shield,
  GraduationCap,
  Home,
  FileText,
  Bell,
  BarChart3,
  Menu,
  X
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { user, logout, isSuperAdmin, isAdmin, isTeacher, isParent, isStudent, isOrganization } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getNavigation = () => {
    if (isSuperAdmin || isAdmin) {
      return [
        { icon: <Home className="w-5 h-5" />, label: t('home') || 'Bosh sahifa', href: '/organization-dashboard' },
        { icon: <TrendingUp className="w-5 h-5" />, label: 'CRM Lidlar', href: '/crm' },
        { icon: <Users className="w-5 h-5" />, label: t('nav_users') || 'Foydalanuvchilar', href: '/organization-dashboard' },
        { icon: <BarChart3 className="w-5 h-5" />, label: t('nav_analytics') || 'Statistika', href: '/organization-dashboard' },
      ];
    }

    if (isOrganization) {
      return [
        { icon: <Home className="w-5 h-5" />, label: "Bosh sahifa", href: '/organization-dashboard' },
        { icon: <TrendingUp className="w-5 h-5" />, label: 'CRM / Lidlar', href: '/crm' },
        { icon: <Users className="w-5 h-5" />, label: "O'qituvchilar", href: '/organization-dashboard' },
        { icon: <BookOpen className="w-5 h-5" />, label: "Materiallar", href: '/organization-dashboard' },
      ];
    }

    if (isTeacher) {
      return [
        { icon: <Home className="w-5 h-5" />, label: t('home') || 'Bosh sahifa', href: '/teacher-dashboard' },
        { icon: <BookOpen className="w-5 h-5" />, label: t('nav_my_courses') || 'Darslarim', href: '/lesson-builder' },
        { icon: <FileText className="w-5 h-5" />, label: t('nav_assignments') || 'Testlar', href: '/teacher/test-ai' },
        { icon: <GraduationCap className="w-5 h-5" />, label: "O'quvchilar", href: '/teacher-dashboard' },
        { icon: <Calendar className="w-5 h-5" />, label: t('calendar') || 'Jadval', href: '/teacher-dashboard' },
      ];
    }

    if (isParent) {
      return [
        { icon: <Home className="w-5 h-5" />, label: t('home') || 'Bosh sahifa', href: '/parent-dashboard' },
        { icon: <GraduationCap className="w-5 h-5" />, label: "Farzandlarim", href: '/parent-dashboard' },
        { icon: <BarChart3 className="w-5 h-5" />, label: "Hisobotlar", href: '/parent-dashboard' },
        { icon: <Bell className="w-5 h-5" />, label: "Bildirishnomalar", href: '/parent-dashboard' },
      ];
    }

    if (isStudent) {
      return [
        { icon: <Home className="w-5 h-5" />, label: t('home') || 'Bosh sahifa', href: '/student-dashboard' },
        { icon: <BookOpen className="w-5 h-5" />, label: "Darslarim", href: '/student-dashboard' },
        { icon: <Award className="w-5 h-5" />, label: "Yutuqlarim", href: '/student-dashboard' },
        { icon: <BarChart3 className="w-5 h-5" />, label: "Statistika", href: '/student-dashboard' },
      ];
    }

    return [];
  };

  const getRoleInfo = () => {
    if (isOrganization) {
      return {
        label: "Ta'lim tashkiloti",
        icon: <Shield className="w-6 h-6" />,
        color: 'bg-purple-100 text-purple-800'
      };
    }
    if (isSuperAdmin) {
      return {
        label: 'Super Admin',
        icon: <Shield className="w-6 h-6" />,
        color: 'bg-purple-100 text-purple-800'
      };
    }
    if (isAdmin) {
      return {
        label: 'Admin',
        icon: <Shield className="w-6 h-6" />,
        color: 'bg-blue-100 text-blue-800'
      };
    }
    if (isTeacher) {
      return {
        label: t('auth_role_teacher'),
        icon: <GraduationCap className="w-6 h-6" />,
        color: 'bg-green-100 text-green-800'
      };
    }
    if (isParent) {
      return {
        label: t('auth_role_parent'),
        icon: <Users className="w-6 h-6" />,
        color: 'bg-orange-100 text-orange-800'
      };
    }
    if (isStudent) {
      return {
        label: t('auth_role_student'),
        icon: <BookOpen className="w-6 h-6" />,
        color: 'bg-indigo-100 text-indigo-800'
      };
    }
    return { label: 'User', icon: <Users className="w-6 h-6" />, color: 'bg-gray-100 text-gray-800' };
  };

  const navigation = getNavigation();
  const roleInfo = getRoleInfo();

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed md:static top-0 left-0 h-full z-50 bg-white shadow-lg transition-transform duration-300 w-64 flex-shrink-0 ${
        isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
      }`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className={`p-2 rounded-full ${roleInfo.color}`}>
              {roleInfo.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">{user?.first_name} {user?.last_name}</div>
              <div className="text-sm text-gray-500">{roleInfo.label}</div>
            </div>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <nav className="space-y-1 flex-1">
            {navigation.map((item, index) => (
              <button
                key={index}
                onClick={() => { navigate(item.href); if (isMobile) setSidebarOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg transition-colors ${
                  location.pathname === item.href
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-4 border-t">
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-30">
          <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isMobile && (
                <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
                {roleInfo.label} paneli
              </h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-600">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
