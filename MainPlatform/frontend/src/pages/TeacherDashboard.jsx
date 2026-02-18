import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';
import {
  BookOpen, Users, Award, BarChart3, Plus, Clock, CheckCircle,
  FileText, Settings, Bell, Search, Filter, ChevronRight,
  GraduationCap, Target, TrendingUp, Calendar, MessageSquare,
  Play, Eye, Edit, Trash2, ArrowLeft, LogOut, Zap
} from 'lucide-react';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Bosh sahifa', icon: BarChart3 },
    { id: 'lessons', label: 'Darslarim', icon: BookOpen },
    { id: 'students', label: "O'quvchilar", icon: Users },
    { id: 'quizzes', label: 'Testlar', icon: FileText },
    { id: 'livequiz', label: 'Live Quiz', icon: Zap },
    { id: 'settings', label: 'Sozlamalar', icon: Settings },
  ];

  const stats = [
    { icon: Users, value: '24', label: "O'quvchilar", color: 'from-blue-500 to-blue-600' },
    { icon: BookOpen, value: '12', label: 'Darslar', color: 'from-green-500 to-green-600' },
    { icon: FileText, value: '8', label: 'Testlar', color: 'from-purple-500 to-purple-600' },
    { icon: Award, value: '95%', label: "O'rtacha ball", color: 'from-amber-500 to-amber-600' },
  ];

  const recentActivity = [
    { type: 'lesson', text: "Matematika darsi yaratildi", time: '2 soat oldin' },
    { type: 'quiz', text: "Alifbe testi tugallandi", time: '5 soat oldin' },
    { type: 'student', text: "3 ta yangi o'quvchi qo'shildi", time: 'Kecha' },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
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
            onClick={() => setActiveTab('lessons')}
            className="flex items-center gap-3 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform"
          >
            <Plus size={20} />
            <span className="font-medium">Yangi dars</span>
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className="flex items-center gap-3 bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform"
          >
            <FileText size={20} />
            <span className="font-medium">Yangi test</span>
          </button>
          <button
            onClick={() => navigate('/livequiz-teacher')}
            className="flex items-center gap-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform"
          >
            <Zap size={20} />
            <span className="font-medium">Live Quiz</span>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className="flex items-center gap-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform"
          >
            <Users size={20} />
            <span className="font-medium">O'quvchilar</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">So'nggi faoliyat</h3>
        <div className="space-y-3">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <div className="w-8 h-8 bg-[#4b30fb]/20 rounded-lg flex items-center justify-center">
                {item.type === 'lesson' ? <BookOpen size={16} className="text-[#4b30fb]" /> :
                 item.type === 'quiz' ? <FileText size={16} className="text-green-400" /> :
                 <Users size={16} className="text-blue-400" />}
              </div>
              <div className="flex-1">
                <div className="text-sm text-white">{item.text}</div>
                <div className="text-xs text-white/40">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLessons = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Darslarim</h3>
        <button className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform text-sm font-medium">
          <Plus size={16} />
          Yangi dars
        </button>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <BookOpen className="w-12 h-12 text-white/30 mx-auto mb-3" />
        <p className="text-white/60">Darslar ro'yxati bu yerda ko'rsatiladi</p>
        <p className="text-white/40 text-sm mt-1">Yangi dars yaratish uchun yuqoridagi tugmani bosing</p>
      </div>
    </div>
  );

  const renderStudents = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">O'quvchilarim</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Qidirish..."
              className="bg-white/10 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]"
            />
          </div>
        </div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <Users className="w-12 h-12 text-white/30 mx-auto mb-3" />
        <p className="text-white/60">O'quvchilar ro'yxati bu yerda ko'rsatiladi</p>
      </div>
    </div>
  );

  const renderQuizzes = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Testlarim</h3>
        <button className="flex items-center gap-2 bg-gradient-to-br from-green-500 to-green-600 text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform text-sm font-medium">
          <Plus size={16} />
          Yangi test
        </button>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <FileText className="w-12 h-12 text-white/30 mx-auto mb-3" />
        <p className="text-white/60">Testlar ro'yxati bu yerda ko'rsatiladi</p>
      </div>
    </div>
  );

  const renderLiveQuiz = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Live Quiz</h3>
      <div className="bg-gradient-to-r from-[#4b30fb]/20 to-[#764ba2]/20 border border-[#4b30fb]/30 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold">Real-vaqtda quiz o'tkazing</h4>
            <p className="text-white/60 text-sm">O'quvchilaringiz bilan jonli quiz o'ynang</p>
          </div>
          <button
            onClick={() => navigate('/livequiz-teacher')}
            className="bg-gradient-to-br from-amber-500 to-amber-600 text-white px-6 py-3 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform font-medium flex items-center gap-2"
          >
            <Play size={18} />
            Boshlash
          </button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Sozlamalar</h3>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-white/60" />
            <span className="text-white">Bildirishnomalar</span>
          </div>
          <ChevronRight size={18} className="text-white/40" />
        </div>
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
          <div className="flex items-center gap-3">
            <Settings size={18} className="text-white/60" />
            <span className="text-white">Profil sozlamalari</span>
          </div>
          <ChevronRight size={18} className="text-white/40" />
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'lessons': return renderLessons();
      case 'students': return renderStudents();
      case 'quizzes': return renderQuizzes();
      case 'livequiz': return renderLiveQuiz();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
      <Navbar />

      <div className="flex min-h-[calc(100vh-70px)]">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white/5 border-r border-white/10 p-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-full flex items-center justify-center text-white font-bold">
              {user?.first_name?.charAt(0) || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.first_name} {user?.last_name}</div>
              <div className="text-xs text-white/40">O'qituvchi</div>
            </div>
          </div>

          {/* Navigation */}
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

          {/* Logout */}
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
          <div className="max-w-4xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;
