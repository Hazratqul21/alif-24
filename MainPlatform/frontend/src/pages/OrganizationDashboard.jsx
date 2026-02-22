import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';
import organizationService from '../services/organizationService';
import {
  BarChart3, Users, BookOpen, Settings, Search, Plus, TrendingUp,
  Building, LogOut, FileText, UserPlus, PieChart, Trash2, X, Check,
  Eye, ChevronRight, GraduationCap, Play
} from 'lucide-react';

const OrganizationDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);

  // Dashboard
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Teachers
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');

  // Students
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ first_name: '', last_name: '', phone: '', email: '', grade: '', password: '' });

  // Search (add user)
  const [showAddModal, setShowAddModal] = useState(null); // 'teacher' | 'student'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Classrooms
  const [classrooms, setClassrooms] = useState([]);

  // Lessons
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', subject: '', content: '', grade_level: '', video_url: '', language: 'uz' });
  const [lessonFile, setLessonFile] = useState(null);

  // Profile/Settings
  const [orgProfile, setOrgProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', address: '', district: '', phone: '', website: '', license_number: '' });
  const [saving, setSaving] = useState(false);

  // Student detail
  const [studentDetail, setStudentDetail] = useState(null);

  const showNotif = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const ol = {
    uz: { dashboard: 'Bosh sahifa', teachers: "O'qituvchilar", students: "O'quvchilar", classrooms: 'Sinflar', content: 'Darslar', settings: 'Sozlamalar' },
    ru: { dashboard: 'Главная', teachers: 'Учителя', students: 'Ученики', classrooms: 'Классы', content: 'Уроки', settings: 'Настройки' },
    en: { dashboard: 'Home', teachers: 'Teachers', students: 'Students', classrooms: 'Classrooms', content: 'Lessons', settings: 'Settings' },
  }[language] || { dashboard: 'Bosh sahifa', teachers: "O'qituvchilar", students: "O'quvchilar", classrooms: 'Sinflar', content: 'Darslar', settings: 'Sozlamalar' };

  const tabs = [
    { id: 'dashboard', label: ol.dashboard, icon: BarChart3 },
    { id: 'teachers', label: ol.teachers, icon: Users },
    { id: 'students', label: ol.students, icon: GraduationCap },
    { id: 'classrooms', label: ol.classrooms, icon: Building },
    { id: 'content', label: ol.content, icon: FileText },
    { id: 'settings', label: ol.settings, icon: Settings },
  ];

  // ============ DATA FETCHING ============

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await organizationService.getStats();
      setStats(res.stats || res.data?.stats || null);
    } catch (e) { console.error('Stats error:', e); }
    finally { setStatsLoading(false); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      setTeachersLoading(true);
      const [res, pendRes] = await Promise.allSettled([
        organizationService.getTeachers({ search: teacherSearch || undefined }),
        organizationService.getPendingTeachers(),
      ]);
      if (res.status === 'fulfilled') setTeachers(res.value.teachers || res.value.data?.teachers || []);
      if (pendRes.status === 'fulfilled') setPendingTeachers(pendRes.value.teachers || pendRes.value.data?.teachers || []);
    } catch (e) { console.error(e); }
    finally { setTeachersLoading(false); }
  }, [teacherSearch]);

  const fetchStudents = useCallback(async () => {
    try {
      setStudentsLoading(true);
      const res = await organizationService.getStudents({ search: studentSearch || undefined });
      setStudents(res.students || res.data?.students || []);
    } catch (e) { console.error(e); }
    finally { setStudentsLoading(false); }
  }, [studentSearch]);

  const fetchClassrooms = useCallback(async () => {
    try {
      const res = await organizationService.getClassrooms();
      setClassrooms(res.classrooms || res.data?.classrooms || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchLessons = useCallback(async () => {
    try {
      setLessonsLoading(true);
      const res = await organizationService.getLessons();
      setLessons(res.lessons || res.data?.lessons || []);
    } catch (e) { console.error(e); }
    finally { setLessonsLoading(false); }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await organizationService.getProfile();
      const p = res.profile || res.data?.profile || {};
      setOrgProfile(p);
      setProfileForm({ name: p.name || '', address: p.address || '', district: p.district || '', phone: p.phone || '', website: p.website || '', license_number: p.license_number || '' });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'teachers') fetchTeachers();
    if (activeTab === 'students') fetchStudents();
    if (activeTab === 'classrooms') fetchClassrooms();
    if (activeTab === 'content') fetchLessons();
    if (activeTab === 'settings') fetchProfile();
  }, [activeTab, fetchTeachers, fetchStudents, fetchClassrooms, fetchLessons, fetchProfile]);

  // ============ ACTIONS ============

  const handleSearchUser = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const res = await organizationService.searchUser(searchQuery.trim());
      setSearchResults(res.users || res.data?.users || []);
    } catch (e) { showNotif('error', 'Qidirishda xatolik'); }
    finally { setSearching(false); }
  };

  const handleAddUser = async (userId) => {
    try {
      if (showAddModal === 'teacher') {
        await organizationService.addTeacher(userId);
        showNotif('success', "O'qituvchi qo'shildi!");
        fetchTeachers();
      } else {
        await organizationService.addStudent(userId);
        showNotif('success', "O'quvchi qo'shildi!");
        fetchStudents();
      }
      setShowAddModal(null);
      setSearchQuery('');
      setSearchResults([]);
      fetchStats();
    } catch (e) {
      showNotif('error', e.message || e.detail || 'Xatolik');
    }
  };

  const handleReviewTeacher = async (userId, action) => {
    try {
      await organizationService.reviewTeacher(userId, action);
      showNotif('success', action === 'approve' ? 'Tasdiqlandi' : 'Rad etildi');
      fetchTeachers();
      fetchStats();
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
  };

  const handleRemoveTeacher = async (userId) => {
    if (!confirm("O'qituvchini olib tashlamoqchimisiz?")) return;
    try {
      await organizationService.removeTeacher(userId);
      showNotif('success', 'Olib tashlandi');
      fetchTeachers();
      fetchStats();
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
  };

  const handleRemoveStudent = async (userId) => {
    if (!confirm("O'quvchini olib tashlamoqchimisiz?")) return;
    try {
      await organizationService.removeStudent(userId);
      showNotif('success', 'Olib tashlandi');
      fetchStudents();
      fetchStats();
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
  };

  const handleCreateStudent = async () => {
    if (!newStudent.first_name || !newStudent.last_name) return showNotif('error', 'Ism va familiya kerak');
    try {
      setSaving(true);
      await organizationService.createStudent(newStudent);
      showNotif('success', "O'quvchi yaratildi!");
      setShowCreateStudent(false);
      setNewStudent({ first_name: '', last_name: '', phone: '', email: '', grade: '', password: '' });
      fetchStudents();
      fetchStats();
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
    finally { setSaving(false); }
  };

  const handleCreateLesson = async () => {
    if (!lessonForm.title) return showNotif('error', 'Dars nomini kiriting');
    try {
      setSaving(true);
      const payload = { ...lessonForm };
      if (lessonFile) {
        try {
          const upRes = await organizationService.uploadFile(lessonFile);
          const fileData = upRes.data || upRes;
          if (fileData?.url) {
            payload.attachments = [{ name: lessonFile.name, url: fileData.url, size: fileData.size || lessonFile.size }];
          }
        } catch (e) { console.warn('File upload failed:', e); }
      }
      await organizationService.createLesson(payload);
      showNotif('success', 'Dars yaratildi!');
      setShowCreateLesson(false);
      setLessonForm({ title: '', subject: '', content: '', grade_level: '', video_url: '', language: 'uz' });
      setLessonFile(null);
      fetchLessons();
      fetchStats();
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
    finally { setSaving(false); }
  };

  const handleDeleteLesson = async (id) => {
    if (!confirm("Darsni o'chirmoqchimisiz?")) return;
    try {
      await organizationService.deleteLesson(id);
      showNotif('success', "O'chirildi");
      fetchLessons();
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await organizationService.updateProfile(profileForm);
      showNotif('success', 'Profil saqlandi!');
      fetchProfile();
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
    finally { setSaving(false); }
  };

  const handleViewStudent = async (userId) => {
    try {
      const res = await organizationService.getStudentDetail(userId);
      setStudentDetail(res.student || res.data?.student || null);
    } catch (e) { showNotif('error', 'Xatolik'); }
  };

  // ============ MODAL ============

  const renderModal = (show, onClose, title, children) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#1e1e3a] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white p-1 bg-transparent border-none cursor-pointer"><X size={20} /></button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  // ============ RENDER: DASHBOARD ============

  const renderDashboard = () => {
    const s = stats || {};
    const statCards = [
      { icon: Users, value: s.total_teachers || 0, label: "O'qituvchilar", color: 'from-blue-500 to-blue-600' },
      { icon: GraduationCap, value: s.total_students || 0, label: "O'quvchilar", color: 'from-green-500 to-green-600' },
      { icon: Building, value: s.total_classrooms || 0, label: 'Sinflar', color: 'from-purple-500 to-purple-600' },
      { icon: FileText, value: s.total_lessons || 0, label: 'Darslar', color: 'from-amber-500 to-amber-600' },
    ];

    return (
      <div className="space-y-6">
        {statsLoading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map((st, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all">
                  <div className={`w-10 h-10 bg-gradient-to-br ${st.color} rounded-xl flex items-center justify-center mb-3`}>
                    <st.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white">{st.value}</div>
                  <div className="text-sm text-white/60">{st.label}</div>
                </div>
              ))}
            </div>

            {(s.pending_teachers || 0) > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-amber-400" /></div>
                  <div>
                    <span className="text-amber-300 font-medium">{s.pending_teachers} ta o'qituvchi</span>
                    <span className="text-white/40 text-sm ml-2">tasdiqlashni kutmoqda</span>
                  </div>
                </div>
                <button onClick={() => setActiveTab('teachers')} className="bg-amber-500/20 text-amber-300 px-4 py-2 rounded-xl text-sm font-medium border-none cursor-pointer hover:bg-amber-500/30 transition-colors">Ko'rish</button>
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Tezkor harakatlar</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => { setShowAddModal('teacher'); }} className="flex items-center gap-3 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
                  <UserPlus size={20} /><span className="font-medium text-sm">O'qituvchi qo'shish</span>
                </button>
                <button onClick={() => { setShowAddModal('student'); }} className="flex items-center gap-3 bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
                  <UserPlus size={20} /><span className="font-medium text-sm">O'quvchi qo'shish</span>
                </button>
                <button onClick={() => setActiveTab('content')} className="flex items-center gap-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
                  <FileText size={20} /><span className="font-medium text-sm">Dars yaratish</span>
                </button>
                <button onClick={() => setActiveTab('classrooms')} className="flex items-center gap-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
                  <Building size={20} /><span className="font-medium text-sm">Sinflar</span>
                </button>
                <button onClick={() => {
                  const token = localStorage.getItem('accessToken');
                  const refresh = localStorage.getItem('refreshToken');
                  let url = 'https://crm.alif24.uz';
                  if (token) {
                    const params = new URLSearchParams();
                    params.set('token', token);
                    if (refresh) params.set('refresh', refresh);
                    url += `?${params.toString()}`;
                  }
                  window.location.href = url;
                }} className="flex items-center gap-3 bg-gradient-to-br from-pink-500 to-rose-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
                  <PieChart size={20} /><span className="font-medium text-sm">CRM Panel</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ============ RENDER: TEACHERS ============

  const renderTeachers = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">O'qituvchilar</h3>
        <button onClick={() => setShowAddModal('teacher')} className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform text-sm font-medium">
          <Plus size={16} /> Qo'shish
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input type="text" placeholder="Qidirish (ism, telefon, email)..." value={teacherSearch}
          onChange={e => setTeacherSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
      </div>

      {pendingTeachers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
          <h4 className="text-amber-300 font-medium mb-3">Tasdiqlashni kutayotganlar ({pendingTeachers.length})</h4>
          <div className="space-y-2">
            {pendingTeachers.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-300 font-bold text-sm">{t.first_name?.charAt(0)}</div>
                  <div>
                    <div className="text-sm font-medium text-white">{t.first_name} {t.last_name}</div>
                    <div className="text-xs text-white/40">{t.email || t.phone || ''} {t.specialization ? `• ${t.specialization}` : ''}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReviewTeacher(t.id, 'approve')} className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer hover:bg-green-500/30"><Check size={14} /></button>
                  <button onClick={() => handleReviewTeacher(t.id, 'reject')} className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer hover:bg-red-500/30"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {teachersLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin" /></div>
      ) : teachers.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">Hozircha o'qituvchi yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teachers.map(t => (
            <div key={t.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">{t.first_name?.charAt(0)}</div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{t.first_name} {t.last_name}</div>
                  <div className="text-xs text-white/40">{t.email || t.phone || `ID: ${t.id}`} {t.specialization ? `• ${t.specialization}` : ''}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.verification_status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{t.verification_status || 'pending'}</span>
                    {t.total_classrooms > 0 && <span className="text-[10px] text-white/30">{t.total_classrooms} sinf</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => handleRemoveTeacher(t.id)} className="text-white/20 hover:text-red-400 p-2 bg-transparent border-none cursor-pointer transition"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============ RENDER: STUDENTS ============

  const renderStudents = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">O'quvchilar</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateStudent(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:bg-green-700 text-sm font-medium">
            <Plus size={16} /> Yangi yaratish
          </button>
          <button onClick={() => setShowAddModal('student')} className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform text-sm font-medium">
            <UserPlus size={16} /> Mavjudni qo'shish
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input type="text" placeholder="Qidirish (ism, ID, telefon)..." value={studentSearch}
          onChange={e => setStudentSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
      </div>

      {studentsLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin" /></div>
      ) : students.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <GraduationCap className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">Hozircha o'quvchi yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {students.map(s => (
            <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => handleViewStudent(s.id)}>
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">{s.first_name?.charAt(0)}</div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{s.first_name} {s.last_name}</div>
                  <div className="text-xs text-white/40">
                    {s.grade ? `${s.grade} • ` : ''}{s.email || s.phone || `ID: ${s.id}`}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/30">Lv.{s.level || 1}</span>
                    <span className="text-[10px] text-white/30">{s.total_points || 0} ball</span>
                    {s.total_lessons_completed > 0 && <span className="text-[10px] text-white/30">{s.total_lessons_completed} dars</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleViewStudent(s.id)} className="text-white/20 hover:text-blue-400 p-2 bg-transparent border-none cursor-pointer transition"><Eye size={16} /></button>
                <button onClick={() => handleRemoveStudent(s.id)} className="text-white/20 hover:text-red-400 p-2 bg-transparent border-none cursor-pointer transition"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============ RENDER: CLASSROOMS ============

  const renderClassrooms = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Sinflar</h3>
      {classrooms.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <Building className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">Hozircha sinf yo'q</p>
          <p className="text-white/30 text-sm mt-1">O'qituvchilar sinf yaratganda bu yerda ko'rinadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classrooms.map(c => (
            <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-white font-bold">{c.name}</h4>
                  <div className="text-xs text-white/40 mt-0.5">{c.subject || ''} {c.grade_level ? `• ${c.grade_level}` : ''}</div>
                </div>
                <span className="bg-[#4b30fb]/20 text-[#4b30fb] px-2 py-0.5 rounded-full text-[10px] font-bold">{c.invite_code}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-white/50">
                  <GraduationCap size={14} /> <span>{c.student_count || 0} o'quvchi</span>
                </div>
                <div className="text-white/40 text-xs">{c.teacher?.name || ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============ RENDER: LESSONS ============

  const renderLessons = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">Darslar</h3>
        <button onClick={() => setShowCreateLesson(true)} className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform text-sm font-medium">
          <Plus size={16} /> Yangi dars
        </button>
      </div>
      {lessonsLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin" /></div>
      ) : lessons.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">Hozircha dars yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map(l => (
            <div key={l.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="text-white font-medium text-sm">{l.title}</h4>
                <div className="text-xs text-white/40 mt-0.5">{l.subject || ''} {l.grade_level ? `• ${l.grade_level}` : ''}</div>
                <div className="flex items-center gap-2 mt-1">
                  {l.video_url && <a href={l.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"><Play size={12} /> Video</a>}
                  {l.attachments && l.attachments.length > 0 && l.attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs">📎 {att.name || `Fayl`}</a>
                  ))}
                </div>
              </div>
              <button onClick={() => handleDeleteLesson(l.id)} className="text-white/20 hover:text-red-400 p-2 bg-transparent border-none cursor-pointer transition shrink-0"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============ RENDER: SETTINGS ============

  const renderSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-white">Tashkilot sozlamalari</h3>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-white/60 text-xs mb-1 block">Tashkilot nomi</label>
            <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb] text-sm" />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1 block">Tuman/Shahar</label>
            <input type="text" value={profileForm.district} onChange={e => setProfileForm({ ...profileForm, district: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb] text-sm" />
          </div>
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1 block">Manzil</label>
          <input type="text" value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb] text-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-white/60 text-xs mb-1 block">Telefon</label>
            <input type="text" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb] text-sm" />
          </div>
          <div>
            <label className="text-white/60 text-xs mb-1 block">Veb sayt</label>
            <input type="text" value={profileForm.website} onChange={e => setProfileForm({ ...profileForm, website: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb] text-sm" />
          </div>
        </div>
        <div>
          <label className="text-white/60 text-xs mb-1 block">Litsenziya raqami</label>
          <input type="text" value={profileForm.license_number} onChange={e => setProfileForm({ ...profileForm, license_number: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb] text-sm" />
        </div>
        <button onClick={handleSaveProfile} disabled={saving}
          className="bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-6 py-3 rounded-xl border-none cursor-pointer font-medium hover:scale-[1.02] transition-transform disabled:opacity-50">
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>
    </div>
  );

  // ============ RENDER: CONTENT SWITCH ============

  const renderContent = () => {
    switch (activeTab) {
      case 'teachers': return renderTeachers();
      case 'students': return renderStudents();
      case 'classrooms': return renderClassrooms();
      case 'content': return renderLessons();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
      <Navbar />

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-pulse ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {notification.message}
        </div>
      )}

      <div className="flex min-h-[calc(100vh-70px)]">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white/5 border-r border-white/10 p-4">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-full flex items-center justify-center text-white font-bold">
              {user?.first_name?.charAt(0) || 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.first_name} {user?.last_name}</div>
              <div className="text-xs text-white/40">{orgProfile?.name || 'Tashkilot'}</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border-none cursor-pointer ${activeTab === tab.id ? 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5 bg-transparent'}`}>
                <tab.icon size={18} />{tab.label}
              </button>
            ))}
          </nav>

          <button onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all border-none cursor-pointer bg-transparent w-full mt-4">
            <LogOut size={18} /> Chiqish
          </button>
        </aside>

        {/* Mobile Tab Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a2e] border-t border-white/10 flex z-[999] overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 px-1 text-[10px] gap-1 border-none cursor-pointer transition-colors min-w-0 ${activeTab === tab.id ? 'text-[#4b30fb] bg-transparent' : 'text-gray-400 bg-transparent'}`}>
              <tab.icon size={18} /><span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">{renderContent()}</div>
        </main>
      </div>

      {/* ADD USER MODAL (search + add) */}
      {renderModal(!!showAddModal, () => { setShowAddModal(null); setSearchQuery(''); setSearchResults([]); },
        showAddModal === 'teacher' ? "O'qituvchi qo'shish" : "O'quvchi qo'shish",
        <div className="space-y-4">
          <p className="text-white/50 text-sm">ID, telefon raqam yoki email orqali qidiring</p>
          <div className="flex gap-2">
            <input type="text" placeholder="ID, telefon yoki email..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
            <button onClick={handleSearchUser} disabled={searching}
              className="bg-[#4b30fb] text-white px-4 py-3 rounded-xl border-none cursor-pointer font-medium text-sm disabled:opacity-50">
              {searching ? '...' : 'Qidirish'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#4b30fb]/30 rounded-full flex items-center justify-center text-white text-xs font-bold">{u.first_name?.charAt(0)}</div>
                    <div>
                      <div className="text-sm text-white">{u.first_name} {u.last_name}</div>
                      <div className="text-xs text-white/40">{u.role} • {u.email || u.phone || u.id}</div>
                    </div>
                  </div>
                  <button onClick={() => handleAddUser(u.id)}
                    className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer hover:bg-green-500/30">
                    Qo'shish
                  </button>
                </div>
              ))}
            </div>
          )}
          {searchResults.length === 0 && searchQuery && !searching && (
            <p className="text-white/30 text-sm text-center">Natija topilmadi</p>
          )}
        </div>
      )}

      {/* CREATE STUDENT MODAL */}
      {renderModal(showCreateStudent, () => setShowCreateStudent(false), "Yangi o'quvchi yaratish",
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Ism *" value={newStudent.first_name} onChange={e => setNewStudent({ ...newStudent, first_name: e.target.value })}
              className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
            <input type="text" placeholder="Familiya *" value={newStudent.last_name} onChange={e => setNewStudent({ ...newStudent, last_name: e.target.value })}
              className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
          </div>
          <input type="text" placeholder="Telefon (ixtiyoriy)" value={newStudent.phone} onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
          <input type="email" placeholder="Email (ixtiyoriy)" value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
          <input type="text" placeholder="Sinf (masalan: 5-A)" value={newStudent.grade} onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
          <input type="password" placeholder="Parol (ixtiyoriy)" value={newStudent.password} onChange={e => setNewStudent({ ...newStudent, password: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
          <button onClick={handleCreateStudent} disabled={saving}
            className="w-full bg-gradient-to-br from-green-500 to-green-600 text-white py-3 rounded-xl border-none cursor-pointer font-bold disabled:opacity-50">
            {saving ? 'Yaratilmoqda...' : "O'quvchi yaratish"}
          </button>
        </div>
      )}

      {/* CREATE LESSON MODAL */}
      {renderModal(showCreateLesson, () => setShowCreateLesson(false), "Yangi dars yaratish",
        <div className="space-y-3">
          <input type="text" placeholder="Dars mavzusi *" value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
          <input type="text" placeholder="Fan (masalan: Fizika)" value={lessonForm.subject} onChange={e => setLessonForm({ ...lessonForm, subject: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
          <input type="text" placeholder="Sinf (masalan: 5-sinf, 9-A)" value={lessonForm.grade_level} onChange={e => setLessonForm({ ...lessonForm, grade_level: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
          <input type="text" placeholder="Video URL - ixtiyoriy" value={lessonForm.video_url} onChange={e => setLessonForm({ ...lessonForm, video_url: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm" />
          <div>
            <label className="text-white/60 text-xs mb-1 block">Fayl yuklash (ixtiyoriy)</label>
            <input type="file" onChange={e => setLessonFile(e.target.files[0] || null)}
              className="w-full text-sm text-white/60 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#4b30fb] file:text-white hover:file:bg-[#3d24d9] file:cursor-pointer" />
          </div>
          <textarea placeholder="Dars matni / Konspekt" value={lessonForm.content} onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] text-sm h-24 resize-none" />
          <button onClick={handleCreateLesson} disabled={saving}
            className="w-full bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white py-3 rounded-xl border-none cursor-pointer font-bold disabled:opacity-50">
            {saving ? 'Yaratilmoqda...' : 'Darsni saqlash'}
          </button>
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      {renderModal(!!studentDetail, () => setStudentDetail(null), "O'quvchi ma'lumotlari",
        studentDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">{studentDetail.first_name?.charAt(0)}</div>
              <div>
                <h4 className="text-white font-bold text-lg">{studentDetail.first_name} {studentDetail.last_name}</h4>
                <div className="text-white/40 text-sm">{studentDetail.grade || ''} • ID: {studentDetail.id}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-white font-bold text-lg">{studentDetail.level || 1}</div>
                <div className="text-white/40 text-xs">Daraja</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-white font-bold text-lg">{studentDetail.total_points || 0}</div>
                <div className="text-white/40 text-xs">Ball</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-white font-bold text-lg">{studentDetail.total_lessons_completed || 0}</div>
                <div className="text-white/40 text-xs">Darslar</div>
              </div>
            </div>
            {studentDetail.classrooms && studentDetail.classrooms.length > 0 && (
              <div>
                <h5 className="text-white/60 text-sm mb-2">Sinflari:</h5>
                <div className="space-y-1">
                  {studentDetail.classrooms.map(c => (
                    <div key={c.id} className="bg-white/5 rounded-lg px-3 py-2 text-sm text-white/80">{c.name} {c.subject ? `• ${c.subject}` : ''}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default OrganizationDashboard;
