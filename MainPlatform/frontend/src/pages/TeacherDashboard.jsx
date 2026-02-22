import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';
import { teacherService } from '../services/teacherService';
import notificationService from '../services/notificationService';
import {
  BookOpen, Users, Award, BarChart3, Plus, Clock, CheckCircle,
  FileText, Settings, Bell, Search, Filter, ChevronRight,
  GraduationCap, Target, TrendingUp, Calendar, MessageSquare,
  Play, Eye, Edit, Trash2, ArrowLeft, LogOut, Zap, Copy,
  Send, UserPlus, X, ClipboardList, Hash, Mail, Phone, User as UserIcon
} from 'lucide-react';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Real data states
  const [classrooms, setClassrooms] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [classroomDetail, setClassroomDetail] = useState(null);

  // Modals
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [notification, setNotification] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);

  // Form states
  const [newClass, setNewClass] = useState({ name: '', subject: '', grade_level: '', description: '' });
  const [inviteData, setInviteData] = useState({ identifier: '', invitation_type: 'phone', message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newAssignment, setNewAssignment] = useState({
    title: '', description: '', assignment_type: 'homework',
    classroom_id: '', due_date: '', max_score: 100,
  });
  const [assignTarget, setAssignTarget] = useState('classroom');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newLesson, setNewLesson] = useState({ title: '', subject: '', grade_level: '', content: '', video_url: '' });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');

  const tabLabels = {
    uz: { dashboard: 'Bosh sahifa', classes: 'Sinflarim', lessons: 'Darslar', assignments: 'Vazifalar', livequiz: 'Live Quiz', settings: 'Sozlamalar' },
    ru: { dashboard: 'Главная', classes: 'Мои классы', lessons: 'Уроки', assignments: 'Задания', livequiz: 'Live Quiz', settings: 'Настройки' },
    en: { dashboard: 'Home', classes: 'My Classes', lessons: 'Lessons', assignments: 'Assignments', livequiz: 'Live Quiz', settings: 'Settings' },
  };
  const tl = tabLabels[language] || tabLabels.uz;

  const tabs = [
    { id: 'dashboard', label: tl.dashboard, icon: BarChart3 },
    { id: 'classes', label: tl.classes, icon: GraduationCap },
    { id: 'lessons', label: tl.lessons, icon: BookOpen },
    { id: 'assignments', label: tl.assignments, icon: ClipboardList },
    { id: 'livequiz', label: tl.livequiz, icon: Zap },
    { id: 'settings', label: tl.settings, icon: Settings },
  ];

  const showNotif = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleStudentClick = async (studentUserId) => {
    setStudentDetailLoading(true);
    try {
      const res = await teacherService.getStudentDetail(studentUserId);
      setStudentDetail(res.data || res);
    } catch (e) {
      showNotif('error', e.message || "O'quvchi ma'lumotlarini yuklashda xatolik");
    } finally {
      setStudentDetailLoading(false);
    }
  };

  // ============ DATA FETCHING ============

  const fetchClassrooms = useCallback(async () => {
    try {
      const res = await teacherService.getMyClassrooms();
      setClassrooms(res.data?.classes || []);
    } catch (e) { console.error('Classrooms fetch error:', e); }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await teacherService.getAssignments();
      setAssignments(res.data?.assignments || []);
    } catch (e) { console.error('Assignments fetch error:', e); }
  }, []);

  const fetchLessons = useCallback(async () => {
    try {
      const res = await teacherService.getLessons();
      setLessons(res.data || []);
    } catch (e) { console.error('Lessons fetch error:', e); }
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data?.unread_count || 0);
    } catch (e) { }
  }, []);

  useEffect(() => {
    fetchClassrooms();
    fetchAssignments();
    fetchLessons();
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchClassrooms, fetchAssignments, fetchLessons, fetchUnread]);

  const fetchClassroomDetail = async (id) => {
    try {
      setLoading(true);
      const res = await teacherService.getClassroomDetail(id);
      setClassroomDetail(res.data);
      setSelectedClassroom(id);
    } catch (e) { showNotif('error', 'Sinf yuklanmadi'); }
    finally { setLoading(false); }
  };

  // ============ ACTIONS ============

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClass.name.trim()) return showNotif('error', 'Sinf nomini kiriting');
    try {
      await teacherService.createClassroom(newClass);
      showNotif('success', 'Sinf yaratildi!');
      setShowCreateClass(false);
      setNewClass({ name: '', subject: '', grade_level: '', description: '' });
      fetchClassrooms();
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
  };

  const handleInviteStudent = async (e) => {
    e.preventDefault();
    if (!inviteData.identifier.trim()) return showNotif('error', 'Identifikator kiriting');
    try {
      const res = await teacherService.inviteStudent(selectedClassroom, inviteData);
      showNotif('success', res.message || 'Taklif yuborildi!');
      setShowInviteModal(false);
      setInviteData({ identifier: '', invitation_type: 'phone', message: '' });
      fetchClassroomDetail(selectedClassroom);
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
  };

  const handleSearchStudents = async () => {
    if (searchQuery.length < 2) return;
    try {
      const res = await teacherService.searchStudents(searchQuery);
      setSearchResults(res.data || []);
    } catch (e) { setSearchResults([]); }
  };

  const handleAddStudentDirect = async (studentUserId) => {
    if (!selectedClassroom) return;
    try {
      await teacherService.addStudentToClass(selectedClassroom, studentUserId);
      showNotif('success', "O'quvchi qo'shildi!");
      setSearchResults([]);
      setSearchQuery('');
      fetchClassroomDetail(selectedClassroom);
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!newLesson.title.trim()) return showNotif('error', 'Dars nomini kiriting');
    try {
      await teacherService.createLesson(newLesson);
      showNotif('success', 'Dars yaratildi!');
      setShowCreateLesson(false);
      setNewLesson({ title: '', subject: '', grade_level: '', content: '', video_url: '' });
      fetchLessons();
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssignment.title.trim()) return showNotif('error', 'Vazifa nomini kiriting');
    if (assignTarget === 'student' && selectedStudentIds.length === 0) {
      return showNotif('error', "Kamida bitta o'quvchini tanlang");
    }
    try {
      setLoading(true);
      const payload = { ...newAssignment };
      if (!payload.classroom_id) delete payload.classroom_id;
      if (!payload.due_date) delete payload.due_date;
      if (assignTarget === 'student' && selectedStudentIds.length > 0) {
        payload.target_student_ids = selectedStudentIds;
      }

      // Handle file upload first if present
      if (assignmentFile) {
        try {
          const upRes = await teacherService.uploadAssignmentFile(assignmentFile);
          if (upRes.url) {
            payload.attachments = [{
              name: assignmentFile.name,
              url: upRes.url,
              size: upRes.size || assignmentFile.size
            }];
          }
        } catch (upErr) {
          showNotif('error', upErr.message || 'Fayl yuklashda xatolik yuz berdi');
          setLoading(false);
          return;
        }
      }

      await teacherService.createAssignment(payload);
      showNotif('success', 'Vazifa yaratildi va yuborildi!');
      setShowCreateAssignment(false);
      setNewAssignment({ title: '', description: '', assignment_type: 'homework', classroom_id: '', due_date: '', max_score: 100 });
      setAssignTarget('classroom');
      setSelectedStudentIds([]);
      setAssignmentFile(null);
      setUploadProgress(0);
      fetchAssignments();
    } catch (e) {
      showNotif('error', e.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAITest = async () => {
    if (!aiPromptText || aiPromptText.length < 20) {
      showNotif('error', "Iltimos, yetarli uzunlikdagi matn kiriting (kamida 20 belgi)!");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await teacherService.generateAITest({
        text: aiPromptText,
        question_count: 5,
        difficulty: 'medium'
      });
      if (res.success && res.data) {
        const questions = res.data;
        let formatted = "AI Test natijasi:\n\n";
        questions.forEach((q, i) => {
          formatted += `${i + 1}. ${q.question}\n`;
          formatted += `A) ${q.options.a}\nB) ${q.options.b}\nC) ${q.options.c}\nD) ${q.options.d}\n`;
          formatted += `To'g'ri javob: ${q.correct_answer?.toUpperCase()}\n\n`;
        });
        setNewAssignment(prev => ({ ...prev, description: (prev.description ? prev.description + "\n\n" : "") + formatted }));
        setAiPromptText('');
        showNotif('success', 'Test muvaffaqiyatli yaratildi!');
      }
    } catch (err) {
      showNotif('error', err.message || "Test yaratishda xatolik yuz berdi");
    } finally {
      setAiGenerating(false);
    }
  };



  const handleDeleteClassroom = async (id) => {
    if (!confirm("Sinfni o'chirishni xohlaysizmi?")) return;
    try {
      await teacherService.deleteClassroom(id);
      showNotif('success', "Sinf o'chirildi");
      setSelectedClassroom(null);
      setClassroomDetail(null);
      fetchClassrooms();
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
  };

  const copyInviteCode = (code) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code);
      showNotif('success', 'Kod nusxalandi!');
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showNotif('success', 'Kod nusxalandi!');
      } catch (error) {
        showNotif('error', 'Nusxalashda xatolik');
      } finally {
        textArea.remove();
      }
    }
  };

  // ============ STATS ============

  const totalStudents = classrooms.reduce((sum, c) => sum + (c.student_count || 0), 0);
  const stats = [
    { icon: GraduationCap, value: classrooms.length, label: 'Sinflar', color: 'from-blue-500 to-blue-600' },
    { icon: BookOpen, value: lessons.length, label: 'Darslar', color: 'from-pink-500 to-pink-600' },
    { icon: Users, value: totalStudents, label: "O'quvchilar", color: 'from-green-500 to-green-600' },
    { icon: ClipboardList, value: assignments.length, label: 'Vazifalar', color: 'from-purple-500 to-purple-600' },
    { icon: Bell, value: unreadCount, label: 'Yangi xabarlar', color: 'from-amber-500 to-amber-600' },
  ];

  // ============ RENDER: DASHBOARD ============

  const renderDashboard = () => (
    <div className="space-y-6">
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

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Tezkor harakatlar</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => setShowCreateClass(true)}
            className="flex items-center gap-3 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
            <Plus size={20} /><span className="font-medium">Yangi sinf</span>
          </button>
          <button onClick={() => setShowCreateAssignment(true)}
            className="flex items-center gap-3 bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
            <ClipboardList size={20} /><span className="font-medium">Yangi vazifa</span>
          </button>
          <button onClick={() => navigate('/livequiz-teacher')}
            className="flex items-center gap-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
            <Zap size={20} /><span className="font-medium">Live Quiz</span>
          </button>
          <button onClick={() => setActiveTab('classes')}
            className="flex items-center gap-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
            <Users size={20} /><span className="font-medium">Sinflarim</span>
          </button>
        </div>
      </div>

      {classrooms.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Sinflarim</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {classrooms.slice(0, 4).map(c => (
              <div key={c.id} onClick={() => { setActiveTab('classes'); fetchClassroomDetail(c.id); }}
                className="flex items-center gap-4 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <GraduationCap size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{c.name}</div>
                  <div className="text-white/40 text-sm">{c.subject || 'Fan belgilanmagan'} &bull; {c.student_count || 0} ta o'quvchi</div>
                </div>
                <ChevronRight size={18} className="text-white/30" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ============ RENDER: CLASSES ============

  const renderClasses = () => (
    <div className="space-y-4">
      {selectedClassroom && classroomDetail ? renderClassDetail() : renderClassList()}
    </div>
  );

  const renderClassList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Sinflarim</h3>
        <button onClick={() => setShowCreateClass(true)}
          className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform text-sm font-medium">
          <Plus size={16} /> Yangi sinf
        </button>
      </div>
      {classrooms.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <GraduationCap className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">Hozircha sinf yo'q</p>
          <p className="text-white/40 text-sm mt-1">Yangi sinf yaratish uchun yuqoridagi tugmani bosing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classrooms.map(c => (
            <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <GraduationCap size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold">{c.name}</div>
                    <div className="text-white/40 text-sm">{c.subject || ''} {c.grade_level ? `| ${c.grade_level}` : ''}</div>
                  </div>
                </div>
                <button onClick={() => handleDeleteClassroom(c.id)}
                  className="text-white/30 hover:text-red-400 bg-transparent border-none cursor-pointer p-1">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-3 text-sm">
                <span className="text-white/60"><Users size={14} className="inline mr-1" />{c.student_count || 0} ta o'quvchi</span>
                <span className="text-white/60 flex items-center gap-1 cursor-pointer" onClick={() => copyInviteCode(c.invite_code)}>
                  <Hash size={14} />{c.invite_code} <Copy size={12} />
                </span>
              </div>
              <button onClick={() => fetchClassroomDetail(c.id)}
                className="w-full bg-white/5 hover:bg-white/10 text-white/80 py-2 rounded-xl border border-white/10 cursor-pointer text-sm font-medium transition-all">
                Batafsil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderClassDetail = () => {
    const cls = classroomDetail?.class;
    const students = classroomDetail?.students || [];
    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedClassroom(null); setClassroomDetail(null); }}
          className="flex items-center gap-2 text-white/60 hover:text-white bg-transparent border-none cursor-pointer text-sm">
          <ArrowLeft size={16} /> Ortga
        </button>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">{cls?.name}</h3>
              <p className="text-white/50 text-sm">{cls?.subject || ''} {cls?.grade_level ? `| ${cls.grade_level}` : ''}</p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 cursor-pointer" onClick={() => copyInviteCode(cls?.invite_code)}>
              <Hash size={14} className="text-white/60" />
              <span className="text-white font-mono font-bold">{cls?.invite_code}</span>
              <Copy size={14} className="text-white/40" />
            </div>
          </div>
          {cls?.description && <p className="text-white/60 text-sm mb-4">{cls.description}</p>}
          <div className="flex gap-3">
            <button onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-4 py-2 rounded-xl border-none cursor-pointer text-sm font-medium hover:scale-105 transition-transform">
              <UserPlus size={16} /> Taklif qilish
            </button>
            <button onClick={() => { setNewAssignment(prev => ({ ...prev, classroom_id: cls?.id })); setShowCreateAssignment(true); }}
              className="flex items-center gap-2 bg-gradient-to-br from-green-500 to-green-600 text-white px-4 py-2 rounded-xl border-none cursor-pointer text-sm font-medium hover:scale-105 transition-transform">
              <ClipboardList size={16} /> Vazifa berish
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-bold">O'quvchilar ({students.length})</h4>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input type="text" value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchStudents()}
                placeholder="Qidirish va qo'shish..."
                className="bg-white/10 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb] w-48" />
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="mb-4 bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <p className="text-white/40 text-xs">Topildi: {searchResults.length}</p>
              {searchResults.map(s => (
                <div key={s.user_id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="text-sm text-white">{s.first_name} {s.last_name} <span className="text-white/30">{s.phone || s.email}</span></div>
                  <button onClick={() => handleAddStudentDirect(s.user_id)}
                    className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-lg border-none cursor-pointer hover:bg-green-500/30">
                    Qo'shish
                  </button>
                </div>
              ))}
            </div>
          )}

          {students.length === 0 ? (
            <p className="text-center text-white/40 py-4">Hozircha o'quvchi yo'q</p>
          ) : (
            <div className="space-y-2">
              {students.map((s, i) => (
                <div key={s.user_id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer" onClick={() => handleStudentClick(s.user_id)}>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white font-medium">{s.first_name} {s.last_name}</div>
                    <div className="text-xs text-white/40">{s.phone || s.email || ''}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); teacherService.removeStudentFromClass(selectedClassroom, s.user_id).then(() => { showNotif('success', 'Chiqarildi'); fetchClassroomDetail(selectedClassroom); }).catch(err => showNotif('error', err.message)); }}
                    className="text-white/20 hover:text-red-400 bg-transparent border-none cursor-pointer p-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ RENDER: ASSIGNMENTS ============

  const renderAssignments = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Vazifalar</h3>
        <button onClick={() => setShowCreateAssignment(true)}
          className="flex items-center gap-2 bg-gradient-to-br from-green-500 to-green-600 text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform text-sm font-medium">
          <Plus size={16} /> Yangi vazifa
        </button>
      </div>
      {assignments.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <ClipboardList className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">Hozircha vazifa yo'q</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => (
            <div key={a.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-white font-bold">{a.title}</h4>
                  <p className="text-white/50 text-sm mt-1">{a.description || ''}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${a.assignment_type === 'homework' ? 'bg-blue-500/20 text-blue-400' :
                  a.assignment_type === 'test' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'
                  }`}>{a.assignment_type}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-white/40">
                {a.due_date && <span><Calendar size={14} className="inline mr-1" />{new Date(a.due_date).toLocaleDateString('uz')}</span>}
                <span><Users size={14} className="inline mr-1" />{a.total_students || 0} ta o'quvchi</span>
                <span><CheckCircle size={14} className="inline mr-1" />{a.submitted_count || 0} topshirdi</span>
                <span className="text-green-400"><Award size={14} className="inline mr-1" />{a.graded_count || 0} baholandi</span>
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Darslarim</h3>
        <button onClick={() => setShowCreateLesson(true)}
          className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform text-sm font-medium">
          <Plus size={16} /> Yangi dars
        </button>
      </div>
      {lessons.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <BookOpen className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">Hozircha dars yo'q</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map(l => (
            <div key={l.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all flex flex-col justify-between">
              <div>
                <h4 className="text-white font-bold text-lg mb-1">{l.title}</h4>
                <div className="text-sm flex items-center gap-2 text-white/40 mb-3">
                  {l.subject && <span>{l.subject}</span>}
                  {l.subject && l.grade_level && <span>•</span>}
                  {l.grade_level && <span>{l.grade_level}</span>}
                </div>
                {l.content && <p className="text-white/60 text-sm line-clamp-2 mb-3">{l.content}</p>}
              </div>
              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-white/10">
                <button onClick={() => { if (confirm("O'chirishni xohlaysizmi?")) { teacherService.deleteLesson(l.id).then(() => { showNotif('success', "O'chirildi"); fetchLessons(); }) } }} className="text-white/30 hover:text-red-400 p-1 bg-transparent border-none cursor-pointer transition">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============ RENDER: LIVE QUIZ ============

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
          <button onClick={() => navigate('/livequiz-teacher')}
            className="bg-gradient-to-br from-amber-500 to-amber-600 text-white px-6 py-3 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform font-medium flex items-center gap-2">
            <Play size={18} /> Boshlash
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
          <div className="flex items-center gap-3"><Bell size={18} className="text-white/60" /><span className="text-white">Bildirishnomalar</span></div>
          <ChevronRight size={18} className="text-white/40" />
        </div>
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
          <div className="flex items-center gap-3"><Settings size={18} className="text-white/60" /><span className="text-white">Profil sozlamalari</span></div>
          <ChevronRight size={18} className="text-white/40" />
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'classes': return renderClasses();
      case 'lessons': return renderLessons();
      case 'assignments': return renderAssignments();
      case 'livequiz': return renderLiveQuiz();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  // ============ MODALS ============

  const renderModal = (show, onClose, title, children) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
        <div className="bg-[#1e1e3a] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">{title}</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white bg-transparent border-none cursor-pointer"><X size={20} /></button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
      <Navbar />

      {notification && (
        <div className={`fixed top-20 right-4 z-[9999] px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>{notification.message}</div>
      )}

      <div className="flex min-h-[calc(100vh-70px)]">
        <aside className="hidden md:flex flex-col w-64 bg-white/5 border-r border-white/10 p-4">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-full flex items-center justify-center text-white font-bold">
              {user?.first_name?.charAt(0) || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.first_name} {user?.last_name}</div>
              <div className="text-xs text-white/40">O'qituvchi</div>
            </div>
          </div>
          <nav className="flex-1 space-y-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedClassroom(null); setClassroomDetail(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border-none cursor-pointer ${activeTab === tab.id ? 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5 bg-transparent'
                  }`}>
                <tab.icon size={18} />{tab.label}
                {tab.id === 'assignments' && unreadCount > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
              </button>
            ))}
          </nav>
          <button onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all border-none cursor-pointer bg-transparent w-full mt-4">
            <LogOut size={18} /> Chiqish
          </button>
        </aside>

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a2e] border-t border-white/10 flex z-[999] overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 px-1 text-[10px] gap-1 border-none cursor-pointer transition-colors min-w-0 ${activeTab === tab.id ? 'text-[#4b30fb] bg-transparent' : 'text-gray-400 bg-transparent'
                }`}>
              <tab.icon size={18} /><span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">{renderContent()}</div>
        </main>
      </div>

      {/* Create Class Modal */}
      {renderModal(showCreateClass, () => setShowCreateClass(false), 'Yangi sinf yaratish',
        <form onSubmit={handleCreateClass} className="space-y-4">
          <input type="text" placeholder="Sinf nomi *" value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]" />
          <input type="text" placeholder="Fan (masalan: Matematika)" value={newClass.subject} onChange={e => setNewClass({ ...newClass, subject: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]" />
          <select value={newClass.grade_level} onChange={e => setNewClass({ ...newClass, grade_level: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb] appearance-none">
            <option value="" className="bg-gray-800 text-white">Sinf darajasi</option>
            {['1-sinf', '2-sinf', '3-sinf', '4-sinf', '5-sinf', '6-sinf', '7-sinf', '8-sinf', '9-sinf', '10-sinf', '11-sinf'].map(g =>
              <option key={g} value={g} className="bg-gray-800 text-white">{g}</option>)}
          </select>
          <textarea placeholder="Tavsif (ixtiyoriy)" value={newClass.description} onChange={e => setNewClass({ ...newClass, description: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb] h-20 resize-none" />
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white py-3 rounded-xl border-none cursor-pointer font-bold disabled:opacity-50">
            {loading ? 'Bajarilmoqda...' : 'Sinf yaratish'}
          </button>
        </form>
      )}

      {/* Invite Student Modal */}
      {renderModal(showInviteModal, () => setShowInviteModal(false), "O'quvchini taklif qilish",
        <form onSubmit={handleInviteStudent} className="space-y-4">
          <div className="flex gap-2">
            {[{ v: 'phone', l: 'Telefon', ic: Phone }, { v: 'email', l: 'Email', ic: Mail }, { v: 'user_id', l: 'ID', ic: Hash }].map(opt => (
              <button key={opt.v} type="button" onClick={() => setInviteData({ ...inviteData, invitation_type: opt.v })}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium border-none cursor-pointer transition-all ${inviteData.invitation_type === opt.v ? 'bg-[#4b30fb] text-white' : 'bg-white/10 text-white/60'
                  }`}><opt.ic size={14} />{opt.l}</button>
            ))}
          </div>
          <input type="text" placeholder={inviteData.invitation_type === 'phone' ? '+998901234567' : inviteData.invitation_type === 'email' ? 'email@example.com' : 'User ID'}
            value={inviteData.identifier} onChange={e => setInviteData({ ...inviteData, identifier: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]" />
          <textarea placeholder="Xabar (ixtiyoriy)" value={inviteData.message} onChange={e => setInviteData({ ...inviteData, message: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb] h-16 resize-none" />
          <button type="submit" className="w-full bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white py-3 rounded-xl border-none cursor-pointer font-bold">
            <Send size={16} className="inline mr-2" />Taklif yuborish
          </button>
        </form>
      )}

      {/* Create Assignment Modal */}
      {renderModal(showCreateAssignment, () => setShowCreateAssignment(false), 'Yangi vazifa yaratish',
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <input type="text" placeholder="Vazifa nomi *" value={newAssignment.title} onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]" />
          <textarea placeholder="Tavsif" value={newAssignment.description} onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb] h-20 resize-none" />
          <select value={newAssignment.classroom_id} onChange={e => {
            setNewAssignment({ ...newAssignment, classroom_id: e.target.value });
            if (e.target.value !== selectedClassroom) {
              fetchClassroomDetail(e.target.value);
            }
            setSelectedStudentIds([]); // reset when class changes
          }}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb] appearance-none">
            <option value="" className="bg-gray-800 text-white">Sinf tanlang</option>
            {classrooms.map(c => <option key={c.id} value={c.id} className="bg-gray-800 text-white">{c.name}</option>)}
          </select>

          {newAssignment.classroom_id && classroomDetail?.class?.id === newAssignment.classroom_id && classroomDetail.students?.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <label className="text-sm text-white/80 font-medium">Kimga biriktiriladi?</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAssignTarget('classroom')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${assignTarget === 'classroom' ? 'bg-[#4b30fb] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                  Butun sinfga
                </button>
                <button type="button" onClick={() => setAssignTarget('student')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${assignTarget === 'student' ? 'bg-[#4b30fb] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                  Indiviudal
                </button>
              </div>

              {assignTarget === 'student' && (
                <div className="max-h-40 overflow-y-auto space-y-2 mt-3 pr-2">
                  {classroomDetail.students.map(s => (
                    <label key={s.user_id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.user_id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, s.user_id]);
                          else setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.user_id));
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-[#4b30fb] focus:ring-[#4b30fb]"
                      />
                      <span className="text-white text-sm">{s.first_name} {s.last_name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <select value={newAssignment.assignment_type} onChange={e => setNewAssignment({ ...newAssignment, assignment_type: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb] appearance-none">
            <option value="homework" className="bg-gray-800 text-white">Uy vazifasi</option>
            <option value="test" className="bg-gray-800 text-white">Test</option>
            <option value="reading" className="bg-gray-800 text-white">O'qish</option>
            <option value="project" className="bg-gray-800 text-white">Loyiha</option>
          </select>

          {/* File Upload Section */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <label className="text-sm text-white/80 font-medium mb-2 block">Material yoki fayl biriktirish (Max: 10M)</label>
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) {
                  if (f.size > 10 * 1024 * 1024) {
                    showNotif('error', 'Fayl hajmi 10MB dan oshmasligi kerak!');
                    e.target.value = '';
                    setAssignmentFile(null);
                  } else {
                    setAssignmentFile(f);
                  }
                }
              }}
              className="block w-full text-sm text-white/60
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-[#4b30fb] file:text-white
                hover:file:bg-[#6149fd]"
            />
            {assignmentFile && <p className="text-green-400 text-xs mt-2">Tanlandi: {assignmentFile.name}</p>}
          </div>

          {newAssignment.assignment_type === 'test' && (
            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">AI yordamida test tuzish</span>
              </div>
              <textarea
                className="w-full bg-black/20 border border-purple-500/30 rounded-lg p-3 text-white text-sm mb-3 focus:outline-none focus:border-purple-400"
                rows={4}
                placeholder="Dars matni yoxud hikoyani kiriting. AI unga asoslanib test savollari va javoblarini tuzib beradi..."
                value={aiPromptText}
                onChange={(e) => setAiPromptText(e.target.value)}
              />
              <button
                type="button"
                disabled={aiGenerating}
                onClick={handleGenerateAITest}
                className="px-4 py-2 bg-purple-600/30 text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-600/50 transition-colors w-full border border-purple-500/30 active:bg-purple-600 outline-none flex items-center justify-center disabled:opacity-50">
                {aiGenerating ? <div className="w-4 h-4 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin mr-2" /> : null}
                {aiGenerating ? 'AI Test tuzmoqda...' : 'Test generatsiya qilish'}
              </button>
            </div>
          )}

          <input type="datetime-local" value={newAssignment.due_date} onChange={e => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb] color-scheme-dark" style={{ colorScheme: 'dark' }} />
          <button type="submit" className="w-full bg-gradient-to-br from-green-500 to-green-600 text-white py-3 rounded-xl border-none cursor-pointer font-bold hover:scale-[1.02] transition-transform">
            Vazifa yaratish va yuborish
          </button>
        </form>
      )}

      {/* Create Lesson Modal */}
      {renderModal(showCreateLesson, () => setShowCreateLesson(false), 'Yangi dars yaratish',
        <form onSubmit={handleCreateLesson} className="space-y-4">
          <input type="text" placeholder="Dars mavzusi *" value={newLesson.title} onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]" />
          <input type="text" placeholder="Fan (masalan: Fizika)" value={newLesson.subject} onChange={e => setNewLesson({ ...newLesson, subject: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]" />
          <select value={newLesson.grade_level} onChange={e => setNewLesson({ ...newLesson, grade_level: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb] appearance-none">
            <option value="" className="bg-gray-800 text-white">Sinf darajasi</option>
            {['1-sinf', '2-sinf', '3-sinf', '4-sinf', '5-sinf', '6-sinf', '7-sinf', '8-sinf', '9-sinf', '10-sinf', '11-sinf'].map(g =>
              <option key={g} value={g} className="bg-gray-800 text-white">{g}</option>)}
          </select>
          <input type="url" placeholder="Video URL (YouTube/Vimeo)" value={newLesson.video_url} onChange={e => setNewLesson({ ...newLesson, video_url: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]" />
          <textarea placeholder="Dars matni / Konspekt" value={newLesson.content} onChange={e => setNewLesson({ ...newLesson, content: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb] h-32 resize-none" />
          <button type="submit" className="w-full bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white py-3 rounded-xl border-none cursor-pointer font-bold hover:scale-[1.02] transition-transform">
            Darsni saqlash
          </button>
        </form>
      )}

      {/* Student Detail Modal */}
      {(studentDetail || studentDetailLoading) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setStudentDetail(null)}>
          <div className="bg-[#1e1e3a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="text-white font-bold text-lg">O'quvchi ma'lumotlari</h3>
              <button onClick={() => setStudentDetail(null)} className="text-white/40 hover:text-white bg-transparent border-none cursor-pointer"><X size={20} /></button>
            </div>
            {studentDetailLoading ? (
              <div className="p-8 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4b30fb] mx-auto"></div><p className="text-white/40 mt-3">Yuklanmoqda...</p></div>
            ) : studentDetail && (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {studentDetail.first_name?.charAt(0)}{studentDetail.last_name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-white text-lg font-bold">{studentDetail.first_name} {studentDetail.last_name}</h4>
                    <p className="text-white/50 text-sm font-mono">ID: {studentDetail.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {studentDetail.phone && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-white/40 text-xs mb-1 flex items-center gap-1"><Phone size={12} /> Telefon</div>
                      <div className="text-white text-sm font-medium">{studentDetail.phone}</div>
                    </div>
                  )}
                  {studentDetail.email && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-white/40 text-xs mb-1 flex items-center gap-1"><Mail size={12} /> Email</div>
                      <div className="text-white text-sm font-medium">{studentDetail.email}</div>
                    </div>
                  )}
                  {studentDetail.birth_date && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-white/40 text-xs mb-1">Tug'ilgan sana</div>
                      <div className="text-white text-sm font-medium">{new Date(studentDetail.birth_date).toLocaleDateString('uz')}</div>
                    </div>
                  )}
                  {studentDetail.created_at && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-white/40 text-xs mb-1">Ro'yxatdan o'tgan</div>
                      <div className="text-white text-sm font-medium">{new Date(studentDetail.created_at).toLocaleDateString('uz')}</div>
                    </div>
                  )}
                </div>

                {studentDetail.profile && (
                  <div>
                    <h5 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">O'quv progressi</h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                        <div className="text-blue-400 text-lg font-bold">{studentDetail.profile.level}</div>
                        <div className="text-white/40 text-[10px]">Daraja</div>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                        <div className="text-green-400 text-lg font-bold">{studentDetail.profile.total_points}</div>
                        <div className="text-white/40 text-[10px]">Ball</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                        <div className="text-purple-400 text-lg font-bold">{studentDetail.profile.total_lessons_completed}</div>
                        <div className="text-white/40 text-[10px]">Darslar</div>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                        <div className="text-amber-400 text-lg font-bold">{studentDetail.profile.total_games_played}</div>
                        <div className="text-white/40 text-[10px]">O'yinlar</div>
                      </div>
                      <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-3 text-center">
                        <div className="text-pink-400 text-lg font-bold">{studentDetail.profile.average_score}%</div>
                        <div className="text-white/40 text-[10px]">O'rtacha</div>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                        <div className="text-orange-400 text-lg font-bold">{studentDetail.profile.current_streak}</div>
                        <div className="text-white/40 text-[10px]">Streak</div>
                      </div>
                    </div>
                  </div>
                )}

                {studentDetail.parent && (
                  <div>
                    <h5 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Ota-ona ma'lumotlari</h5>
                    <div className="bg-white/5 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <UserIcon size={16} className="text-white/40" />
                        <span className="text-white font-medium">{studentDetail.parent.first_name} {studentDetail.parent.last_name}</span>
                      </div>
                      {studentDetail.parent.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-white/40" />
                          <span className="text-white/70 text-sm">{studentDetail.parent.phone}</span>
                        </div>
                      )}
                      {studentDetail.parent.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-white/40" />
                          <span className="text-white/70 text-sm">{studentDetail.parent.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {studentDetail.classrooms?.length > 0 && (
                  <div>
                    <h5 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Sinflar</h5>
                    <div className="space-y-1">
                      {studentDetail.classrooms.map(c => (
                        <div key={c.id} className="bg-white/5 rounded-lg px-3 py-2 text-sm text-white/70">
                          <span className="text-white font-medium">{c.name}</span> {c.subject && <span className="text-white/40">• {c.subject}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
