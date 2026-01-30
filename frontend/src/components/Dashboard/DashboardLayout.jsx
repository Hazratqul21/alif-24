import React from 'react';
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
  BarChart3
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { user, logout, isSuperAdmin, isAdmin, isTeacher, isParent, isStudent } = useAuth();
  const { t } = useLanguage();

  const getNavigation = () => {
    if (isSuperAdmin || isAdmin) {
      return [
        { icon: <Home className="w-5 h-5" />, label: t('home'), href: '/admin' },
        { icon: <Users className="w-5 h-5" />, label: t('nav_users'), href: '/admin/users' },
        { icon: <BookOpen className="w-5 h-5" />, label: t('nav_courses'), href: '/admin/courses' },
        { icon: <BarChart3 className="w-5 h-5" />, label: t('nav_analytics'), href: '/admin/analytics' },
        { icon: <Settings className="w-5 h-5" />, label: t('settings'), href: '/admin/settings' },
      ];
    }
    
    if (isTeacher) {
      return [
        { icon: <Home className="w-5 h-5" />, label: t('home'), href: '/teacher' },
        { icon: <BookOpen className="w-5 h-5" />, label: t('nav_my_courses'), href: '/teacher/courses' },
        { icon: <Users className="w-5 h-5" />, label: t('nav_students'), href: '/teacher/students' },
        { icon: <Calendar className="w-5 h-5" />, label: t('nav_schedule'), href: '/teacher/schedule' },
        { icon: <FileText className="w-5 h-5" />, label: t('nav_assignments'), href: '/teacher/assignments' },
      ];
    }
    
    if (isParent) {
      return [
        { icon: <Home className="w-5 h-5" />, label: t('home'), href: '/parent' },
        { icon: <Users className="w-5 h-5" />, label: t('nav_children'), href: '/parent/children' },
        { icon: <TrendingUp className="w-5 h-5" />, label: t('progress'), href: '/parent/progress' },
        { icon: <Calendar className="w-5 h-5" />, label: t('nav_schedule'), href: '/parent/schedule' },
        { icon: <BookOpen className="w-5 h-5" />, label: t('nav_materials'), href: '/parent/materials' },
      ];
    }
    
    if (isStudent) {
      return [
        { icon: <Home className="w-5 h-5" />, label: t('home'), href: '/student' },
        { icon: <BookOpen className="w-5 h-5" />, label: t('nav_materials'), href: '/student/courses' },
        { icon: <FileText className="w-5 h-5" />, label: t('nav_assignments'), href: '/student/assignments' },
        { icon: <Award className="w-5 h-5" />, label: t('achievements'), href: '/student/achievements' },
        { icon: <BarChart3 className="w-5 h-5" />, label: t('progress'), href: '/student/progress' },
      ];
    }
    
    return [];
  };

  const getRoleInfo = () => {
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className={`p-2 rounded-full ${roleInfo.color}`}>
              {roleInfo.icon}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{user?.first_name} {user?.last_name}</div>
              <div className="text-sm text-gray-500">{roleInfo.label}</div>
            </div>
          </div>

          <nav className="space-y-1">
            {navigation.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 w-64 p-6 border-t">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>{t('logout')}</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              {roleInfo.label} paneli
            </h1>
            <div className="flex items-center gap-4">
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
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
