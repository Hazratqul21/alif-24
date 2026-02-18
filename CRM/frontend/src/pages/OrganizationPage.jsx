import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Common/Navbar';

import {
  LayoutDashboard, Users, BookOpen, DollarSign, Settings, Shield, FileText,
  Bell, Search, ChevronDown, Plus, Filter, Download, Edit, Trash2, Eye,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Clock,
  Calendar, Database, BarChart3, PieChart, Activity, Server, Lock,
  UserPlus, Upload, RefreshCw, Mail, MessageSquare, HelpCircle,
  Building, GraduationCap, Briefcase, CreditCard, Package, Wifi,
  Menu, X, ExternalLink, Copy, Archive, Flag, Star, Award
} from 'lucide-react';

import organizationService from '../services/organizationService';
import { useAuth } from '../context/AuthContext';

const OrganizationPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // State for real data
  const [statsData, setStatsData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Get Stats
      const stats = await organizationService.getStats();
      setStatsData(stats);

      // 2. Get Users (recent 10)
      const users = await organizationService.getUsers({ limit: 10 });
      setUsersList(users);

      // 3. Get Pending Teachers
      const pending = await organizationService.getPendingTeachers();
      setPendingTeachers(pending);

    } catch (error) {
      console.error("Dashboard data load failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for Teacher Approval
  const handleApproveTeacher = async (teacherId) => {
    if (!window.confirm("O'qituvchini tasdiqlaysizmi?")) return;
    try {
      await organizationService.approveTeacher(teacherId);
      // Refresh data
      fetchDashboardData();
    } catch (error) {
      console.error("Approval failed:", error);
      alert("Xatolik yuz berdi");
    }
  };

  const handleRejectTeacher = async (teacherId) => {
    const reason = window.prompt("Rad etish sababini kiriting:");
    if (!reason) return;
    try {
      await organizationService.rejectTeacher(teacherId, reason);
      fetchDashboardData();
    } catch (error) {
      console.error("Rejection failed:", error);
    }
  };

  const adminData = {
    name: user ? `${user.first_name} ${user.last_name}` : "Admin",
    position: "Platforma Moderatori",
    school: "Alif24 Platformasi", // Or fetch from user profile if available
    email: user?.email || "admin@alif24.uz",
    phone: user?.phone || ""
  };

  // Transform API stats to UI stats
  const stats = [
    {
      label: "Jami foydalanuvchilar",
      value: statsData?.users?.total || 0,
      change: "+0",
      trend: "neutral",
      icon: Users,
      color: "#8B5CF6"
    },
    {
      label: "O'qituvchilar (Tasdiqlash kutilmoqda)",
      value: statsData?.teachers?.pending_approval || 0,
      change: pendingTeachers.length > 0 ? "Action needed" : "All clear",
      trend: pendingTeachers.length > 0 ? "up" : "neutral",
      icon: GraduationCap,
      color: "#EC4899"
    },
    {
      label: "Faol o'quvchilar (7 kun)",
      value: statsData?.students?.active_last_7_days || 0,
      change: "Active",
      trend: "up",
      icon: Activity,
      color: "#10B981"
    },
    {
      label: "Sinfxonalar",
      value: statsData?.classrooms?.total || 0,
      change: "Total",
      trend: "neutral",
      icon: BookOpen,
      color: "#F59E0B"
    }
  ];

  const systemStats = [
    { label: "Server yuki", value: "47%", status: "normal", icon: Server },
    { label: "Ma'lumotlar bazasi", value: "12.4 GB", status: "normal", icon: Database },
    { label: "Faol sessiyalar", value: "234", status: "normal", icon: Wifi },
    { label: "Yangilanishlar", value: "3 mavjud", status: "warning", icon: RefreshCw }
  ];

  const recentActivities = [
    { id: 1, user: "Nodira Karimova", action: "7-A sinf uchun yangi topshiriq qo'shdi", time: "5 daqiqa oldin", type: "assignment" },
    { id: 2, user: "Admin", action: "15 yangi o'quvchi qo'shildi", time: "1 soat oldin", type: "user" },
    { id: 3, user: "Jamshid Toshev", action: "Moliyaviy hisobot yukladi", time: "2 soat oldin", type: "finance" },
    { id: 4, user: "Sistema", action: "Ma'lumotlar zaxiralandi", time: "3 soat oldin", type: "system" }
  ];

  // Use real users list or fallback to empty
  const users = usersList.length > 0 ? usersList.map(u => ({
    id: u.id,
    name: `${u.first_name} ${u.last_name}`,
    role: u.role,
    email: u.email,
    status: u.status,
    lastLogin: u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"
  })) : [];

  const classes = [
    { id: 1, name: "1-A", students: 28, teacher: "Zarina Alieva", subjects: 8 },
    { id: 2, name: "7-A", students: 30, teacher: "Nodira Karimova", subjects: 12 },
    { id: 3, name: "9-B", students: 27, teacher: "Otabek Rahmonov", subjects: 14 },
    { id: 4, name: "11-A", students: 24, teacher: "Dilshod Karimov", subjects: 15 }
  ];

  const payments = [
    { id: 1, student: "Anvar Toshmatov", amount: "500,000", status: "paid", date: "2026-01-25", type: "O'quv to'lovi" },
    { id: 2, student: "Dilnoza Rahimova", amount: "500,000", status: "paid", date: "2026-01-24", type: "O'quv to'lovi" },
    { id: 3, student: "Javohir Karimov", amount: "500,000", status: "pending", date: "2026-01-20", type: "O'quv to'lovi" },
    { id: 4, student: "Malika Usmonova", amount: "250,000", status: "overdue", date: "2026-01-15", type: "Qo'shimcha xizmat" }
  ];

  const securityAlerts = [
    { id: 1, type: "warning", message: "5 marta noto'g'ri parol kiritildi", user: "unknown_user", time: "10 daqiqa oldin" },
    { id: 2, type: "info", message: "Yangi qurilmadan kirish", user: "Nodira Karimova", time: "1 soat oldin" },
    { id: 3, type: "critical", message: "G'ayrioddiy faollik aniqlandi", user: "system", time: "2 soat oldin" }
  ];

  const Sidebar = () => (
    <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo-section">
          <div className="logo-icon">🏫</div>
          <h2 className="logo-text">Ta’lim tashkiloti</h2>
        </div>
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <LayoutDashboard size={20} />
          <span>Boshqaruv paneli</span>
        </button>
        <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={20} />
          <span>Foydalanuvchilar</span>
        </button>
        <button className={`nav-item ${activeTab === 'academic' ? 'active' : ''}`} onClick={() => setActiveTab('academic')}>
          <BookOpen size={20} />
          <span>Akademik tashkilot</span>
        </button>
        <button className={`nav-item ${activeTab === 'finance' ? 'active' : ''}`} onClick={() => setActiveTab('finance')}>
          <DollarSign size={20} />
          <span>Moliya</span>
        </button>
        <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
          <BarChart3 size={20} />
          <span>Hisobotlar</span>
        </button>
        <button className={`nav-item ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>
          <FileText size={20} />
          <span>Kontent boshqaruvi</span>
        </button>
        <button className={`nav-item ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
          <Shield size={20} />
          <span>Xavfsizlik</span>
        </button>
        <button className={`nav-item ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>
          <HelpCircle size={20} />
          <span>Qo'llab-quvvatlash</span>
        </button>
        <button className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          <Activity size={20} />
          <span>Audit va monitoring</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={() => setActiveTab('settings')}>
          <Settings size={20} />
          <span>Tizim sozlamalari</span>
        </button>
      </div>
    </div>
  );

  const Header = () => (
    <header className="header">
      <div className="header-left">
        <h1>{adminData.school}</h1>
        <p className="header-subtitle">Tashkilot paneli • {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div className="header-right">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Qidirish..." />
        </div>
        <button className="icon-button notification-btn" onClick={() => setShowNotifications(!showNotifications)}>
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>
        <div className="user-profile">
          <div className="user-avatar">{adminData.name.charAt(0)}</div>
          <div className="user-info">
            <span className="user-name">{adminData.name}</span>
            <span className="user-role">{adminData.position}</span>
          </div>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );

  const DashboardView = () => (
    <div className="dashboard-view">
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card" style={{ '--accent-color': stat.color }}>
            <div className="stat-icon">
              <stat.icon size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <h3>{stat.value}</h3>
              <div className={`stat-trend ${stat.trend}`}>
                {stat.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{stat.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="content-grid">
        <div className="card system-status">
          <div className="card-header">
            <h2>Tizim holati</h2>
            <button className="btn-text">
              <RefreshCw size={16} />
              Yangilash
            </button>
          </div>
          <div className="system-stats">
            {systemStats.map((stat, index) => (
              <div key={index} className="system-stat-item">
                <div className="stat-info">
                  <stat.icon size={20} className="stat-icon-small" />
                  <div>
                    <h4>{stat.label}</h4>
                    <p className="stat-value">{stat.value}</p>
                  </div>
                </div>
                <div className={`status-indicator ${stat.status}`}></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card security-alerts">
          <div className="card-header">
            <h2>Xavfsizlik ogohlantirishlari</h2>
            <Shield size={18} />
          </div>
          <div className="alerts-list">
            {securityAlerts.map(alert => (
              <div key={alert.id} className={`alert-item ${alert.type}`}>
                <AlertTriangle size={18} />
                <div className="alert-content">
                  <h4>{alert.message}</h4>
                  <p>{alert.user} • {alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="card analytics-chart">
          <div className="card-header">
            <h2>Platforma faolligi</h2>
            <div className="period-selector">
              <button className={selectedPeriod === 'week' ? 'active' : ''} onClick={() => setSelectedPeriod('week')}>Hafta</button>
              <button className={selectedPeriod === 'month' ? 'active' : ''} onClick={() => setSelectedPeriod('month')}>Oy</button>
              <button className={selectedPeriod === 'year' ? 'active' : ''} onClick={() => setSelectedPeriod('year')}>Yil</button>
            </div>
          </div>
          <div className="chart-placeholder">
            <BarChart3 size={64} />
            <p>Faollik grafigi</p>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#8B5CF6' }}></span>
                <span>Kirish</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#EC4899' }}></span>
                <span>Yuklamalar</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#10B981' }}></span>
                <span>Faollik</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card recent-activity">
          <div className="card-header">
            <h2>So'nggi faoliyat</h2>
            <button className="btn-text">Barchasi</button>
          </div>
          <div className="activity-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className={`activity-icon ${activity.type}`}>
                  {activity.type === 'assignment' && <FileText size={16} />}
                  {activity.type === 'user' && <UserPlus size={16} />}
                  {activity.type === 'finance' && <DollarSign size={16} />}
                  {activity.type === 'system' && <Server size={16} />}
                </div>
                <div className="activity-content">
                  <h4>{activity.user}</h4>
                  <p>{activity.action}</p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card quick-actions">
        <div className="card-header">
          <h2>Tez amallar</h2>
        </div>
        <div className="actions-grid">
          <button className="action-btn">
            <UserPlus size={20} />
            <span>Foydalanuvchi qo'shish</span>
          </button>
          <button className="action-btn">
            <Upload size={20} />
            <span>Ma'lumot yuklash</span>
          </button>
          <button className="action-btn">
            <FileText size={20} />
            <span>Hisobot yaratish</span>
          </button>
          <button className="action-btn">
            <Database size={20} />
            <span>Ma'lumot zaxiralash</span>
          </button>
          <button className="action-btn">
            <Bell size={20} />
            <span>E'lon yuborish</span>
          </button>
          <button className="action-btn">
            <Calendar size={20} />
            <span>Jadval yaratish</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Users View Component with Tabs
  const UsersView = () => {
    const [userTab, setUserTab] = useState('all'); // 'all' or 'pending'

    return (
      <div className="users-view">
        <div className="view-header">
          <h2>Foydalanuvchilar boshqaruvi</h2>
          <div className="view-actions">
            <div className="tab-buttons" style={{ display: 'flex', gap: '10px' }}>
              <button
                className={`btn-${userTab === 'all' ? 'primary' : 'secondary'}`}
                onClick={() => setUserTab('all')}
              >
                <Users size={18} /> Barchasi
              </button>
              <button
                className={`btn-${userTab === 'pending' ? 'primary' : 'secondary'}`}
                onClick={() => setUserTab('pending')}
              >
                <Clock size={18} /> Tasdiqlash ({pendingTeachers.length})
              </button>
            </div>

            {userTab === 'all' && (
              <button className="btn-secondary">
                <Download size={18} />
                Eksport
              </button>
            )}
          </div>
        </div>

        {userTab === 'all' && (
          <>
            <div className="filters-bar">
              {/* ... filters ... */}
              <div className="search-box">
                <Search size={18} />
                <input type="text" placeholder="Foydalanuvchi qidirish..." />
              </div>
            </div>

            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th><input type="checkbox" /></th>
                    <th>Foydalanuvchi</th>
                    <th>Rol</th>
                    <th>Email</th>
                    <th>Holat</th>
                    <th>So'nggi kirish</th>
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td><input type="checkbox" /></td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-sm">{user.name.charAt(0)}</div>
                          <span>{user.name}</span>
                        </div>
                      </td>
                      <td><span className="role-badge">{user.role}</span></td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`status-badge ${user.status}`}>
                          {user.status === 'active' ? 'Faol' : 'Nofaol'}
                        </span>
                      </td>
                      <td>{user.lastLogin}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="icon-btn" title="Ko'rish"><Eye size={16} /></button>
                          <button className="icon-btn" title="Tahrirlash"><Edit size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {userTab === 'pending' && (
          <div className="users-table">
            {pendingTeachers.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                <CheckCircle size={48} style={{ margin: '0 auto 10px', color: '#10B981' }} />
                <p>Tasdiqlash uchun arizalar yo'q</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>O'qituvchi</th>
                    <th>Sana</th>
                    <th>Malaka</th>
                    <th>Hujjatlar</th>
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTeachers.map(pt => (
                    <tr key={pt.profile.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-sm">{pt.user.first_name.charAt(0)}</div>
                          <div>
                            <div className="font-medium">{pt.user.first_name} {pt.user.last_name}</div>
                            <div className="text-sm text-gray-500">{pt.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{new Date(pt.profile.created_at).toLocaleDateString()}</td>
                      <td>{pt.profile.qualification || "Kiritilmagan"}</td>
                      <td>
                        {pt.profile.diploma_url ? (
                          <a href={pt.profile.diploma_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'underline' }}>
                            Diplomni ko'rish
                          </a>
                        ) : "Yuklanmagan"}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-sm btn-primary"
                            style={{ backgroundColor: '#10B981', color: 'white', padding: '5px 10px', borderRadius: '4px', marginRight: '5px' }}
                            onClick={() => handleApproveTeacher(pt.user.id)}
                          >
                            Tasdiqlash
                          </button>
                          <button
                            className="btn-sm btn-danger"
                            style={{ backgroundColor: '#EF4444', color: 'white', padding: '5px 10px', borderRadius: '4px' }}
                            onClick={() => handleRejectTeacher(pt.user.id)}
                          >
                            Rad etish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  };

  const AcademicView = () => (
    <div className="academic-view">
      <div className="view-header">
        <h2>Akademik tashkilot</h2>
        <div className="view-actions">
          <button className="btn-primary">
            <Plus size={18} />
            Yangi sinf
          </button>
          <button className="btn-secondary">
            <Calendar size={18} />
            Jadval yaratish
          </button>
        </div>
      </div>

      <div className="academic-tabs">
        <button className="tab-btn active">Sinflar</button>
        <button className="tab-btn">O'quv rejalari</button>
        <button className="tab-btn">Jadval</button>
        <button className="tab-btn">Kalendar</button>
      </div>

      <div className="classes-grid-admin">
        {classes.map(cls => (
          <div key={cls.id} className="class-card-admin">
            <div className="class-card-header">
              <h3>{cls.name}</h3>
              <div className="card-actions">
                <button className="icon-btn-sm"><Edit size={14} /></button>
                <button className="icon-btn-sm"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="class-card-body">
              <div className="class-info-row">
                <Users size={16} />
                <span>{cls.students} o'quvchi</span>
              </div>
              <div className="class-info-row">
                <GraduationCap size={16} />
                <span>{cls.teacher}</span>
              </div>
              <div className="class-info-row">
                <BookOpen size={16} />
                <span>{cls.subjects} fan</span>
              </div>
            </div>
            <button className="btn-full">Batafsil</button>
          </div>
        ))}
      </div>
    </div>
  );

  const FinanceView = () => (
    <div className="finance-view">
      <div className="view-header">
        <h2>Moliya boshqaruvi</h2>
        <div className="view-actions">
          <button className="btn-primary">
            <Download size={18} />
            Hisobot yuklash
          </button>
          <button className="btn-secondary">
            <Filter size={18} />
            Filtr
          </button>
        </div>
      </div>

      <div className="finance-stats">
        <div className="finance-card">
          <CreditCard size={24} className="finance-icon" />
          <div>
            <p className="finance-label">Jami to'lovlar (oy)</p>
            <h3 className="finance-value">847,500,000 so'm</h3>
            <span className="finance-change positive">+8.2% o'tgan oyga nisbatan</span>
          </div>
        </div>
        <div className="finance-card">
          <CheckCircle size={24} className="finance-icon success" />
          <div>
            <p className="finance-label">To'langan</p>
            <h3 className="finance-value">734,200,000 so'm</h3>
            <span className="finance-change">86.6% to'lov darajasi</span>
          </div>
        </div>
        <div className="finance-card">
          <Clock size={24} className="finance-icon warning" />
          <div>
            <p className="finance-label">Kutilmoqda</p>
            <h3 className="finance-value">89,300,000 so'm</h3>
            <span className="finance-change">34 ta to'lov</span>
          </div>
        </div>
        <div className="finance-card">
          <XCircle size={24} className="finance-icon danger" />
          <div>
            <p className="finance-label">Muddati o'tgan</p>
            <h3 className="finance-value">24,000,000 so'm</h3>
            <span className="finance-change">12 ta qarzdor</span>
          </div>
        </div>
      </div>

      <div className="card payments-table-card">
        <div className="card-header">
          <h2>So'nggi to'lovlar</h2>
          <button className="btn-text">Barchasi</button>
        </div>
        <div className="payments-table">
          <table>
            <thead>
              <tr>
                <th>O'quvchi</th>
                <th>Summa</th>
                <th>Turi</th>
                <th>Sana</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment.id}>
                  <td>{payment.student}</td>
                  <td className="amount">{payment.amount} so'm</td>
                  <td>{payment.type}</td>
                  <td>{new Date(payment.date).toLocaleDateString('uz-UZ')}</td>
                  <td>
                    <span className={`payment-status ${payment.status}`}>
                      {payment.status === 'paid' && 'To\'langan'}
                      {payment.status === 'pending' && 'Kutilmoqda'}
                      {payment.status === 'overdue' && 'Muddati o\'tgan'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn"><Eye size={16} /></button>
                      <button className="icon-btn"><Download size={16} /></button>
                      <button className="icon-btn"><Mail size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const ReportsView = () => (
    <div className="reports-view">
      <div className="view-header">
        <h2>Hisobotlar markazi</h2>
        <button className="btn-primary">
          <Plus size={18} />
          Yangi hisobot
        </button>
      </div>

      <div className="reports-grid">
        <div className="report-card">
          <div className="report-icon">
            <BarChart3 size={32} />
          </div>
          <h3>Akademik natijaviylik</h3>
          <p>O'quvchilar va sinflar bo'yicha batafsil akademik hisobot</p>
          <button className="btn-secondary btn-sm">
            <Download size={16} />
            Yuklab olish
          </button>
        </div>

        <div className="report-card">
          <div className="report-icon">
            <Users size={32} />
          </div>
          <h3>O'qituvchilar faolligi</h3>
          <p>O'qituvchilarning platformadagi faolligi va yuklamalari</p>
          <button className="btn-secondary btn-sm">
            <Download size={16} />
            Yuklab olish
          </button>
        </div>

        <div className="report-card">
          <div className="report-icon">
            <Activity size={32} />
          </div>
          <h3>Davomat hisoboti</h3>
          <p>Barcha sinflar bo'yicha davomat statistikasi</p>
          <button className="btn-secondary btn-sm">
            <Download size={16} />
            Yuklab olish
          </button>
        </div>

        <div className="report-card">
          <div className="report-icon">
            <DollarSign size={32} />
          </div>
          <h3>Moliyaviy hisobot</h3>
          <p>To'lovlar, qarzdorlar va byudjet tahlili</p>
          <button className="btn-secondary btn-sm">
            <Download size={16} />
            Yuklab olish
          </button>
        </div>

        <div className="report-card">
          <div className="report-icon">
            <PieChart size={32} />
          </div>
          <h3>Taqqoslama tahlil</h3>
          <p>Sinflar va fanlar bo'yicha qiyosiy tahlil</p>
          <button className="btn-secondary btn-sm">
            <Download size={16} />
            Yuklab olish
          </button>
        </div>

        <div className="report-card">
          <div className="report-icon">
            <FileText size={32} />
          </div>
          <h3>Maxsus hisobot</h3>
          <p>Shaxsiy parametrlar bilan hisobot yaratish</p>
          <button className="btn-primary btn-sm">
            <Plus size={16} />
            Yaratish
          </button>
        </div>
      </div>

      <div className="card export-options">
        <div className="card-header">
          <h2>Eksport sozlamalari</h2>
        </div>
        <div className="export-formats">
          <button className="format-btn">
            <FileText size={24} />
            <span>PDF</span>
          </button>
          <button className="format-btn">
            <FileText size={24} />
            <span>Excel</span>
          </button>
          <button className="format-btn">
            <FileText size={24} />
            <span>Word</span>
          </button>
          <button className="format-btn">
            <Database size={24} />
            <span>CSV</span>
          </button>
        </div>
      </div>
    </div>
  );

  const SettingsView = () => (
    <div className="settings-view">
      <div className="view-header">
        <h2>Tizim sozlamalari</h2>
      </div>

      <div className="settings-grid">
        <div className="card">
          <div className="card-header">
            <h3>Maktab ma'lumotlari</h3>
            <button className="btn-text">Tahrirlash</button>
          </div>
          <div className="settings-form">
            <div className="form-row">
              <label>Maktab nomi</label>
              <input type="text" value={adminData.school} readOnly />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input type="email" value={adminData.email} readOnly />
            </div>
            <div className="form-row">
              <label>Telefon</label>
              <input type="tel" value={adminData.phone} readOnly />
            </div>
            <div className="form-row">
              <label>Manzil</label>
              <input type="text" value="Toshkent sh., Yunusobod t-n" readOnly />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Xavfsizlik sozlamalari</h3>
          </div>
          <div className="settings-section">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Parol murakkabligi</h4>
                <p>Minimal 8 belgi, raqam va maxsus belgilar</p>
              </div>
              <div className="toggle-switch active"></div>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <h4>2-faktorli autentifikatsiya</h4>
                <p>SMS yoki authenticator orqali tasdiqlash</p>
              </div>
              <div className="toggle-switch active"></div>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <h4>Sessiya muddati</h4>
                <p>Faollik yo'qligida avtomatik chiqish</p>
              </div>
              <select className="setting-select">
                <option>30 daqiqa</option>
                <option>1 soat</option>
                <option>2 soat</option>
                <option>4 soat</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Zaxiralash sozlamalari</h3>
          </div>
          <div className="settings-section">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Avtomatik zaxiralash</h4>
                <p>Har kuni soat 02:00 da</p>
              </div>
              <div className="toggle-switch active"></div>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <h4>Zaxira nusxalari soni</h4>
                <p>Saqlash uchun maksimal soni</p>
              </div>
              <select className="setting-select">
                <option>7 kun</option>
                <option>14 kun</option>
                <option>30 kun</option>
                <option>90 kun</option>
              </select>
            </div>
            <button className="btn-primary btn-full">
              <Database size={18} />
              Hozir zaxiralash
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Bildirishnomalar</h3>
          </div>
          <div className="settings-section">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Email bildirishnomalar</h4>
                <p>Muhim hodisalar haqida xabarnoma</p>
              </div>
              <div className="toggle-switch active"></div>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <h4>Xavfsizlik ogohlantirishlari</h4>
                <p>G'ayrioddiy faollik haqida darhol xabar</p>
              </div>
              <div className="toggle-switch active"></div>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <h4>Tizim yangilanishlari</h4>
                <p>Yangi versiyalar haqida ma'lumot</p>
              </div>
              <div className="toggle-switch"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'users': return <UsersView />;
      case 'academic': return <AcademicView />;
      case 'finance': return <FinanceView />;
      case 'reports': return <ReportsView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="admin-platform">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          background: #0f172a;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .admin-platform {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }

        /* Sidebar */
        .sidebar {
          width: 280px;
          background: #1e293b;
          border-right: 1px solid rgba(148, 163, 184, 0.1);
          color: white;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: fixed;
          height: 100vh;
          z-index: 1000;
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
        }

        .sidebar.closed {
          width: 80px;
        }

        .sidebar.closed .logo-text,
        .sidebar.closed nav span,
        .sidebar.closed .sidebar-footer span {
          opacity: 0;
          width: 0;
        }

        .sidebar-header {
          padding: 24px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
        }

        .logo-icon {
          font-size: 32px;
          filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.5));
        }

        .logo-text {
          font-size: 20px;
          font-weight: 800;
          background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          white-space: nowrap;
          transition: all 0.3s;
        }

        .sidebar-toggle {
          background: rgba(148, 163, 184, 0.1);
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.3s;
          flex-shrink: 0;
        }

        .sidebar-toggle:hover {
          background: rgba(148, 163, 184, 0.2);
          transform: scale(1.1);
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .sidebar-nav::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-nav::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.05);
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 3px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          margin-bottom: 4px;
          background: none;
          border: none;
          color: rgba(226, 232, 240, 0.7);
          width: 100%;
          text-align: left;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 14px;
          font-weight: 500;
          position: relative;
          overflow: hidden;
        }

        .nav-item span {
          white-space: nowrap;
          transition: all 0.3s;
        }

        .nav-item:hover {
          background: rgba(139, 92, 246, 0.1);
          color: white;
          transform: translateX(4px);
        }

        .nav-item.active {
          background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
          color: white;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 3px;
          background: white;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
        }

        /* Main Content */
        .main-content {
          flex: 1;
          margin-left: 280px;
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 100vh;
        }

        .sidebar.closed ~ .main-content {
          margin-left: 80px;
        }

        /* Header */
        .header {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(10px);
        }

        .header h1 {
          font-size: 24px;
          color: white;
          margin-bottom: 4px;
          font-weight: 700;
        }

        .header-subtitle {
          color: #94a3b8;
          font-size: 13px;
          font-weight: 500;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(148, 163, 184, 0.1);
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          transition: all 0.3s;
        }

        .search-box:focus-within {
          border-color: #8B5CF6;
          background: rgba(139, 92, 246, 0.1);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .search-box svg {
          color: #94a3b8;
        }

        .search-box input {
          border: none;
          background: none;
          outline: none;
          width: 200px;
          font-size: 14px;
          color: white;
        }

        .search-box input::placeholder {
          color: #64748b;
        }

        .icon-button {
          background: rgba(148, 163, 184, 0.1);
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          color: #94a3b8;
        }

        .icon-button:hover {
          background: rgba(139, 92, 246, 0.2);
          color: white;
          transform: scale(1.05);
        }

        .notification-dot {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid #1e293b;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          background: rgba(148, 163, 184, 0.05);
        }

        .user-profile:hover {
          background: rgba(148, 163, 184, 0.1);
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 600;
          font-size: 14px;
          color: white;
        }

        .user-role {
          font-size: 12px;
          color: #94a3b8;
        }

        /* Content Area */
        .content-area {
          padding: 32px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
          border-color: var(--accent-color);
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: var(--accent-color);
        }

        .stat-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: var(--accent-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .stat-content h3 {
          font-size: 36px;
          font-weight: 800;
          color: white;
          margin-bottom: 8px;
          line-height: 1;
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
        }

        .stat-trend.up {
          color: #10b981;
        }

        .stat-trend.down {
          color: #ef4444;
        }

        /* Content Grid */
        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }

        .card {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(148, 163, 184, 0.1);
          transition: all 0.3s;
        }

        .card:hover {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .card-header h2,
        .card-header h3 {
          font-size: 18px;
          color: white;
          font-weight: 700;
        }

        .btn-text {
          background: none;
          border: none;
          color: #8B5CF6;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-text:hover {
          color: #EC4899;
          transform: translateX(2px);
        }

        .btn-primary {
          background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
          font-size: 14px;
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.5);
        }

        .btn-primary.btn-sm {
          padding: 8px 16px;
          font-size: 13px;
        }

        .btn-primary.btn-full {
          width: 100%;
          justify-content: center;
        }

        .btn-secondary {
          background: rgba(148, 163, 184, 0.1);
          color: white;
          border: 1px solid rgba(148, 163, 184, 0.2);
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
          font-size: 14px;
        }

        .btn-secondary:hover {
          background: rgba(148, 163, 184, 0.2);
          border-color: #8B5CF6;
        }

        .btn-secondary.btn-sm {
          padding: 8px 16px;
          font-size: 13px;
        }

        .btn-icon {
          background: rgba(148, 163, 184, 0.1);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-icon:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: #8B5CF6;
        }

        /* System Status */
        .system-stats {
          display: grid;
          gap: 12px;
        }

        .system-stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .stat-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-icon-small {
          color: #8B5CF6;
        }

        .stat-info h4 {
          font-size: 14px;
          color: white;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 13px;
          color: #94a3b8;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse-status 2s infinite;
        }

        .status-indicator.normal {
          background: #10b981;
        }

        .status-indicator.warning {
          background: #f59e0b;
        }

        .status-indicator.critical {
          background: #ef4444;
        }

        @keyframes pulse-status {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* Security Alerts */
        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .alert-item {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 12px;
          border-left: 3px solid;
        }

        .alert-item.warning {
          border-left-color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }

        .alert-item.info {
          border-left-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }

        .alert-item.critical {
          border-left-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .alert-item svg {
          flex-shrink: 0;
          color: inherit;
        }

        .alert-content h4 {
          font-size: 14px;
          color: white;
          margin-bottom: 4px;
        }

        .alert-content p {
          font-size: 12px;
          color: #94a3b8;
        }

        /* Chart */
        .chart-placeholder {
          padding: 60px 20px;
          text-align: center;
          background: rgba(15, 23, 42, 0.3);
          border-radius: 12px;
          border: 2px dashed rgba(148, 163, 184, 0.2);
        }

        .chart-placeholder svg {
          color: #475569;
          margin-bottom: 16px;
        }

        .chart-placeholder p {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .chart-legend {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-top: 20px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #94a3b8;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }

        .period-selector {
          display: flex;
          gap: 8px;
          background: rgba(15, 23, 42, 0.5);
          padding: 4px;
          border-radius: 10px;
        }

        .period-selector button {
          background: none;
          border: none;
          color: #94a3b8;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 13px;
          font-weight: 600;
        }

        .period-selector button:hover {
          color: white;
        }

        .period-selector button.active {
          background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
          color: white;
        }

        /* Activity List */
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .activity-item {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.3);
          border-radius: 12px;
          transition: all 0.3s;
        }

        .activity-item:hover {
          background: rgba(15, 23, 42, 0.5);
        }

        .activity-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .activity-icon.assignment {
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
        }

        .activity-icon.user {
          background: linear-gradient(135deg, #EC4899 0%, #DB2777 100%);
        }

        .activity-icon.finance {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        .activity-icon.system {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        }

        .activity-content h4 {
          font-size: 14px;
          color: white;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .activity-content p {
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 6px;
        }

        .activity-time {
          font-size: 12px;
          color: #64748b;
        }

        /* Quick Actions */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .action-btn {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.1);
          color: white;
          padding: 20px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }

        .action-btn:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: #8B5CF6;
          transform: translateY(-2px);
        }

        .action-btn svg {
          color: #8B5CF6;
        }

        .action-btn span {
          font-size: 13px;
          font-weight: 600;
        }

        /* Users View */
        .users-view, .academic-view, .finance-view, .reports-view, .settings-view {
          padding: 32px;
        }

        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .view-header h2 {
          font-size: 32px;
          color: white;
          font-weight: 800;
        }

        .view-actions {
          display: flex;
          gap: 12px;
        }

        .filters-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .filter-select {
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(148, 163, 184, 0.05);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          color: white;
        }

        .filter-select:focus {
          outline: none;
          border-color: #8B5CF6;
          background: rgba(139, 92, 246, 0.1);
        }

        .filter-select option {
          background: #1e293b;
          color: white;
        }

        /* Table */
        .users-table, .payments-table {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: rgba(15, 23, 42, 0.5);
        }

        th {
          padding: 16px;
          text-align: left;
          font-weight: 700;
          color: #94a3b8;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        td {
          padding: 16px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.05);
          color: white;
          font-size: 14px;
        }

        tbody tr {
          transition: all 0.3s;
        }

        tbody tr:hover {
          background: rgba(139, 92, 246, 0.05);
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar-sm {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 14px;
        }

        .role-badge {
          background: rgba(139, 92, 246, 0.2);
          color: #a78bfa;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 12px;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 12px;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-badge.inactive {
          background: rgba(148, 163, 184, 0.2);
          color: #cbd5e1;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .icon-btn, .icon-btn-sm {
          background: rgba(148, 163, 184, 0.1);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #94a3b8;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
        }

        .icon-btn-sm {
          width: 28px;
          height: 28px;
        }

        .icon-btn:hover, .icon-btn-sm:hover {
          background: rgba(139, 92, 246, 0.2);
          color: #8B5CF6;
          border-color: #8B5CF6;
        }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-top: 24px;
        }

        .page-numbers {
          display: flex;
          gap: 8px;
        }

        .page-btn {
          background: rgba(148, 163, 184, 0.1);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 600;
        }

        .page-btn:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: #8B5CF6;
        }

        .page-btn.active {
          background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
          border-color: transparent;
        }

        /* Academic View */
        .academic-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: rgba(15, 23, 42, 0.5);
          padding: 6px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .tab-btn {
          background: none;
          border: none;
          color: #94a3b8;
          padding: 12px 24px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 600;
          font-size: 14px;
        }

        .tab-btn:hover {
          color: white;
          background: rgba(148, 163, 184, 0.1);
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
          color: white;
        }

        .classes-grid-admin {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .class-card-admin {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          transition: all 0.3s;
        }

        .class-card-admin:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .class-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .class-card-header h3 {
          font-size: 20px;
          color: white;
          font-weight: 700;
        }

        .card-actions {
          display: flex;
          gap: 6px;
        }

        .class-card-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }

        .class-info-row {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
          font-size: 14px;
        }

        .class-info-row svg {
          color: #8B5CF6;
        }

        /* Finance View */
        .finance-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .finance-card {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          display: flex;
          gap: 16px;
          align-items: start;
          transition: all 0.3s;
        }

        .finance-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }

        .finance-icon {
          color: #8B5CF6;
          flex-shrink: 0;
        }

        .finance-icon.success {
          color: #10b981;
        }

        .finance-icon.warning {
          color: #f59e0b;
        }

        .finance-icon.danger {
          color: #ef4444;
        }

        .finance-label {
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .finance-value {
          font-size: 24px;
          color: white;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .finance-change {
          font-size: 12px;
          color: #64748b;
        }

        .finance-change.positive {
          color: #10b981;
        }

        .amount {
          font-weight: 700;
          color: #8B5CF6;
        }

        .payment-status {
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 12px;
        }

        .payment-status.paid {
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .payment-status.pending {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .payment-status.overdue {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        /* Reports View */
        .reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .report-card {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          padding: 28px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          transition: all 0.3s;
          text-align: center;
        }

        .report-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .report-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8B5CF6;
        }

        .report-card h3 {
          font-size: 18px;
          color: white;
          margin-bottom: 12px;
          font-weight: 700;
        }

        .report-card p {
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .export-formats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 16px;
        }

        .format-btn {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.1);
          color: white;
          padding: 24px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .format-btn:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: #8B5CF6;
          transform: translateY(-2px);
        }

        .format-btn svg {
          color: #8B5CF6;
        }

        .format-btn span {
          font-size: 14px;
          font-weight: 600;
        }

        /* Settings View */
        .settings-grid {
          display: grid;
          gap: 24px;
          max-width: 1200px;
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-row label {
          font-size: 13px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-row input {
          padding: 12px 16px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.3s;
          background: rgba(15, 23, 42, 0.3);
          color: white;
        }

        .form-row input:focus {
          outline: none;
          border-color: #8B5CF6;
          background: rgba(139, 92, 246, 0.05);
        }

        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(15, 23, 42, 0.3);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 12px;
        }

        .setting-info h4 {
          font-size: 15px;
          color: white;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .setting-info p {
          font-size: 13px;
          color: #94a3b8;
        }

        .setting-select {
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: rgba(15, 23, 42, 0.5);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          color: white;
        }

        .setting-select:focus {
          outline: none;
          border-color: #8B5CF6;
        }

        .setting-select option {
          background: #1e293b;
        }

        .toggle-switch {
          width: 52px;
          height: 28px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          position: relative;
          transition: all 0.3s;
          cursor: pointer;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }

        .toggle-switch::before {
          content: '';
          position: absolute;
          width: 22px;
          height: 22px;
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch.active {
          background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
          border-color: transparent;
        }

        .toggle-switch.active::before {
          left: 26px;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .main-content {
            margin-left: 0;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .header {
            padding: 16px;
          }

          .header h1 {
            font-size: 18px;
          }

          .search-box {
            display: none;
          }

          .content-area, .users-view, .academic-view, .finance-view, .reports-view, .settings-view {
            padding: 16px;
          }

          .view-actions {
            flex-wrap: wrap;
          }

          .filters-bar {
            flex-direction: column;
          }
        }

        /* Animations */
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .stat-card, .card, .class-card-admin, .finance-card, .report-card {
          animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) backwards;
        }

        .stat-card:nth-child(1) { animation-delay: 0.05s; }
        .stat-card:nth-child(2) { animation-delay: 0.1s; }
        .stat-card:nth-child(3) { animation-delay: 0.15s; }
        .stat-card:nth-child(4) { animation-delay: 0.2s; }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        ::-webkit-scrollbar-track {
          background: #1e293b;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 6px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>

      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="content-area">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default OrganizationPage;
