import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Common/Navbar';

import { Camera, Bell, Settings, BookOpen, Users, BarChart3, MessageSquare, Calendar, FileText, Award, HelpCircle, ChevronDown, Plus, Search, Filter, Download, Edit, Trash2, Eye, Send, Clock, TrendingUp, AlertCircle, CheckCircle, Star, Video, Upload, Menu, X } from 'lucide-react';

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClass, setSelectedClass] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  // Sample data
  const teacherData = {
    name: "Nodira Karimova",
    position: "Matematika o'qituvchisi",
    specialty: "Algebra va geometriya",
    email: "n.karimova@maktab.uz",
    phone: "+998 90 123 45 67",
    avatar: null
  };

  const stats = [
    { label: "Bugungi darslar", value: "6", icon: BookOpen, color: "#FF6B9D" },
    { label: "Jami o'quvchilar", value: "147", icon: Users, color: "#4ECDC4" },
    { label: "O'rtacha baho", value: "4.3", icon: Star, color: "#FFE66D" },
    { label: "Bajarilgan topshiriqlar", value: "89%", icon: CheckCircle, color: "#95E1D3" }
  ];

  const classes = [
    { id: 1, name: "7-A sinf", subject: "Algebra", students: 28, avgGrade: 4.2 },
    { id: 2, name: "8-B sinf", subject: "Geometriya", students: 25, avgGrade: 4.5 },
    { id: 3, name: "9-A sinf", subject: "Algebra", students: 30, avgGrade: 4.1 },
    { id: 4, name: "10-A sinf", subject: "Geometriya", students: 27, avgGrade: 4.6 },
    { id: 5, name: "11-B sinf", subject: "Algebra", students: 24, avgGrade: 4.4 }
  ];

  const upcomingEvents = [
    { id: 1, title: "7-A sinf: Kvadrat tenglamalar", time: "09:00 - 09:45", type: "lesson" },
    { id: 2, title: "Metodik yig'ilish", time: "14:00 - 15:00", type: "meeting" },
    { id: 3, title: "8-B sinf topshiriq muddati", time: "Bugun, 18:00", type: "deadline" },
    { id: 4, title: "Ota-onalar yig'ini", time: "Ertaga, 16:00", type: "meeting" }
  ];

  const students = [
    { id: 1, name: "Anvar Toshmatov", class: "7-A", grade: 4.5, attendance: 95, avatar: null },
    { id: 2, name: "Dilnoza Rahimova", class: "7-A", grade: 4.8, attendance: 98, avatar: null },
    { id: 3, name: "Javohir Karimov", class: "7-A", grade: 3.9, attendance: 87, avatar: null },
    { id: 4, name: "Malika Usmonova", class: "7-A", grade: 4.6, attendance: 96, avatar: null }
  ];

  const assignments = [
    { id: 1, title: "Kvadrat tenglamalar yechish", class: "7-A", dueDate: "2026-02-05", submitted: 23, total: 28 },
    { id: 2, title: "Geometrik shakllar", class: "8-B", dueDate: "2026-02-03", submitted: 25, total: 25 },
    { id: 3, title: "Funksiyalar grafigi", class: "9-A", dueDate: "2026-02-07", submitted: 18, total: 30 }
  ];

  const messages = [
    { id: 1, from: "Anvar Toshmatov ota-onasi", message: "Bugungi dars haqida...", time: "10:30", unread: true },
    { id: 2, from: "Maktab ma'muriyati", message: "Yangi e'lon", time: "Kecha", unread: true },
    { id: 3, from: "Dilnoza Rahimova", message: "Uyga vazifa haqida savol", time: "2 kun oldin", unread: false }
  ];

  const Sidebar = () => (
    <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo-section">
          <div className="logo-icon">🎓</div>
          <h2 className="logo-text">EduPlatform</h2>
        </div>
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <BarChart3 size={20} />
          <span>Boshqaruv paneli</span>
        </button>
        <button className={`nav-item ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>
          <BookOpen size={20} />
          <span>Darslar va fanlar</span>
        </button>
        <button className={`nav-item ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
          <Users size={20} />
          <span>O'quvchilar</span>
        </button>
        <button className={`nav-item ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>
          <Award size={20} />
          <span>Baholash</span>
        </button>
        {/* TestAI - AI yordamida test yaratish */}
        <button className="nav-item testai-btn" onClick={() => navigate('/teacher/test-ai')} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <FileText size={20} />
          <span>🤖 TestAI</span>
        </button>
        <button className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
          <MessageSquare size={20} />
          <span>Xabarlar</span>
          {messages.filter(m => m.unread).length > 0 && (
            <span className="badge">{messages.filter(m => m.unread).length}</span>
          )}
        </button>
        <button className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
          <Calendar size={20} />
          <span>Kalendar</span>
        </button>
        <button className={`nav-item ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>
          <FileText size={20} />
          <span>Metodik resurslar</span>
        </button>
        <button className={`nav-item ${activeTab === 'help' ? 'active' : ''}`} onClick={() => setActiveTab('help')}>
          <HelpCircle size={20} />
          <span>Yordam</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={() => setActiveTab('settings')}>
          <Settings size={20} />
          <span>Sozlamalar</span>
        </button>
      </div>
    </div>
  );

  const Header = () => (
    <header className="header">
      <div className="header-left">
        <h1>Xush kelibsiz, {teacherData.name.split(' ')[0]}!</h1>
        <p className="header-subtitle">Bugun {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
          <div className="user-avatar">
            {teacherData.avatar ? <img src={teacherData.avatar} alt="Profile" /> : teacherData.name.charAt(0)}
          </div>
          <div className="user-info">
            <span className="user-name">{teacherData.name}</span>
            <span className="user-role">{teacherData.position}</span>
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
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
            <div className="stat-trend">
              <TrendingUp size={16} />
              <span>+12%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="content-grid">
        <div className="card upcoming-card">
          <div className="card-header">
            <h2>Yaqin voqealar</h2>
            <button className="btn-text">Barcha</button>
          </div>
          <div className="events-list">
            {upcomingEvents.map(event => (
              <div key={event.id} className="event-item">
                <div className={`event-indicator ${event.type}`}></div>
                <div className="event-content">
                  <h4>{event.title}</h4>
                  <p className="event-time">
                    <Clock size={14} />
                    {event.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card assignments-card">
          <div className="card-header">
            <h2>Topshiriqlar holati</h2>
            <button className="btn-primary btn-sm">
              <Plus size={16} />
              Yangi topshiriq
            </button>
          </div>
          <div className="assignments-list">
            {assignments.map(assignment => (
              <div key={assignment.id} className="assignment-item">
                <div className="assignment-info">
                  <h4>{assignment.title}</h4>
                  <p className="assignment-meta">{assignment.class} • Muddat: {new Date(assignment.dueDate).toLocaleDateString('uz-UZ')}</p>
                </div>
                <div className="assignment-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(assignment.submitted / assignment.total) * 100}%` }}></div>
                  </div>
                  <span className="progress-text">{assignment.submitted}/{assignment.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="card classes-overview">
          <div className="card-header">
            <h2>Mening sinflarim</h2>
            <Filter size={18} />
          </div>
          <div className="classes-grid">
            {classes.map(cls => (
              <div key={cls.id} className="class-card" onClick={() => setSelectedClass(cls)}>
                <div className="class-header">
                  <h3>{cls.name}</h3>
                  <span className="class-badge">{cls.subject}</span>
                </div>
                <div className="class-stats">
                  <div className="class-stat">
                    <Users size={16} />
                    <span>{cls.students} o'quvchi</span>
                  </div>
                  <div className="class-stat">
                    <Star size={16} />
                    <span>O'rtacha: {cls.avgGrade}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card announcements">
          <div className="card-header">
            <h2>Yangiliklar</h2>
            <Bell size={18} />
          </div>
          <div className="announcements-list">
            <div className="announcement-item">
              <AlertCircle size={18} className="announcement-icon" />
              <div>
                <h4>Yangi dasturiy ta'minot yangilanishi</h4>
                <p>Tizim bugun kechqurun 20:00 dan 22:00 gacha yangilanadi</p>
                <span className="announcement-time">2 soat oldin</span>
              </div>
            </div>
            <div className="announcement-item">
              <CheckCircle size={18} className="announcement-icon success" />
              <div>
                <h4>Choraklik hisobot topshirish</h4>
                <p>Choraklik hisobotlarni 5-fevralga qadar topshiring</p>
                <span className="announcement-time">1 kun oldin</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const StudentsView = () => (
    <div className="students-view">
      <div className="view-header">
        <h2>O'quvchilar ro'yxati</h2>
        <div className="view-actions">
          <div className="search-box">
            <Search size={18} />
            <input type="text" placeholder="O'quvchi qidirish..." />
          </div>
          <select className="filter-select">
            <option>Barcha sinflar</option>
            {classes.map(cls => <option key={cls.id}>{cls.name}</option>)}
          </select>
        </div>
      </div>

      <div className="students-table">
        <table>
          <thead>
            <tr>
              <th>O'quvchi</th>
              <th>Sinf</th>
              <th>O'rtacha baho</th>
              <th>Davomat</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id}>
                <td>
                  <div className="student-cell">
                    <div className="student-avatar">{student.name.charAt(0)}</div>
                    <span>{student.name}</span>
                  </div>
                </td>
                <td>{student.class}</td>
                <td>
                  <span className="grade-badge">{student.grade}</span>
                </td>
                <td>
                  <div className="attendance-bar">
                    <div className="attendance-fill" style={{ width: `${student.attendance}%` }}></div>
                    <span>{student.attendance}%</span>
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="icon-btn"><Eye size={16} /></button>
                    <button className="icon-btn"><MessageSquare size={16} /></button>
                    <button className="icon-btn"><Edit size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const MessagesView = () => (
    <div className="messages-view">
      <div className="messages-container">
        <div className="messages-list">
          <div className="messages-header">
            <h2>Xabarlar</h2>
            <button className="btn-primary btn-sm">
              <Plus size={16} />
              Yangi
            </button>
          </div>
          {messages.map(msg => (
            <div key={msg.id} className={`message-item ${msg.unread ? 'unread' : ''}`}>
              <div className="message-avatar">{msg.from.charAt(0)}</div>
              <div className="message-content">
                <div className="message-header">
                  <h4>{msg.from}</h4>
                  <span className="message-time">{msg.time}</span>
                </div>
                <p>{msg.message}</p>
              </div>
              {msg.unread && <div className="unread-indicator"></div>}
            </div>
          ))}
        </div>
        <div className="message-detail">
          <div className="empty-state">
            <MessageSquare size={48} />
            <h3>Xabar tanlang</h3>
            <p>Xabar ko'rish uchun chap tarafdan tanlang</p>
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsView = () => (
    <div className="settings-view">
      <h2>Shaxsiy kabinet va sozlamalar</h2>

      <div className="settings-grid">
        <div className="card profile-card">
          <div className="card-header">
            <h3>Profil ma'lumotlari</h3>
            <button className="btn-text">Tahrirlash</button>
          </div>
          <div className="profile-content">
            <div className="profile-avatar-section">
              <div className="profile-avatar-large">
                {teacherData.avatar ? <img src={teacherData.avatar} alt="Profile" /> : teacherData.name.charAt(0)}
              </div>
              <button className="btn-secondary btn-sm">
                <Camera size={16} />
                Rasmni o'zgartirish
              </button>
            </div>
            <div className="profile-details">
              <div className="detail-row">
                <label>To'liq ism</label>
                <input type="text" value={teacherData.name} readOnly />
              </div>
              <div className="detail-row">
                <label>Lavozim</label>
                <input type="text" value={teacherData.position} readOnly />
              </div>
              <div className="detail-row">
                <label>Mutaxassislik</label>
                <input type="text" value={teacherData.specialty} readOnly />
              </div>
              <div className="detail-row">
                <label>Email</label>
                <input type="email" value={teacherData.email} readOnly />
              </div>
              <div className="detail-row">
                <label>Telefon</label>
                <input type="tel" value={teacherData.phone} readOnly />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Xavfsizlik sozlamalari</h3>
          </div>
          <div className="settings-section">
            <button className="setting-item">
              <span>Parolni o'zgartirish</span>
              <ChevronDown size={18} />
            </button>
            <button className="setting-item">
              <span>Ikki bosqichli autentifikatsiya</span>
              <div className="toggle-switch"></div>
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Bildirishnomalar</h3>
          </div>
          <div className="settings-section">
            <button className="setting-item">
              <span>Email bildirishnomalar</span>
              <div className="toggle-switch active"></div>
            </button>
            <button className="setting-item">
              <span>Push bildirishnomalar</span>
              <div className="toggle-switch active"></div>
            </button>
            <button className="setting-item">
              <span>SMS bildirishnomalar</span>
              <div className="toggle-switch"></div>
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Interfeys sozlamalari</h3>
          </div>
          <div className="settings-section">
            <div className="setting-item">
              <label>Til</label>
              <select>
                <option>O'zbekcha</option>
                <option>Русский</option>
                <option>English</option>
              </select>
            </div>
            <button className="setting-item">
              <span>Qorong'i rejim</span>
              <div className="toggle-switch"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'students': return <StudentsView />;
      case 'messages': return <MessagesView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="teacher-platform">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Georgia', 'Palatino', 'Times New Roman', serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }

        .teacher-platform {
          display: flex;
          min-height: 100vh;
          background: #f8f9fd;
        }

        /* Sidebar Styles */
        .sidebar {
          width: 280px;
          background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
          position: fixed;
          height: 100vh;
          z-index: 1000;
          box-shadow: 4px 0 24px rgba(0,0,0,0.15);
        }

        .sidebar.closed {
          width: 80px;
        }

        .sidebar.closed .logo-text,
        .sidebar.closed nav span,
        .sidebar.closed .sidebar-footer span {
          display: none;
        }

        .sidebar-header {
          padding: 24px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          font-size: 32px;
        }

        .logo-text {
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sidebar-toggle {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.3s;
        }

        .sidebar-toggle:hover {
          background: rgba(255,255,255,0.1);
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          margin-bottom: 4px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.7);
          width: 100%;
          text-align: left;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 15px;
          position: relative;
        }

        .nav-item:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }

        .nav-item.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .badge {
          position: absolute;
          right: 12px;
          background: #ff4757;
          color: white;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 600;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        /* Main Content */
        .main-content {
          flex: 1;
          margin-left: 280px;
          transition: margin-left 0.3s ease;
        }

        .sidebar.closed ~ .main-content {
          margin-left: 80px;
        }

        /* Header */
        .header {
          background: white;
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          border-bottom: 1px solid #e5e7eb;
        }

        .header h1 {
          font-size: 28px;
          color: #1a1a2e;
          margin-bottom: 4px;
        }

        .header-subtitle {
          color: #6b7280;
          font-size: 14px;
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
          background: #f3f4f6;
          padding: 10px 16px;
          border-radius: 12px;
          border: 2px solid transparent;
          transition: all 0.3s;
        }

        .search-box:focus-within {
          border-color: #667eea;
          background: white;
        }

        .search-box input {
          border: none;
          background: none;
          outline: none;
          width: 200px;
          font-size: 14px;
        }

        .icon-button {
          background: #f3f4f6;
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
        }

        .icon-button:hover {
          background: #e5e7eb;
        }

        .notification-dot {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 8px;
          height: 8px;
          background: #ff4757;
          border-radius: 50%;
          border: 2px solid white;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .user-profile:hover {
          background: #f3f4f6;
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 18px;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 600;
          font-size: 14px;
          color: #1a1a2e;
        }

        .user-role {
          font-size: 12px;
          color: #6b7280;
        }

        /* Content Area */
        .content-area {
          padding: 32px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--accent-color);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: var(--accent-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          opacity: 0.9;
        }

        .stat-content h3 {
          font-size: 32px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 4px;
        }

        .stat-content p {
          font-size: 14px;
          color: #6b7280;
        }

        .stat-trend {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 4px;
          color: #10b981;
          font-size: 12px;
          font-weight: 600;
        }

        /* Content Grid */
        .content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f3f4f6;
        }

        .card-header h2 {
          font-size: 20px;
          color: #1a1a2e;
        }

        .btn-text {
          background: none;
          border: none;
          color: #667eea;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s;
        }

        .btn-text:hover {
          color: #764ba2;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
        }

        .btn-primary.btn-sm {
          padding: 8px 16px;
          font-size: 14px;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #1a1a2e;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-secondary.btn-sm {
          padding: 8px 16px;
          font-size: 14px;
        }

        /* Events */
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .event-item {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 12px;
          transition: all 0.3s;
        }

        .event-item:hover {
          background: #f3f4f6;
        }

        .event-indicator {
          width: 4px;
          border-radius: 2px;
          background: #667eea;
        }

        .event-indicator.lesson { background: #667eea; }
        .event-indicator.meeting { background: #f59e0b; }
        .event-indicator.deadline { background: #ef4444; }

        .event-content h4 {
          font-size: 15px;
          color: #1a1a2e;
          margin-bottom: 4px;
        }

        .event-time {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #6b7280;
        }

        /* Assignments */
        .assignments-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .assignment-item {
          padding: 16px;
          background: #f9fafb;
          border-radius: 12px;
        }

        .assignment-info h4 {
          font-size: 15px;
          color: #1a1a2e;
          margin-bottom: 4px;
        }

        .assignment-meta {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 12px;
        }

        .assignment-progress {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s;
        }

        .progress-text {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          min-width: 48px;
        }

        /* Classes Grid */
        .classes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .class-card {
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.3s;
        }

        .class-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(102, 126, 234, 0.4);
        }

        .class-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 16px;
        }

        .class-header h3 {
          font-size: 18px;
        }

        .class-badge {
          background: rgba(255,255,255,0.2);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .class-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .class-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          opacity: 0.9;
        }

        /* Announcements */
        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .announcement-item {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 12px;
        }

        .announcement-icon {
          color: #667eea;
          flex-shrink: 0;
        }

        .announcement-icon.success {
          color: #10b981;
        }

        .announcement-item h4 {
          font-size: 15px;
          color: #1a1a2e;
          margin-bottom: 4px;
        }

        .announcement-item p {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .announcement-time {
          font-size: 12px;
          color: #9ca3af;
        }

        /* Students View */
        .students-view, .messages-view, .settings-view {
          padding: 32px;
        }

        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .view-header h2 {
          font-size: 28px;
          color: #1a1a2e;
        }

        .view-actions {
          display: flex;
          gap: 12px;
        }

        .filter-select {
          padding: 10px 16px;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          background: white;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #667eea;
        }

        /* Table */
        .students-table {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        thead {
          background: #f9fafb;
        }

        th {
          padding: 16px;
          text-align: left;
          font-weight: 600;
          color: #6b7280;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        td {
          padding: 16px;
          border-top: 1px solid #f3f4f6;
        }

        tbody tr {
          transition: all 0.3s;
        }

        tbody tr:hover {
          background: #f9fafb;
        }

        .student-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .student-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }

        .grade-badge {
          background: #f0fdf4;
          color: #16a34a;
          padding: 4px 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
        }

        .attendance-bar {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .attendance-fill {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }

        .attendance-fill::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: var(--width);
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .icon-btn {
          background: #f3f4f6;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
        }

        .icon-btn:hover {
          background: #667eea;
          color: white;
        }

        /* Messages View */
        .messages-container {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 24px;
          height: calc(100vh - 200px);
        }

        .messages-list {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .messages-header {
          padding: 24px;
          border-bottom: 2px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .messages-header h2 {
          font-size: 20px;
          color: #1a1a2e;
        }

        .message-item {
          padding: 16px 24px;
          display: flex;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s;
          border-bottom: 1px solid #f3f4f6;
          position: relative;
        }

        .message-item:hover {
          background: #f9fafb;
        }

        .message-item.unread {
          background: #f0f9ff;
        }

        .message-avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          flex-shrink: 0;
        }

        .message-content {
          flex: 1;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .message-header h4 {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a2e;
        }

        .message-time {
          font-size: 12px;
          color: #9ca3af;
        }

        .message-content p {
          font-size: 13px;
          color: #6b7280;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .unread-indicator {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          background: #667eea;
          border-radius: 50%;
        }

        .message-detail {
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-state {
          text-align: center;
          color: #9ca3af;
        }

        .empty-state svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 18px;
          color: #6b7280;
          margin-bottom: 8px;
        }

        /* Settings View */
        .settings-grid {
          display: grid;
          gap: 24px;
          max-width: 1200px;
        }

        .profile-card {
          grid-column: 1 / -1;
        }

        .profile-content {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 32px;
        }

        .profile-avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .profile-avatar-large {
          width: 120px;
          height: 120px;
          border-radius: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 48px;
          font-weight: 600;
        }

        .profile-details {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .detail-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-row label {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-row input {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.3s;
        }

        .detail-row input:focus {
          outline: none;
          border-color: #667eea;
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
          background: #f9fafb;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          text-align: left;
          font-size: 15px;
          color: #1a1a2e;
        }

        .setting-item:hover {
          background: #f3f4f6;
        }

        .setting-item label {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          display: block;
        }

        .setting-item select {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .setting-item select:focus {
          outline: none;
          border-color: #667eea;
        }

        .toggle-switch {
          width: 48px;
          height: 24px;
          background: #e5e7eb;
          border-radius: 12px;
          position: relative;
          transition: all 0.3s;
        }

        .toggle-switch::before {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: all 0.3s;
        }

        .toggle-switch.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .toggle-switch.active::before {
          left: 26px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .messages-container {
            grid-template-columns: 1fr;
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
            font-size: 20px;
          }

          .search-box {
            display: none;
          }

          .content-area, .students-view, .messages-view, .settings-view {
            padding: 16px;
          }
        }

        /* Animations */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .stat-card, .card, .event-item, .assignment-item, .class-card {
          animation: slideIn 0.5s ease-out backwards;
        }

        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.3s; }
        .stat-card:nth-child(4) { animation-delay: 0.4s; }
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

export default TeacherDashboard;
