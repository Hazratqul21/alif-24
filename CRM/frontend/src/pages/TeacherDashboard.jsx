import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';

import { Camera, Bell, Settings, BookOpen, Users, BarChart3, MessageSquare, Calendar, FileText, Award, HelpCircle, ChevronDown, Plus, Search, Filter, Download, Edit, Trash2, Eye, Send, Clock, TrendingUp, AlertCircle, CheckCircle, Star, Video, Upload, Menu, X, UserPlus, GraduationCap } from 'lucide-react';
import TestAIPage from '../modules/testai/pages/TestAIPage';
import { teacherService } from '../services/teacherService';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClass, setSelectedClass] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Settings state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new_password: '', confirm: '' });
  const [settingsToggles, setSettingsToggles] = useState(() => {
    const saved = localStorage.getItem('teacher_settings');
    return saved ? JSON.parse(saved) : {
      twoFactor: false, emailNotif: true, pushNotif: true, smsNotif: false, darkMode: false
    };
  });

  // Student detail & messaging state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageRecipient, setMessageRecipient] = useState(null);

  // Assignment creation state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', dueDate: '', classId: '' });

  // Verification Status
  const isVerified = user?.teacher_profile?.verification_status === 'approved';
  const isPending = user?.teacher_profile?.verification_status === 'pending';

  // Teacher profile data (derived from auth user)
  const teacherData = {
    name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'O\'qituvchi',
    position: user?.teacher_profile?.position || 'O\'qituvchi',
    specialty: user?.teacher_profile?.specialty || user?.teacher_profile?.subject || 'Umumiy',
    email: user?.email || '',
    phone: user?.phone || ''
  };

  // Real Data State
  const [classes, setClasses] = useState([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassData, setNewClassData] = useState({ name: '', subject: '', grade_level: '' });

  // Dashboard Widgets State
  const [dashboardStats, setDashboardStats] = useState([
    { label: "Bugungi darslar", value: "0", icon: BookOpen, color: "#FF6B9D" },
    { label: "Jami o'quvchilar", value: "0", icon: Users, color: "#4ECDC4" },
    { label: "O'rtacha baho", value: "0", icon: Star, color: "#FFE66D" },
    { label: "Bajarilgan topshiriqlar", value: "0%", icon: CheckCircle, color: "#95E1D3" }
  ]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [studentsList, setStudentsList] = useState([]); // Consolidated students list

  // Initial Data Fetch
  React.useEffect(() => {
    if (isVerified) {
      fetchClassrooms();
      fetchDashboardData();
    }
  }, [isVerified]);

  const fetchDashboardData = async () => {
    try {
      const stats = await teacherService.getDashboardStats();
      const events = await teacherService.getUpcomingEvents();
      const msgs = await teacherService.getMessages();
      const assigns = await teacherService.getAssignments();

      if (stats) {
        setDashboardStats([
          { label: "Bugungi darslar", value: stats.today_lessons || "0", icon: BookOpen, color: "#FF6B9D" },
          { label: "Jami o'quvchilar", value: stats.total_students || "0", icon: Users, color: "#4ECDC4" },
          { label: "O'rtacha baho", value: stats.average_score || "0", icon: Star, color: "#FFE66D" },
          { label: "Sinflar soni", value: stats.total_classrooms || "0", icon: CheckCircle, color: "#95E1D3" }
        ]);
      }
      setUpcomingEvents(events || []);
      setMessages(msgs || []);
      setAssignments(assigns || []);
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
    }
  };

  const fetchClassrooms = async () => {
    setIsLoadingClasses(true);
    try {
      const data = await teacherService.getMyClassrooms();
      setClasses(data);
    } catch (error) {
      console.error("Sinflarni yuklashda xatolik:", error);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const handleCreateClassroom = async () => {
    if (!newClassData.name || !newClassData.subject) {
      alert("Iltimos, sinf nomi va fanini kiriting!");
      return;
    }
    try {
      await teacherService.createClassroom(newClassData);
      alert("Sinf muvaffaqiyatli yaratildi!");
      setShowCreateModal(false);
      setNewClassData({ name: '', subject: '', grade_level: '' });
      fetchClassrooms(); // Refresh list
    } catch (error) {
      console.error(error);
      alert("Xatolik: " + (error.message || "Yaratib bo'lmadi"));
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await teacherService.searchStudents(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error(error);
      alert("Qidirishda xatolik yuz berdi");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddStudent = async (studentId) => {
    if (!selectedClass) {
      alert("Iltimos, avval sinfni tanlang (Sinflar bo'limidan)");
      return;
    }
    // Check if ID is UUID (simple check)
    if (!selectedClass) {
      alert("Iltimos, avval sinfni tanlang (Sinflar bo'limidan)");
      return;
    }
    // Check if ID is UUID (simple check is just length, no need for complex regex here if we removed demo data)
    // Removed demo check logic as we are removing demo data


    try {
      await teacherService.addStudentToClass(selectedClass.id, studentId);
      alert("O'quvchi sinfga qo'shildi!");
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      console.error(error);
      alert("Xatolik: " + (error.message || "Qo'shib bo'lmadi"));
    }
  };

  // Profile edit handlers
  const handleStartEditProfile = () => {
    setEditProfileData({ ...teacherData });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    try {
      await teacherService.updateProfile({
        first_name: editProfileData.name?.split(' ')[0],
        last_name: editProfileData.name?.split(' ').slice(1).join(' '),
        phone: editProfileData.phone
      });
      window.appAlert('Profil muvaffaqiyatli yangilandi!');
      setIsEditingProfile(false);
    } catch (error) {
      window.appAlert('Profilni yangilashda xatolik: ' + error.message);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      window.appAlert('Rasm hajmi 2MB dan oshmasligi kerak');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await teacherService.uploadAvatar(formData);
      window.appAlert('Avatar muvaffaqiyatli yuklandi!');
    } catch (error) {
      window.appAlert('Avatar yuklashda xatolik: ' + error.message);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm) {
      window.appAlert('Yangi parollar mos kelmaydi!');
      return;
    }
    if (passwordData.new_password.length < 6) {
      window.appAlert('Parol kamida 6 belgidan iborat bo\'lishi kerak');
      return;
    }
    try {
      await teacherService.changePassword({
        current_password: passwordData.current,
        new_password: passwordData.new_password
      });
      window.appAlert('Parol muvaffaqiyatli o\'zgartirildi!');
      setShowPasswordModal(false);
      setPasswordData({ current: '', new_password: '', confirm: '' });
    } catch (error) {
      window.appAlert('Parolni o\'zgartirishda xatolik: ' + error.message);
    }
  };

  const handleToggleSetting = (key) => {
    setSettingsToggles(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('teacher_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // Assignment creation
  const handleCreateAssignment = async () => {
    if (!newAssignment.title) {
      window.appAlert('Topshiriq nomini kiriting!');
      return;
    }
    try {
      const data = {
        title: newAssignment.title,
        description: newAssignment.description,
        due_date: newAssignment.dueDate,
        classroom_id: newAssignment.classId || classes[0]?.id
      };
      await teacherService.createAssignment(data);
      window.appAlert('Topshiriq muvaffaqiyatli yaratildi!');
      setShowAssignmentModal(false);
      setNewAssignment({ title: '', description: '', dueDate: '', classId: '' });
      fetchDashboardData();
    } catch (error) {
      window.appAlert('Topshiriq yaratishda xatolik: ' + error.message);
    }
  };

  // Student detail view
  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  // Messaging
  const handleOpenMessage = (recipient) => {
    setMessageRecipient(recipient);
    setMessageText('');
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    try {
      await teacherService.sendMessage({
        to_user_id: messageRecipient?.id,
        message: messageText
      });
      window.appAlert('Xabar yuborildi!');
      setShowMessageModal(false);
      setMessageText('');
    } catch (error) {
      window.appAlert('Xabar yuborishda xatolik: ' + error.message);
    }
  };

  // Removed Demo Data

  // Helper to load students for view
  React.useEffect(() => {
    // When switching to students tab or selecting class, reload students
    if (activeTab === 'students' && classes.length > 0) {
      // If a class is selected, show its students. Otherwise show all?
      // API doesn't have "get all students across all classes" easily yet.
      // We will just show students of the first class if none selected, or handle it.
      // For now, let's just make sure we don't crash.
    }
  }, [activeTab, classes]);

  const Sidebar = () => (
    <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo-section">
          <div className="logo-icon"><GraduationCap size={32} className="text-purple-600" /></div>
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
        {/* TestAI - AI yordamida test yaratish */}
        <button className={`nav-item ${activeTab === 'testai' ? 'active' : ''}`} onClick={() => setActiveTab('testai')} style={activeTab === 'testai' ? { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' } : {}}>
          <FileText size={20} />
          <span>🤖 TestAI</span>
        </button>
        <button className={`nav-item`} onClick={() => navigate('/live-quiz/create')} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
          <Award size={20} />
          <span>🎯 Live Quiz</span>
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
            {user?.avatar ? <img src={user.avatar} alt="Profile" /> : (user?.first_name ? user.first_name.charAt(0) : 'U')}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.first_name} {user?.last_name}</span>
            <span className="user-role">{t('auth_role_teacher')}</span>
          </div>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );

  const VerificationBanner = () => (
    <div style={{
      background: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
      color: 'white', padding: '15px 20px', margin: '20px', borderRadius: '12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%' }}>
          <Clock size={24} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Hisobingiz tekshirilmoqda</h3>
          <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '14px' }}>
            Sizning o'qituvchi profilingiz hozirda moderatorlar tomonidan tasdiqlanish jarayonida.
          </p>
        </div>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.8 }}>
          <CheckCircle size={16} /> Ro'yxatdan o'tish
        </div>
        <div style={{ width: '30px', height: '2px', background: 'rgba(255,255,255,0.4)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
          <Clock size={16} /> Tekshiruv
        </div>
        <div style={{ width: '30px', height: '2px', background: 'rgba(255,255,255,0.4)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.5 }}>
          <Award size={16} /> Tasdiqlash
        </div>
      </div>
    </div>
  );

  const DashboardView = () => (
    <div className="dashboard-view">
      {isPending && <VerificationBanner />}

      <div className="stats-grid">
        {dashboardStats.map((stat, index) => (
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
            {upcomingEvents.length === 0 ? <p style={{ padding: '10px', color: '#888' }}>Hozircha voqealar yo'q</p> : upcomingEvents.map(event => (
              <div key={event.id} className="event-item">
                <div className={`event-indicator ${event.type || 'lesson'}`}></div>
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
            <button className="btn-primary btn-sm" onClick={() => setShowAssignmentModal(true)}>
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
            <button
              className={`btn-primary btn-sm ${!isVerified ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => isVerified ? setShowCreateModal(true) : alert("Tasdiqlash kutilmoqda...")}
              disabled={!isVerified}
            >
              <Plus size={16} /> Yangi sinf
            </button>
          </div>
          {isLoadingClasses ? <p style={{ padding: 20 }}>Yuklanmoqda...</p> : (
            <div className="classes-grid">
              {classes.length === 0 ? <p style={{ padding: 20, color: '#666' }}>Sinflar mavjud emas. Yangi sinf yarating.</p> :
                classes.map(cls => (
                  <div key={cls.id} className="class-card" onClick={() => setSelectedClass(cls)}>
                    <div className="class-header">
                      <h3>{cls.name}</h3>
                      <span className="class-badge">{cls.subject}</span>
                    </div>
                    <div className="class-stats">
                      <div className="class-stat">
                        <Users size={16} />
                        <span>{cls.student_count || 0} o'quvchi</span>
                      </div>
                      <div className="class-stat">
                        <span>Kod: <strong>{cls.join_code}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* New: Quick Lesson Creator Card */}
        <div className="card quick-actions">
          <div className="card-header">
            <h2>Darslar konstruktori</h2>
            <Video size={18} />
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Yangi interaktiv dars va testlarni oson yarating.
            </p>
            <button
              className={`btn-primary ${!isVerified ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => isVerified ? navigate('/lesson-builder') : alert("Tasdiqlash kutilmoqda...")}
              disabled={!isVerified}
            >
              <Plus size={18} /> Yangi dars yaratish
            </button>
          </div>
        </div>

        {/* Create Classroom Modal */}
        {showCreateModal && (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
          }}>
            <div className="modal-content" style={{
              background: 'white', padding: '24px', borderRadius: '16px', width: '400px', maxWidth: '90%'
            }}>
              <h3>Yangi sinf yaratish</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                <input
                  type="text" placeholder="Sinf nomi (masalan: 7-A)"
                  className="form-input"
                  value={newClassData.name}
                  onChange={e => setNewClassData({ ...newClassData, name: e.target.value })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <input
                  type="text" placeholder="Fan (masalan: Matematika)"
                  className="form-input"
                  value={newClassData.subject}
                  onChange={e => setNewClassData({ ...newClassData, subject: e.target.value })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <input
                  type="text" placeholder="Sinf (masalan: 7-sinf)"
                  className="form-input"
                  value={newClassData.grade_level}
                  onChange={e => setNewClassData({ ...newClassData, grade_level: e.target.value })}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCreateModal(false)} className="btn-text">Bekor qilish</button>
                <button onClick={handleCreateClassroom} className="btn-primary">Yaratish</button>
              </div>
            </div>
          </div>
        )}

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
            <input
              type="text"
              placeholder="Email yoki Username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="btn-primary btn-sm" disabled={isSearching}>
              {isSearching ? '...' : 'Qidirish'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="search-results-dropdown" style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'white', border: '1px solid #ddd', borderRadius: '8px',
              padding: '10px', index: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h4>Qidiruv natijalari:</h4>
              {searchResults.map(result => (
                <div key={result.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #eee' }}>
                  <div>
                    <strong>{result.first_name} {result.last_name}</strong>
                    <br />
                    <small>{result.username} | {result.email}</small>
                  </div>
                  <button onClick={() => handleAddStudent(result.id)} className="btn-primary btn-sm">
                    <UserPlus size={16} /> Qo'shish
                  </button>
                </div>
              ))}
            </div>
          )}
          <select className="filter-select">
            <option value="">Barcha sinflar</option>
            {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
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
              {studentsList.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>O'quvchilar yo'q. Sinf tanlang yoki qo'shing.</td></tr> : studentsList.map(student => (
                <tr key={student.id}>
                  <td>
                    <div className="student-cell">
                      <div className="student-avatar">{student.first_name?.charAt(0)}</div>
                      <span>{student.first_name} {student.last_name}</span>
                    </div>
                  </td>
                  <td>{student.class_name || 'Noma\'lum'}</td>
                  <td>
                    <span className="grade-badge">{student.average_grade || '0'}</span>
                  </td>
                  <td>
                    <div className="attendance-bar">
                      <div className="attendance-fill" style={{ width: `${student.attendance || 0}%` }}></div>
                      <span>{student.attendance || 0}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn" title="Ko'rish" onClick={() => handleViewStudent(student)}><Eye size={16} /></button>
                      <button className="icon-btn" title="Xabar" onClick={() => handleOpenMessage(student)}><MessageSquare size={16} /></button>
                      <button className="icon-btn" title="Tahrirlash" onClick={() => handleViewStudent(student)}><Edit size={16} /></button>
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
            <button className="btn-primary btn-sm" onClick={() => { setMessageRecipient(null); setMessageText(''); setShowMessageModal(true); }}>
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

  const ToggleSwitch = ({ active, onToggle }) => (
    <div
      onClick={onToggle}
      className="toggle-switch-wrapper"
      style={{
        width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
        background: active ? '#10b981' : '#d1d5db', position: 'relative', transition: 'background 0.2s'
      }}
    >
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%', background: 'white',
        position: 'absolute', top: '2px', left: active ? '22px' : '2px',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }} />
    </div>
  );

  const SettingsView = () => (
    <div className="settings-view">
      <h2>Shaxsiy kabinet va sozlamalar</h2>

      <div className="settings-grid">
        <div className="card profile-card">
          <div className="card-header">
            <h3>Profil ma'lumotlari</h3>
            {isEditingProfile ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-text" onClick={() => setIsEditingProfile(false)}>Bekor</button>
                <button className="btn-primary btn-sm" onClick={handleSaveProfile}>Saqlash</button>
              </div>
            ) : (
              <button className="btn-text" onClick={handleStartEditProfile}>
                <Edit size={14} /> Tahrirlash
              </button>
            )}
          </div>
          <div className="profile-content">
            <div className="profile-avatar-section">
              <div className="profile-avatar-large">
                {user?.avatar ? <img src={user.avatar} alt="Profile" /> : user?.first_name?.charAt(0)}
              </div>
              <label className="btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                <Camera size={16} />
                Rasmni o'zgartirish
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              </label>
            </div>
            <div className="profile-details">
              <div className="detail-row">
                <label>To'liq ism</label>
                <input type="text"
                  value={isEditingProfile ? editProfileData.name : teacherData.name}
                  onChange={e => setEditProfileData({ ...editProfileData, name: e.target.value })}
                  readOnly={!isEditingProfile}
                  style={isEditingProfile ? { border: '2px solid #6366f1', background: '#f8fafc' } : {}}
                />
              </div>
              <div className="detail-row">
                <label>Lavozim</label>
                <input type="text"
                  value={isEditingProfile ? editProfileData.position : teacherData.position}
                  onChange={e => setEditProfileData({ ...editProfileData, position: e.target.value })}
                  readOnly={!isEditingProfile}
                  style={isEditingProfile ? { border: '2px solid #6366f1', background: '#f8fafc' } : {}}
                />
              </div>
              <div className="detail-row">
                <label>Mutaxassislik</label>
                <input type="text"
                  value={isEditingProfile ? editProfileData.specialty : teacherData.specialty}
                  onChange={e => setEditProfileData({ ...editProfileData, specialty: e.target.value })}
                  readOnly={!isEditingProfile}
                  style={isEditingProfile ? { border: '2px solid #6366f1', background: '#f8fafc' } : {}}
                />
              </div>
              <div className="detail-row">
                <label>Email</label>
                <input type="email" value={teacherData.email} readOnly />
              </div>
              <div className="detail-row">
                <label>Telefon</label>
                <input type="tel"
                  value={isEditingProfile ? editProfileData.phone : teacherData.phone}
                  onChange={e => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                  readOnly={!isEditingProfile}
                  style={isEditingProfile ? { border: '2px solid #6366f1', background: '#f8fafc' } : {}}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Xavfsizlik sozlamalari</h3>
          </div>
          <div className="settings-section">
            <button className="setting-item" onClick={() => setShowPasswordModal(true)}>
              <span>Parolni o'zgartirish</span>
              <ChevronDown size={18} />
            </button>
            <div className="setting-item">
              <span>Ikki bosqichli autentifikatsiya</span>
              <ToggleSwitch active={settingsToggles.twoFactor} onToggle={() => handleToggleSetting('twoFactor')} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Bildirishnomalar</h3>
          </div>
          <div className="settings-section">
            <div className="setting-item">
              <span>Email bildirishnomalar</span>
              <ToggleSwitch active={settingsToggles.emailNotif} onToggle={() => handleToggleSetting('emailNotif')} />
            </div>
            <div className="setting-item">
              <span>Push bildirishnomalar</span>
              <ToggleSwitch active={settingsToggles.pushNotif} onToggle={() => handleToggleSetting('pushNotif')} />
            </div>
            <div className="setting-item">
              <span>SMS bildirishnomalar</span>
              <ToggleSwitch active={settingsToggles.smsNotif} onToggle={() => handleToggleSetting('smsNotif')} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Interfeys sozlamalari</h3>
          </div>
          <div className="settings-section">
            <div className="setting-item">
              <span>Qorong'i rejim</span>
              <ToggleSwitch active={settingsToggles.darkMode} onToggle={() => handleToggleSetting('darkMode')} />
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Parolni o'zgartirish</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="password" placeholder="Joriy parol" value={passwordData.current}
                onChange={e => setPasswordData({ ...passwordData, current: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <input type="password" placeholder="Yangi parol" value={passwordData.new_password}
                onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <input type="password" placeholder="Yangi parolni tasdiqlang" value={passwordData.confirm}
                onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPasswordModal(false)} className="btn-text">Bekor</button>
              <button onClick={handleChangePassword} className="btn-primary">O'zgartirish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const PlaceholderView = ({ title, icon: Icon }) => (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ background: '#f3f4f6', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        {Icon && <Icon size={36} style={{ color: '#9ca3af' }} />}
      </div>
      <h2 style={{ color: '#374151', marginBottom: '8px' }}>{title}</h2>
      <p style={{ color: '#9ca3af' }}>Bu bo'lim tez orada ishga tushadi</p>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'classes': return <PlaceholderView title="Darslar va fanlar" icon={BookOpen} />;
      case 'students': return <StudentsView />;
      case 'grades': return <PlaceholderView title="Baholash" icon={Award} />;
      case 'messages': return <MessagesView />;
      case 'calendar': return <PlaceholderView title="Kalendar" icon={Calendar} />;
      case 'resources': return <PlaceholderView title="Metodik resurslar" icon={FileText} />;
      case 'help': return <PlaceholderView title="Yordam" icon={HelpCircle} />;
      case 'settings': return <SettingsView />;
      case 'testai': return <div className="p-6"><TestAIPage /></div>;
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
          position: relative;
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
            z-index: 1001;
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .main-content {
            margin-left: 0 !important;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .stat-card {
            padding: 16px;
          }

          .stat-content h3 {
            font-size: 22px;
          }

          .stat-icon {
            width: 40px;
            height: 40px;
          }

          .header {
            padding: 12px 16px;
            flex-wrap: wrap;
            gap: 8px;
          }

          .header h1 {
            font-size: 18px;
          }

          .header-right {
            gap: 8px;
          }

          .search-box {
            display: none;
          }

          .user-profile {
            padding: 4px 8px;
          }

          .user-info {
            display: none;
          }

          .content-area, .students-view, .messages-view, .settings-view {
            padding: 12px;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .classes-grid {
            grid-template-columns: 1fr;
          }

          .view-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .view-actions {
            flex-direction: column;
            width: 100%;
          }

          .students-table {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .students-table table {
            min-width: 600px;
          }

          .messages-container {
            grid-template-columns: 1fr;
            height: auto;
          }

          .message-detail {
            display: none;
          }

          .profile-content {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .profile-avatar-section {
            flex-direction: row;
            justify-content: center;
          }

          .profile-avatar-large {
            width: 80px;
            height: 80px;
            font-size: 32px;
            border-radius: 16px;
          }

          .card-header h2 {
            font-size: 16px;
          }

          .btn-primary {
            padding: 10px 16px;
            font-size: 13px;
          }

          .settings-grid {
            gap: 16px;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .header h1 {
            font-size: 16px;
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

      {sidebarOpen && window.innerWidth <= 768 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
          onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="content-area">
          {renderContent()}
        </div>
      </div>

      {/* Assignment Creation Modal */}
      {showAssignmentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '450px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>Yangi topshiriq yaratish</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Topshiriq nomi" value={newAssignment.title}
                onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
              <textarea placeholder="Tavsif (ixtiyoriy)" value={newAssignment.description}
                onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                rows={3} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', resize: 'none' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Muddat</label>
                  <input type="date" value={newAssignment.dueDate}
                    onChange={e => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Sinf</label>
                  <select value={newAssignment.classId}
                    onChange={e => setNewAssignment({ ...newAssignment, classId: e.target.value })}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%' }}>
                    <option value="">Tanlang</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAssignmentModal(false)} className="btn-text">Bekor</button>
              <button onClick={handleCreateAssignment} className="btn-primary">Yaratish</button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {showStudentModal && selectedStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '500px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>O'quvchi ma'lumotlari</h3>
              <button onClick={() => setShowStudentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                {selectedStudent.first_name?.charAt(0)}
              </div>
              <div>
                <h4 style={{ margin: 0 }}>{selectedStudent.first_name} {selectedStudent.last_name}</h4>
                <p style={{ margin: '4px 0 0', color: '#666' }}>{selectedStudent.email || selectedStudent.username || 'Sinf: ' + (selectedStudent.class_name || '-')}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: '#666' }}>O'rtacha baho</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{selectedStudent.average_grade || '0'}</p>
              </div>
              <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: '#666' }}>Davomat</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{selectedStudent.attendance || '0'}%</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowStudentModal(false); handleOpenMessage(selectedStudent); }} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                <MessageSquare size={16} /> Xabar yuborish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '450px', maxWidth: '90%' }}>
            <h3 style={{ marginBottom: '16px' }}>
              {messageRecipient ? `${messageRecipient.first_name} ${messageRecipient.last_name}ga xabar` : 'Yangi xabar'}
            </h3>
            {!messageRecipient && (
              <input type="text" placeholder="Qabul qiluvchi (ism yoki email)" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%', marginBottom: '12px' }} />
            )}
            <textarea placeholder="Xabar matni..." value={messageText}
              onChange={e => setMessageText(e.target.value)} rows={4}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%', resize: 'none' }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMessageModal(false)} className="btn-text">Bekor</button>
              <button onClick={handleSendMessage} className="btn-primary">
                <Send size={16} /> Yuborish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
