import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';
import {
  BarChart3, Users, BookOpen, Award, Settings, Bell, Search,
  ChevronRight, Plus, TrendingUp, Shield, Building, LogOut,
  FileText, Zap, Calendar, MessageSquare, Eye, UserPlus,
  Activity, PieChart, DollarSign, ClipboardList
} from 'lucide-react';

const OrganizationDashboard = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const ol = {
    uz: { dashboard: 'Bosh sahifa', teachers: "O'qituvchilar", students: "O'quvchilar", analytics: 'Tahlil', content: 'Kontent', settings: 'Sozlamalar', lessons: 'Darslar', activity: 'Faollik', quickActions: 'Tezkor harakatlar' },
    ru: { dashboard: 'Главная', teachers: 'Учителя', students: 'Ученики', analytics: 'Аналитика', content: 'Контент', settings: 'Настройки', lessons: 'Уроки', activity: 'Активность', quickActions: 'Быстрые действия' },
    en: { dashboard: 'Home', teachers: 'Teachers', students: 'Students', analytics: 'Analytics', content: 'Content', settings: 'Settings', lessons: 'Lessons', activity: 'Activity', quickActions: 'Quick Actions' },
  }[language] || { dashboard: 'Bosh sahifa', teachers: "O'qituvchilar", students: "O'quvchilar", analytics: 'Tahlil', content: 'Kontent', settings: 'Sozlamalar', lessons: 'Darslar', activity: 'Faollik', quickActions: 'Tezkor harakatlar' };

  const tabs = [
    { id: 'dashboard', label: ol.dashboard, icon: BarChart3 },
    { id: 'teachers', label: ol.teachers, icon: Users },
    { id: 'students', label: ol.students, icon: BookOpen },
    { id: 'analytics', label: ol.analytics, icon: PieChart },
    { id: 'content', label: ol.content, icon: FileText },
    { id: 'settings', label: ol.settings, icon: Settings },
  ];

  const stats = [
    { icon: Users, value: '156', label: ol.teachers, color: 'from-blue-500 to-blue-600' },
    { icon: BookOpen, value: '1,240', label: ol.students, color: 'from-green-500 to-green-600' },
    { icon: FileText, value: '89', label: ol.lessons, color: 'from-purple-500 to-purple-600' },
    { icon: TrendingUp, value: '94%', label: ol.activity, color: 'from-amber-500 to-amber-600' },
  ];

  const pendingTeachers = [
    { name: 'Aliyev Jasur', specialty: 'Matematika', date: '2 kun oldin' },
    { name: 'Karimova Nilufar', specialty: "O'zbek tili", date: '3 kun oldin' },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all">
            <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-white/60">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Tezkor harakatlar</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab('teachers')}
            className="flex items-center gap-3 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform"
          >
            <UserPlus size={20} />
            <span className="font-medium text-sm">O'qituvchi qo'shish</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className="flex items-center gap-3 bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform"
          >
            <PieChart size={20} />
            <span className="font-medium text-sm">Hisobotlar</span>
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className="flex items-center gap-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform"
          >
            <FileText size={20} />
            <span className="font-medium text-sm">Kontent</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform"
          >
            <Settings size={20} />
            <span className="font-medium text-sm">Sozlamalar</span>
          </button>
        </div>
      </div>

      {/* Pending Teachers */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Kutilayotgan o'qituvchilar</h3>
          <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold">
            {pendingTeachers.length} ta
          </span>
        </div>
        <div className="space-y-3">
          {pendingTeachers.map((teacher, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {teacher.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{teacher.name}</div>
                  <div className="text-xs text-white/40">{teacher.specialty} • {teacher.date}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer hover:bg-green-500/30 transition-colors">
                  Tasdiqlash
                </button>
                <button className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer hover:bg-red-500/30 transition-colors">
                  Rad etish
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPlaceholder = (title, icon, desc) => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        {React.createElement(icon, { className: "w-12 h-12 text-white/30 mx-auto mb-3" })}
        <p className="text-white/60">{desc}</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'teachers': return renderPlaceholder("O'qituvchilar", Users, "O'qituvchilar ro'yxati va boshqaruv");
      case 'students': return renderPlaceholder("O'quvchilar", BookOpen, "O'quvchilar statistikasi va ro'yxati");
      case 'analytics': return renderPlaceholder("Tahlil", PieChart, "Batafsil tahlil va hisobotlar");
      case 'content': return renderPlaceholder("Kontent", FileText, "Kontent boshqaruvi");
      case 'settings': return renderPlaceholder("Sozlamalar", Settings, "Tashkilot sozlamalari");
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
      <Navbar />

      <div className="flex min-h-[calc(100vh-70px)]">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white/5 border-r border-white/10 p-4">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-full flex items-center justify-center text-white font-bold">
              {user?.first_name?.charAt(0) || 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.first_name} {user?.last_name}</div>
              <div className="text-xs text-white/40 capitalize">{user?.role || 'Tashkilot'}</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border-none cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/5 bg-transparent'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all border-none cursor-pointer bg-transparent w-full mt-4"
          >
            <LogOut size={18} />
            Chiqish
          </button>
        </aside>

        {/* Mobile Tab Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a2e] border-t border-white/10 flex z-[999] overflow-x-auto">
          {tabs.slice(0, 5).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 px-1 text-[10px] gap-1 border-none cursor-pointer transition-colors min-w-0 ${
                activeTab === tab.id ? 'text-[#4b30fb] bg-transparent' : 'text-gray-400 bg-transparent'
              }`}
            >
              <tab.icon size={18} />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default OrganizationDashboard;
