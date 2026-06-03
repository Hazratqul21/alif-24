import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';
import { teacherService } from '../services/teacherService';
import notificationService from '../services/notificationService';
import organizationService from '../services/organizationService';
import AILessonGenerator from '../components/Teacher/AILessonGenerator';
import AssignmentCalendar from '../components/Teacher/AssignmentCalendar';
import ResourceLibrary from '../components/Teacher/ResourceLibrary';
import StudentImport from '../components/Teacher/StudentImport';
import TestLibrary from '../components/Teacher/TestLibrary';
import ComplexLessonBuilder from '../components/Teacher/ComplexLessonBuilder';
import {
  BookOpen, Users, Award, BarChart3, Plus, Clock, CheckCircle,
  FileText, Settings, Bell, Search, Filter, ChevronRight,
  GraduationCap, Target, TrendingUp, Calendar, MessageSquare,
  Play, Eye, Edit, Trash2, ArrowLeft, LogOut, Zap, Copy,
  Send, UserPlus, X, ClipboardList, Hash, Mail, Phone, User as UserIcon, Paperclip,
  FolderOpen, Sparkles, Upload, List, LayoutGrid, Tag, ShoppingBag,
  Type, Image as ImageIcon, Menu, Share2, AlertTriangle
} from 'lucide-react';
import GradebookMatrix from '../components/Teacher/GradebookMatrix';
import ErtakPreviewModal from '../components/Teacher/ErtakPreviewModal';
import ErtakResults from '../components/Teacher/ErtakResults';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Real data states
  const [classrooms, setClassrooms] = useState([]);
  const [uniqueStudentCount, setUniqueStudentCount] = useState(0);
  const [myStudents, setMyStudents] = useState([]);
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

  // Grading states
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradingLoading, setGradingLoading] = useState(false);

  // Form states
  const [newClass, setNewClass] = useState({ name: '', subject: '', grade_level: '', description: '' });
  const [inviteData, setInviteData] = useState({ identifier: '', invitation_type: 'phone', message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newAssignment, setNewAssignment] = useState({
    title: '', description: '', assignment_type: 'homework',
    classroom_id: '', due_date: '', max_score: 100,
    reference_id: '', reference_type: ''
  });
  const [assignTarget, setAssignTarget] = useState('classroom');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newLesson, setNewLesson] = useState({ title: '', subject: '', grade_level: '', content: '', video_url: '', attachments: null });
  const [lessonFile, setLessonFile] = useState(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');
  const [testMode, setTestMode] = useState('ai'); // ai, parse, manual
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [showTestReview, setShowTestReview] = useState(false);

  // Marketplace states
  const [showMarketListModal, setShowMarketListModal] = useState(false);
  const [marketItemData, setMarketItemData] = useState({ resource_id: '', resource_type: '', title: '', price: 0, description: '' });
  const [marketListingLoading, setMarketListingLoading] = useState(false);

  const [mySchool, setMySchool] = useState(null);

  const [assignmentView, setAssignmentView] = useState('list'); // list, calendar
  const [lessonView, setLessonView] = useState('list'); // list, ai
  const [showStudentImport, setShowStudentImport] = useState(false);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);
  const [studentHistoryLoading, setStudentHistoryLoading] = useState(false);
  const [studentHistoryData, setStudentHistoryData] = useState([]);
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
  const [createStudentData, setCreateStudentData] = useState({ first_name: '', last_name: '', password: '', grade: '', school_name: '' });
  const [createdStudentInfo, setCreatedStudentInfo] = useState(null);
  
  // Mening o'quvchilarim states
  const [myCreatedStudents, setMyCreatedStudents] = useState([]);
  const [createdStudentsLoading, setCreatedStudentsLoading] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);

  // Ertaklar states
  const [ertaklar, setErtaklar] = useState([]);
  const [teacherBooks, setTeacherBooks] = useState([]);
  const [activeKitoblarTab, setActiveKitoblarTab] = useState('books'); // 'books' or 'ertaklar'
  const [showCreateBookModal, setShowCreateBookModal] = useState(false);
  const [bookForm, setBookForm] = useState({ title: '', description: '', language: 'uz', age_group: 'Barchasi', is_premium: false, questions_limit: 3, test_limit: '' });
  const [bookTest, setBookTest] = useState([]);
  const [bulkQuestionsText, setBulkQuestionsText] = useState('');
  const [bulkTestsText, setBulkTestsText] = useState('');
  const [bookQuestions, setBookQuestions] = useState([]);
  const [bookPdfFile, setBookPdfFile] = useState(null);
  const [bookImageFile, setBookImageFile] = useState(null);
  const [ertakForm, setErtakForm] = useState({ title: '', content: '', language: 'uz', age_group: 'Barchasi' });
  const [ertakQuestions, setErtakQuestions] = useState([]);
  const [editErtak, setEditErtak] = useState(null);
  const [editErtakForm, setEditErtakForm] = useState({ title: '', content: '', language: 'uz', age_group: 'Barchasi' });
  const [editErtakQuestions, setEditErtakQuestions] = useState([]);
  const [uploadImage, setUploadImage] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createErtakModal, setCreateErtakModal] = useState(false);
  const [showErtakPreview, setShowErtakPreview] = useState(false);
  const [selectedErtakForPreview, setSelectedErtakForPreview] = useState(null);
  const [showErtakResults, setShowErtakResults] = useState(false);
  const [selectedErtakForResults, setSelectedErtakForResults] = useState(null);

  const tabLabels = {
    uz: { dashboard: 'Bosh sahifa', classes: 'Sinflarim', lessons: 'Darslar', assignments: 'Vazifalar', livequiz: 'Live Quiz', jurnal: 'Jurnal', resources: 'Kutubxona', ertaklar: 'Kitoblarim', testlarim: 'Testlarim', complex: 'Kompleks dars', marketplace: 'Marketplace', school: 'Maktabim', settings: 'Sozlamalar' },
    ru: { dashboard: 'Главная', classes: 'Мои классы', lessons: 'Уроки', assignments: 'Задания', livequiz: 'Live Quiz', jurnal: 'Журнал', resources: 'Библиотека', ertaklar: 'Мои книги', testlarim: 'Мои тесты', complex: 'Комплекс урок', marketplace: 'Маркетплейс', school: 'Моя школа', settings: 'Настройки' },
    en: { dashboard: 'Home', classes: 'My Classes', lessons: 'Lessons', assignments: 'Assignments', livequiz: 'Live Quiz', jurnal: 'Gradebook', resources: 'Library', ertaklar: 'My Books', testlarim: 'My Tests', complex: 'Complex Lesson', marketplace: 'Marketplace', school: 'My School', settings: 'Settings' },
  };
  const tl = tabLabels[language] || tabLabels.uz;

  const tabs = [
    { id: 'dashboard', label: tl.dashboard, icon: BarChart3 },
    { id: 'classes', label: tl.classes, icon: GraduationCap },
    { id: 'students', label: "O'quvchilarim", icon: Users },
    { id: 'jurnal', label: tl.jurnal, icon: LayoutGrid },
    { id: 'lessons', label: tl.lessons, icon: BookOpen },
    { id: 'ertaklar', label: tl.ertaklar, icon: BookOpen },
    { id: 'reading_stats', label: 'Kitobxonlik', icon: BookOpen },
    { id: 'assignments', label: tl.assignments, icon: ClipboardList },
    { id: 'testlarim', label: tl.testlarim, icon: FileText },
    { id: 'complex', label: tl.complex, icon: Sparkles },
    { id: 'livequiz', label: tl.livequiz, icon: Zap },
    { id: 'resources', label: tl.resources, icon: FolderOpen },
    { id: 'marketplace', label: tl.marketplace, icon: ShoppingBag },
    { id: 'school', label: tl.school, icon: Award },
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
      setUniqueStudentCount(res.data?.unique_student_count || 0);
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

  const fetchErtaklar = useCallback(async () => {
    try {
      const res = await teacherService.getErtaklar();
      setErtaklar(res.data || []);
    } catch (e) { console.error('Ertaklar fetch error:', e); }
  }, []);

  const fetchTeacherBooks = useCallback(async () => {
    try {
      const res = await teacherService.getTeacherBooks();
      setTeacherBooks(res.data || []);
    } catch (e) { console.error('Books fetch error:', e); }
  }, []);

  const fetchMyStudents = useCallback(async () => {
    try {
      const res = await teacherService.getTeacherStudents();
      setMyStudents(res.data || []);
    } catch (e) { console.error('Teacher students fetch error:', e); }
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
    fetchErtaklar();
    fetchTeacherBooks();
    fetchUnread();
    fetchMyStudents();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchClassrooms, fetchAssignments, fetchLessons, fetchErtaklar, fetchTeacherBooks, fetchUnread, fetchMyStudents]);

  useEffect(() => {
    if (activeTab === 'school' && !mySchool) {
      organizationService.getMySchool().then(res => {
        setMySchool(res.school || res.data?.school || null);
      }).catch(() => {});
    }
  }, [activeTab, mySchool]);

  const [readingStats, setReadingStats] = useState(null);
  const [readingStatsLoading, setReadingStatsLoading] = useState(false);
  const [selectedReadingClassroom, setSelectedReadingClassroom] = useState(null);
  const [classroomLeaderboard, setClassroomLeaderboard] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);

  useEffect(() => {
    if (activeTab === 'reading_stats' && !readingStats) {
      const fetchReadingStats = async () => {
        setReadingStatsLoading(true);
        try {
          const { getTeacherClassroomsReadingStats } = await import('../services/readingRatingService');
          const res = await getTeacherClassroomsReadingStats(user?.id, 'all_time');
          setReadingStats(res?.data || res || []);
        } catch (e) {
          console.error("Reading stats fetch error", e);
        } finally {
          setReadingStatsLoading(false);
        }
      };
      fetchReadingStats();
    }
  }, [activeTab, readingStats, user?.id]);

  const handleSelectReadingClassroom = async (classroomId) => {
    if (selectedReadingClassroom === classroomId) {
      setSelectedReadingClassroom(null);
      setClassroomLeaderboard(null);
      return;
    }
    setSelectedReadingClassroom(classroomId);
    setLeaderboardLoading(true);
    try {
      const { getClassroomLeaderboard } = await import('../services/readingRatingService');
      const res = await getClassroomLeaderboard(classroomId, 'all_time');
      setClassroomLeaderboard(res?.data || res || []);
    } catch (e) {
      console.error("Leaderboard fetch error", e);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleReadingStudentClick = async (student) => {
    setSelectedStudentHistory(student);
    setStudentHistoryLoading(true);
    try {
        const { getStudentReadingHistory } = await import('../services/readingRatingService');
        const res = await getStudentReadingHistory(student.student_id);
        setStudentHistoryData(res?.data || res || []);
    } catch (e) {
        console.error("Failed to fetch student history", e);
    } finally {
        setStudentHistoryLoading(false);
    }
  };

  const fetchAssignmentDetail = async (assignmentId) => {
    try {
      setLoading(true);
      const res = await teacherService.getAssignmentDetail(assignmentId);
      const d = res.data || res;
      setSelectedAssignment(d.assignment);
      setAssignmentSubmissions(d.submissions || []);
    } catch (e) { showNotif('error', 'Vazifa yuklanmadi'); }
    finally { setLoading(false); }
  };

  const handleGradeSubmission = async () => {
    if (!gradingSubmission || gradeScore === '') return;
    const score = parseFloat(gradeScore);
    if (isNaN(score) || score < 0 || score > (selectedAssignment?.max_score || 100)) {
      showNotif('error', `Ball 0 dan ${selectedAssignment?.max_score || 100} gacha bo'lishi kerak`);
      return;
    }
    try {
      setGradingLoading(true);
      await teacherService.gradeSubmission(selectedAssignment.id, gradingSubmission.id, {
        score,
        feedback: gradeFeedback || null,
      });
      showNotif('success', 'Baho muvaffaqiyatli qo\'yildi!');
      setGradingSubmission(null);
      setGradeScore('');
      setGradeFeedback('');
      fetchAssignmentDetail(selectedAssignment.id);
      fetchAssignments();
    } catch (e) { showNotif('error', e.message || 'Baholashda xatolik'); }
    finally { setGradingLoading(false); }
  };

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
      const classData = { ...newClass };
      if (classData.subject === 'Kitobxonlik') {
        classData.max_students = 10000;
      }
      await teacherService.createClassroom(classData);
      showNotif('success', 'Sinf yaratildi!');
      setShowCreateClass(false);
      setNewClass({ name: '', subject: '', grade_level: '', description: '' });
      fetchClassrooms();
      setReadingStats(null); // Force reading stats to fetch again
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

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!createStudentData.first_name.trim() || !createStudentData.last_name.trim()) {
        return showNotif('error', 'Ism va familiyani kiriting');
    }
    try {
        setLoading(true);
        // Call the general createStudent method
        const res = await teacherService.createStudent(createStudentData);
        if (res.success || res.data) {
            showNotif('success', "O'quvchi muvaffaqiyatli yaratildi!");
            setShowCreateStudentModal(false);
            setCreateStudentData({ first_name: '', last_name: '', password: '', grade: '', school_name: '' });
            setCreatedStudentInfo(res.data?.data || res.data || res);
            // Optionally fetch data if needed
        }
    } catch (e) {
        showNotif('error', e.message || 'Xatolik yuz berdi');
    } finally {
        setLoading(false);
    }
  };

  const handleInviteStudentDirect = async (studentUserId) => {
    if (!selectedClassroom) return;
    try {
      await teacherService.inviteStudent(selectedClassroom, {
        identifier: studentUserId,
        invitation_type: 'user_id',
        message: "Sizni ushbu yangi sinfga taklif qilaman."
      });
      showNotif('success', 'Taklif yuborildi!');
      fetchClassroomDetail(selectedClassroom);
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!newLesson.title.trim()) return showNotif('error', 'Dars nomini kiriting');
    try {
      setLoading(true);
      const payload = { ...newLesson };
      if (lessonFile) {
        const upRes = await teacherService.uploadAssignmentFile(lessonFile);
        const fileData = upRes.data || upRes;
        if (fileData?.url) {
          payload.attachments = [{ name: lessonFile.name, url: fileData.url, size: fileData.size || lessonFile.size }];
        }
      }
      await teacherService.createLesson(payload);
      showNotif('success', 'Dars muvaffaqiyatli yaratildi!');
      setShowCreateLesson(false);
      setNewLesson({ title: '', subject: '', grade_level: '', content: '', video_url: '', attachments: null });
      setLessonFile(null);
      fetchLessons();
    } catch (e) {
      console.error("Lesson creation error:", e);
      showNotif('error', e.message || 'Darsni saqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
    } finally {
      setLoading(false);
    }
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
      if (!payload.reference_id) {
        delete payload.reference_id;
        delete payload.reference_type;
      }
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
      setNewAssignment({
        title: '', description: '', assignment_type: 'homework',
        classroom_id: '', due_date: '', max_score: 100,
        reference_id: '', reference_type: ''
      });
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

  const handleAssignErtak = (ertak) => {
    setNewAssignment({
      title: ertak.title,
      description: `Kitobni o'qing va savollarga javob bering.`,
      assignment_type: 'reading',
      classroom_id: '',
      due_date: '',
      max_score: 100,
      reference_id: ertak.id,
      reference_type: 'ertak'
    });
    setAssignTarget('classroom');
    setSelectedStudentIds([]);
    setShowCreateAssignment(true);
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
        const testContent = JSON.stringify({
          questions: questions,
          time_limit_minutes: Math.max(5, questions.length * 2),
          generated_by: 'ai'
        });
        setNewAssignment(prev => ({
          ...prev,
          content: testContent,
          description: `AI Test — ${questions.length} ta savol, ${Math.max(5, questions.length * 2)} daqiqa`,
          assignment_type: 'test',
        }));
        setAiPromptText('');
        showNotif('success', `Test yaratildi! ${questions.length} ta savol.`);
      }
    } catch (err) {
      showNotif('error', err.message || "Test yaratishda xatolik yuz berdi");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleParseTextTest = async () => {
    if (!aiPromptText || aiPromptText.length < 10) {
      showNotif('error', "Analiz uchun matn kiriting!");
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await teacherService.parseTextTest(aiPromptText);
      if (res.success && res.tests?.length > 0) {
        setParsedQuestions(res.tests);
        setShowTestReview(true);
      } else {
        showNotif('warning', "Savollar topilmadi. Matnni tekshiring.");
      }
    } catch (err) {
      showNotif('error', "Matnni analiz qilishda xatolik");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleParseFileTest = async (file) => {
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const res = await teacherService.parseFileTest(file);
      if (res.success && res.tests?.length > 0) {
        setParsedQuestions(res.tests);
        setShowTestReview(true);
      } else {
        showNotif('warning', "Fayldan savollar topilmadi.");
      }
    } catch (err) {
      showNotif('error', "Faylni analiz qilishda xatolik");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTestFinalized = async (finalQuestions, testName, testSubject) => {
    const testContent = JSON.stringify({
      questions: finalQuestions,
      time_limit_minutes: Math.max(5, finalQuestions.length * 2),
      generated_by: 'parsed'
    });
    const resolvedName = testName || newAssignment.title || `Test — ${new Date().toLocaleDateString('uz')}`;
    const resolvedSubject = testSubject || '';
    setNewAssignment(prev => ({
      ...prev,
      title: resolvedName,
      content: testContent,
      description: resolvedSubject ? `${resolvedSubject} — ${finalQuestions.length} ta savol` : `Test — ${finalQuestions.length} ta savol`,
      assignment_type: 'test',
    }));
    setShowTestReview(false);

    // Also save to backend as SavedTest for the library
    try {
      await teacherService.saveTest({
        title: resolvedName,
        subject: resolvedSubject,
        description: resolvedSubject ? `${resolvedSubject} — ${finalQuestions.length} ta savol` : `${finalQuestions.length} ta savol`,
        questions: finalQuestions,
        difficulty: 'medium',
        language: 'uz',
      });
      showNotif('success', "Test saqlandi va Kutubxonaga qo'shildi!");
    } catch (err) {
      console.error('Save test error:', err);
      showNotif('success', "Test saqlandi!");
    }
  };

  const handleListResourceInMarketplace = async (e) => {
    e.preventDefault();
    setMarketListingLoading(true);
    try {
      await apiService.post('/marketplace/list-resource', marketItemData);
      showNotif('success', "Resurs marketpleysga qo'shildi!");
      setShowMarketListModal(false);
    } catch (err) {
      showNotif('error', err.response?.data?.detail || "Xatolik yuz berdi");
    } finally {
      setMarketListingLoading(false);
    }
  };

  // ============ ERTAKLAR ACTIONS ============

  const handleCreateErtak = async () => {
    try {
      setSaving(true);
      setError('');
      const payload = {
        ...ertakForm,
        questions: ertakQuestions.filter(q => q.question.trim() && q.answer.trim())
      };
      if (uploadFile) {
        const upRes = await teacherService.uploadAssignmentFile(uploadFile);
        if (upRes.url) payload.audio_url = upRes.url;
      }
      if (uploadImage) {
        const imgRes = await teacherService.uploadAssignmentFile(uploadImage);
        if (imgRes.url) payload.image_url = imgRes.url;
      }

      await teacherService.createErtak(payload);
      showNotif('success', 'Kitob yaratildi!');
      setCreateErtakModal(false);
      setErtakForm({ title: '', content: '', language: 'uz', age_group: 'Barchasi' });
      setErtakQuestions([]);
      setUploadFile(null);
      setUploadImage(null);
      fetchErtaklar();
    fetchTeacherBooks();
    } catch (err) {
      setError(err.message || 'Xatolik');
      showNotif('error', err.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleEditErtak = (ertak) => {
    setEditErtak(ertak);
    setEditErtakForm({
      title: ertak.title || '',
      content: ertak.content || '',
      language: ertak.language || 'uz',
      age_group: ertak.age_group || 'Barchasi',
    });
    setEditErtakQuestions(ertak.questions || []);
  };

  const handleUpdateErtak = async () => {
    if (!editErtak) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        ...editErtakForm,
        questions: editErtakQuestions.filter(q => q.question?.trim() && q.answer?.trim())
      };
      if (uploadFile) {
        const upRes = await teacherService.uploadAssignmentFile(uploadFile);
        if (upRes.url) payload.audio_url = upRes.url;
      }
      if (uploadImage) {
        const imgRes = await teacherService.uploadAssignmentFile(uploadImage);
        if (imgRes.url) payload.image_url = imgRes.url;
      }
      await teacherService.updateErtak(editErtak.id, payload);
      showNotif('success', 'Kitob yangilandi!');
      setEditErtak(null);
      setEditErtakQuestions([]);
      setUploadFile(null);
      setUploadImage(null);
      fetchErtaklar();
    fetchTeacherBooks();
    } catch (err) {
      setError(err.message || 'Xatolik');
      showNotif('error', err.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteErtak = async (id) => {
    if (!confirm("Kitobni o'chirmoqchimisiz?")) return;
    try {
      await teacherService.deleteErtak(id);
      showNotif('success', "Kitob o'chirildi");
      fetchErtaklar();
    fetchTeacherBooks();
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
  };

  const confirmDeleteClassroom = (cls) => {
    setClassToDelete(cls);
  };

  const executeDeleteClassroom = async () => {
    if (!classToDelete) return;
    try {
      const id = classToDelete.id || classToDelete.classroom_id;
      await teacherService.deleteClassroom(id);
      showNotif('success', "Sinf o'chirildi");
      setSelectedClassroom(null);
      setClassroomDetail(null);
      fetchClassrooms();
      
      if (activeTab === 'reading_stats') {
          const { getTeacherClassroomsReadingStats } = await import('../services/readingRatingService');
          const res = await getTeacherClassroomsReadingStats(user?.id, 'all_time');
          setReadingStats(res?.data || res || []);
          if (selectedReadingClassroom === id) {
              setSelectedReadingClassroom(null);
          }
      } else {
          setReadingStats(null);
      }
    } catch (e) { showNotif('error', e.message || 'Xatolik'); }
    setClassToDelete(null);
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

  const totalStudents = uniqueStudentCount;
  const stats = [
    { icon: GraduationCap, value: classrooms.length, label: 'Sinflar', color: 'from-blue-500 to-blue-600' },
    { icon: BookOpen, value: lessons.length, label: 'Darslar', color: 'from-pink-500 to-pink-600' },
    { icon: Users, value: totalStudents, label: "O'quvchilar", color: 'from-green-500 to-green-600' },
    { icon: BookOpen, value: ertaklar.length, label: 'Kitoblarim', color: 'from-orange-500 to-orange-600' },
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
          <button onClick={() => { setActiveTab('lessons'); setLessonView('ai'); }}
            className="flex items-center gap-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
            <Sparkles size={20} /><span className="font-medium">AI Dars</span>
          </button>
          <button onClick={() => navigate('/livequiz-teacher')}
            className="flex items-center gap-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
            <Zap size={20} /><span className="font-medium">Live Quiz</span>
          </button>
          <button onClick={() => setActiveTab('resources')}
            className="flex items-center gap-3 bg-gradient-to-br from-cyan-500 to-teal-500 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
            <FolderOpen size={20} /><span className="font-medium">Kutubxona</span>
          </button>
          <button onClick={() => { setActiveTab('assignments'); setAssignmentView('calendar'); }}
            className="flex items-center gap-3 bg-gradient-to-br from-rose-500 to-rose-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
            <Calendar size={20} /><span className="font-medium">Kalendar</span>
          </button>
          <button onClick={() => setActiveTab('classes')}
            className="flex items-center gap-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
            <Users size={20} /><span className="font-medium">Sinflarim</span>
          </button>
          <button onClick={() => {
            window.location.href = 'https://testai.alif24.uz/test-creator';
          }}
            className="flex items-center gap-3 bg-gradient-to-br from-indigo-500 to-violet-500 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
            <FileText size={20} /><span className="font-medium">TestAI</span>
          </button>
          <button onClick={() => setCreateErtakModal(true)}
            className="flex items-center gap-3 bg-gradient-to-br from-orange-500 to-red-500 text-white p-4 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform">
            <BookOpen size={20} /><span className="font-medium">Yangi kitob</span>
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

  const renderClassList = () => {
    const regularClassrooms = classrooms.filter(c => c.subject !== 'Kitobxonlik');
    return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Sinflar ({classrooms.length})</h3>
        <div className="flex gap-2">
            <button onClick={() => setShowCreateStudentModal(true)}
              className="flex items-center gap-2 bg-gradient-to-br from-pink-500 to-rose-500 text-white px-4 py-2 rounded-xl border-none cursor-pointer text-sm font-medium hover:scale-105 transition-transform shadow-lg shadow-pink-500/20">
              <UserPlus size={16} /> O'quvchi yaratish
            </button>
            <button onClick={() => setShowCreateClass(true)}
              className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-4 py-2 rounded-xl border-none cursor-pointer text-sm font-medium hover:scale-105 transition-transform shadow-lg shadow-purple-500/20">
              <Plus size={16} /> Yangi sinf
            </button>
        </div>
      </div>
      {regularClassrooms.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
          <GraduationCap className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">Hozircha sinf yo'q</p>
          <p className="text-white/40 text-sm mt-1">Yangi sinf yoki o'quvchi yaratish uchun yuqoridagi tugmalarni bosing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regularClassrooms.map(c => (
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
                <button onClick={() => confirmDeleteClassroom(c)}
                  className="p-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                  <Trash2 size={18} />
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
  };

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
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl border-none cursor-pointer text-sm font-medium transition-colors">
              <UserPlus size={16} /> Taklif qilish
            </button>
            <button onClick={() => setShowStudentImport(true)}
              className="flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-xl border-none cursor-pointer text-sm font-medium hover:scale-105 transition-transform">
              <Upload size={16} /> CSV Import
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

          {/* Mening boshqa sinfdagi o'quvchilarim ro'yxati */}
          {(() => {
            const currentStudentIds = new Set(students.map(s => s.user_id));
            const otherStudents = myStudents.filter(s => !currentStudentIds.has(s.user_id));
            if (otherStudents.length === 0) return null;
            return (
              <div className="mt-6 border-t border-white/10 pt-4">
                <h5 className="text-white/60 text-xs font-bold mb-3 uppercase tracking-wider">Mening boshqa o'quvchilarim (Sinfga taklif qilish)</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {otherStudents.map(s => (
                    <div key={s.user_id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
                      <div>
                        <div className="text-sm font-medium text-white">{s.first_name} {s.last_name}</div>
                        <div className="text-[10px] text-white/40">{s.phone || s.email}</div>
                      </div>
                      <button
                        onClick={() => handleInviteStudentDirect(s.user_id)}
                        className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-xl border border-emerald-500/30 cursor-pointer font-medium transition-colors"
                      >
                        Taklif qilish
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  // ============ RENDER: ASSIGNMENTS ============

  const getScoreColor = (score, max) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'text-green-400';
    if (pct >= 60) return 'text-yellow-400';
    if (pct >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score, max) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'bg-green-500/20 border-green-500/30';
    if (pct >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
    if (pct >= 40) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const renderAssignments = () => {
    // Assignment detail view with submissions
    if (selectedAssignment) {
      const maxScore = selectedAssignment.max_score || 100;
      const gradedSubs = assignmentSubmissions.filter(s => s.status === 'graded');
      const avgScore = gradedSubs.length > 0
        ? (gradedSubs.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubs.length).toFixed(1)
        : 0;

      return (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedAssignment(null); setAssignmentSubmissions([]); }}
              className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all border-none cursor-pointer">
              <ArrowLeft size={18} className="text-white" />
            </button>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{selectedAssignment.title}</h3>
              <p className="text-white/50 text-sm">{selectedAssignment.description || ''}</p>
            </div>
            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${selectedAssignment.assignment_type === 'homework' ? 'bg-blue-500/20 text-blue-400' :
              selectedAssignment.assignment_type === 'test' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'
              }`}>{selectedAssignment.assignment_type}</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
              <div className="text-blue-400 text-xl font-bold">{assignmentSubmissions.length}</div>
              <div className="text-white/40 text-xs">Jami</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
              <div className="text-yellow-400 text-xl font-bold">{assignmentSubmissions.filter(s => s.status === 'submitted').length}</div>
              <div className="text-white/40 text-xs">Topshirdi</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
              <div className="text-green-400 text-xl font-bold">{gradedSubs.length}</div>
              <div className="text-white/40 text-xs">Baholandi</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
              <div className="text-purple-400 text-xl font-bold">{avgScore}/{maxScore}</div>
              <div className="text-white/40 text-xs">O'rtacha ball</div>
            </div>
          </div>

          {/* Submissions list */}
          <div className="space-y-2">
            <h4 className="text-white/60 text-xs font-bold uppercase tracking-wider">O'quvchilar topshiruvlari</h4>
            {assignmentSubmissions.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <p className="text-white/40">Hozircha topshiruv yo'q</p>
              </div>
            ) : (
              assignmentSubmissions.map(sub => (
                <div key={sub.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        sub.status === 'graded' ? getScoreBg(sub.score, maxScore) :
                        sub.status === 'submitted' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                        sub.status === 'late' ? 'bg-orange-500/20 border border-orange-500/30' :
                        'bg-white/10 border border-white/20'
                      }`}>
                        {sub.status === 'graded' ? (
                          <span className={getScoreColor(sub.score, maxScore)}>{sub.score}</span>
                        ) : sub.status === 'submitted' || sub.status === 'late' ? (
                          <CheckCircle size={18} className={sub.status === 'late' ? 'text-orange-400' : 'text-yellow-400'} />
                        ) : (
                          <Clock size={18} className="text-white/30" />
                        )}
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">{sub.student_name || `ID: ${sub.student_user_id}`}</div>
                        <div className="text-white/40 text-xs">
                          {sub.status === 'graded' && sub.graded_at
                            ? `Baholangan: ${new Date(sub.graded_at).toLocaleDateString('uz')}`
                            : sub.status === 'submitted' && sub.submitted_at
                            ? `Topshirgan: ${new Date(sub.submitted_at).toLocaleDateString('uz')}`
                            : sub.status === 'late' && sub.submitted_at
                            ? `Kech topshirgan: ${new Date(sub.submitted_at).toLocaleDateString('uz')}`
                            : 'Kutilmoqda'
                          }
                        </div>
                        {sub.status === 'graded' && sub.feedback && (
                          <div className="text-white/50 text-xs mt-1 italic">"{sub.feedback}"</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.status === 'graded' ? (
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${getScoreBg(sub.score, maxScore)} ${getScoreColor(sub.score, maxScore)}`}>
                            {sub.score} / {maxScore}
                          </div>
                          <button onClick={() => { setGradingSubmission(sub); setGradeScore(String(sub.score)); setGradeFeedback(sub.feedback || ''); }}
                            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all border-none cursor-pointer" title="Qayta baholash">
                            <Edit size={14} className="text-white/60" />
                          </button>
                        </div>
                      ) : (sub.status === 'submitted' || sub.status === 'late') ? (
                        <button onClick={() => { setGradingSubmission(sub); setGradeScore(''); setGradeFeedback(''); }}
                          className="flex items-center gap-1.5 bg-gradient-to-br from-green-500 to-green-600 text-white px-3 py-1.5 rounded-lg border-none cursor-pointer hover:scale-105 transition-transform text-xs font-medium">
                          <Award size={14} /> Baholash
                        </button>
                      ) : (
                        <span className="text-white/30 text-xs px-3 py-1.5 bg-white/5 rounded-lg">Topshirmagan</span>
                      )}
                    </div>
                  </div>
                  {/* Submission content */}
                  {sub.content && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-white/60 text-sm">
                        {selectedAssignment.assignment_type === 'test' ? (
                          (() => {
                            try {
                              const data = typeof sub.content === 'string' ? JSON.parse(sub.content) : sub.content;
                              return `Natija: ${data.correct_count} / ${data.total} to'g'ri (${data.score} ball)`;
                            } catch(e) { return sub.content; }
                          })()
                        ) : sub.content}
                      </p>
                    </div>
                  )}
                  {sub.attachments?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sub.attachments.map((att, i) => (
                        <a key={i} href={att.url || att} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/20 transition-all no-underline">
                          <Paperclip size={12} /> {att.name || `Fayl ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Grading Modal */}
          {gradingSubmission && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setGradingSubmission(null)}>
              <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-lg">Baholash</h3>
                  <button onClick={() => setGradingSubmission(null)} className="p-1 hover:bg-white/10 rounded-lg border-none cursor-pointer">
                    <X size={18} className="text-white/60" />
                  </button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="text-white font-medium text-sm">{gradingSubmission.student_name || `ID: ${gradingSubmission.student_user_id}`}</div>
                  <div className="text-white/40 text-xs mt-1">Vazifa: {selectedAssignment.title}</div>
                  {gradingSubmission.content && (
                    <div className="text-white/50 text-sm mt-2 border-t border-white/5 pt-2">
                      {selectedAssignment.assignment_type === 'test' ? (
                        (() => {
                          try {
                            const data = typeof gradingSubmission.content === 'string' ? JSON.parse(gradingSubmission.content) : gradingSubmission.content;
                            return (
                              <div className="space-y-1">
                                <p className="text-green-400 font-bold">To'g'ri: {data.correct_count} / {data.total}</p>
                                <p className="text-blue-400 font-bold">Ball: {data.score}</p>
                                <p className="text-[10px] text-white/30">Vaqt: {Math.floor(data.time_spent_seconds / 60)}m {data.time_spent_seconds % 60}s</p>
                              </div>
                            );
                          } catch(e) { return gradingSubmission.content; }
                        })()
                      ) : gradingSubmission.content}
                    </div>
                  )}
                </div>

                {/* Score input */}
                <div>
                  <label className="text-white/60 text-sm font-medium block mb-2">Ball (0 — {maxScore})</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min="0" max={maxScore} step="1" value={gradeScore}
                      onChange={e => setGradeScore(e.target.value)}
                      placeholder="0"
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-2xl font-bold text-center placeholder:text-white/20 focus:outline-none focus:border-[#4b30fb] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <span className="text-white/40 text-lg font-bold">/ {maxScore}</span>
                  </div>
                  {/* Quick score buttons */}
                  <div className="flex gap-2 mt-3">
                    {[100, 90, 80, 70, 60, 50].map(v => {
                      const actualVal = Math.round(maxScore * v / 100);
                      return (
                        <button key={v} onClick={() => setGradeScore(String(actualVal))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer transition-all ${
                            parseInt(gradeScore) === actualVal
                              ? 'bg-[#4b30fb] text-white'
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}>{v}%</button>
                      );
                    })}
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <label className="text-white/60 text-sm font-medium block mb-2">Izoh (ixtiyoriy)</label>
                  <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)}
                    placeholder="O'quvchiga izoh yozing..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#4b30fb] h-20 resize-none text-sm" />
                </div>

                <button onClick={handleGradeSubmission} disabled={gradingLoading || gradeScore === ''}
                  className={`w-full py-3 rounded-xl text-white font-bold text-sm border-none cursor-pointer transition-all ${
                    gradingLoading || gradeScore === '' ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-gradient-to-br from-green-500 to-green-600 hover:scale-[1.02]'
                  }`}>
                  {gradingLoading ? 'Saqlanmoqda...' : 'Bahoni saqlash'}
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Assignment list view
    return (
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
              <div key={a.id} onClick={() => fetchAssignmentDetail(a.id)}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all cursor-pointer group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-white font-bold group-hover:text-[#4b30fb] transition-colors">{a.title}</h4>
                    <p className="text-white/50 text-sm mt-1">{a.description || ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${a.assignment_type === 'homework' ? 'bg-blue-500/20 text-blue-400' :
                      a.assignment_type === 'test' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'
                      }`}>{a.assignment_type}</span>
                    <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/40">
                  {a.due_date && <span><Calendar size={14} className="inline mr-1" />{new Date(a.due_date).toLocaleDateString('uz')}</span>}
                  <span><Users size={14} className="inline mr-1" />{a.total_students || 0} ta</span>
                  <span><CheckCircle size={14} className="inline mr-1" />{a.submitted_count || 0} topshirdi</span>
                  <span className="text-green-400"><Award size={14} className="inline mr-1" />{a.graded_count || 0} baholandi</span>
                </div>
                {/* Progress bar */}
                {(a.total_students || 0) > 0 && (
                  <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                      style={{ width: `${Math.round(((a.graded_count || 0) / a.total_students) * 100)}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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
                {l.video_url && (
                  <a href={l.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm mb-2">
                    <Play size={14} /> Video
                  </a>
                )}
                {l.attachments && l.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {l.attachments.map((att, i) => (
                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-3 py-1.5 rounded-lg text-xs transition-colors">
                        <Paperclip size={12} className="inline" /> {att.name || `Fayl ${i + 1}`}
                      </a>
                    ))}
                  </div>
                )}
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

  const renderMySchool = () => {
    if (!mySchool) return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">{tl.school}</h3>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <Award className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60">Hozircha biror tashkilotga biriktirilmagansiz</p>
        </div>
      </div>
    );
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">{tl.school}</h3>
        <div className="bg-gradient-to-br from-[#4b30fb]/10 to-[#764ba2]/10 border border-[#4b30fb]/20 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-2xl flex items-center justify-center text-white font-bold text-xl">{mySchool.name?.charAt(0)}</div>
            <div>
              <h4 className="text-white font-bold text-xl">{mySchool.name}</h4>
              {mySchool.district && <p className="text-white/50 text-sm">{mySchool.district}</p>}
            </div>
          </div>
          {mySchool.address && <div className="text-white/60 text-sm mb-3">{mySchool.address}</div>}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-white font-bold text-lg">{mySchool.total_teachers || 0}</div>
              <div className="text-white/40 text-xs">O'qituvchilar</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-white font-bold text-lg">{mySchool.total_students || 0}</div>
              <div className="text-white/40 text-xs">O'quvchilar</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-white/50">
            {mySchool.phone && <span>Tel: {mySchool.phone}</span>}
            {mySchool.website && <a href={mySchool.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">{mySchool.website}</a>}
          </div>
        </div>
      </div>
    );
  };

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

  // ============ RENDER: ERTAKLAR ============

  const renderErtaklar = () => {
    if (showErtakResults && selectedErtakForResults) {
      return (
        <ErtakResults 
          ertak={selectedErtakForResults} 
          onBack={() => { setShowErtakResults(false); setSelectedErtakForResults(null); }} 
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Mening Ertaklarim</h3>
          <button onClick={() => setCreateErtakModal(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-orange-500 to-red-500 text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform text-sm font-medium">
            <Plus size={16} /> Yangi ertak
          </button>
        </div>

        {ertaklar.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60">Hozircha ertaklar yo'q</p>
            <button onClick={() => setCreateErtakModal(true)} className="mt-4 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm">Ertak yaratish</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ertaklar.map(ertak => (
              <div key={ertak.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-bold text-lg group-hover:text-orange-400 transition-colors">{ertak.title}</h4>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/40 uppercase tracking-widest">{ertak.language}</span>
                  </div>
                  <p className="text-white/60 text-sm line-clamp-3 mb-4">{ertak.content}</p>
                  <div className="flex items-center gap-3 text-white/30 text-xs">
                    <span>{ertak.age_group} yosh</span>
                    <span>•</span>
                    <span>{ertak.questions?.length || 0} ta savol</span>
                    {ertak.view_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{ertak.view_count} marta o'qildi</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => { setSelectedErtakForPreview(ertak); setShowErtakPreview(true); }}
                      className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      title="Ko'rish"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleAssignErtak(ertak)}
                      className="p-2 text-white/40 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                      title="Ulashish"
                    >
                      <Send size={16} />
                    </button>
                    <button 
                      onClick={() => { setSelectedErtakForResults(ertak); setShowErtakResults(true); }}
                      className="p-2 text-white/40 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
                      title="Natijalar"
                    >
                      <BarChart3 size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setMarketItemData({
                          resource_id: ertak.id,
                          resource_type: 'bundle', // Marketplace recognizes 'bundle' as stories/materials
                          title: ertak.title,
                          price: 10000,
                          description: ertak.content
                        });
                        setShowMarketListModal(true);
                      }}
                      className="p-2 text-white/40 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                      title="Sotuvga qo'yish"
                    >
                      <Tag size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEditErtak(ertak)} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Tahrirlash"><Edit size={16} /></button>
                    <button onClick={() => handleDeleteErtak(ertak.id)} className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="O'chirish"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============ RENDER: RESOURCES ============

  const renderResources = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Kutubxona</h3>
      </div>
      <ResourceLibrary classrooms={classrooms} ertaklar={ertaklar} fetchErtaklar={fetchErtaklar} />
    </div>
  );

  const renderGradebook = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Elektron Jurnal</h3>
        <select 
          value={selectedClassroom || ''} 
          onChange={(e) => fetchClassroomDetail(e.target.value)}
          className="bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#4b30fb]"
        >
          <option value="" className="bg-[#1a1a2e]">Sinfni tanlang</option>
          {classrooms.map(c => (
            <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name}</option>
          ))}
        </select>
      </div>
      {selectedClassroom ? (
        <GradebookMatrix classroomId={selectedClassroom} />
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-20 text-center flex flex-col items-center">
          <LayoutGrid size={48} className="text-white/10 mb-4" />
          <p className="text-white/40 max-w-xs">Jurnalni ko'rish uchun yuqoridagi ro'yxatdan sinfni tanlang</p>
        </div>
      )}
    </div>
  );

  const renderReadingStats = () => {
    if (readingStatsLoading) {
      return <div className="text-center py-12 text-white">Yuklanmoqda...</div>;
    }
    const kitobxonlikStats = readingStats ? readingStats.filter(s => s.subject === 'Kitobxonlik') : [];
    if (!kitobxonlikStats || kitobxonlikStats.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 max-w-lg mx-auto">
            <BookOpen size={48} className="mx-auto mb-4 text-white/30" />
            <h4 className="text-xl font-bold text-white mb-2">Sinflar reytingi topilmadi</h4>
            <p className="text-white/60 mb-0">Sizda "Kitobxonlik" fani bo'yicha sinf mavjud emas. Sinflar bo'limidan "Kitobxonlik" fani bilan yangi sinf yarating.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
          <BookOpen className="text-blue-400" /> Sinflar bo'yicha Kitobxonlik
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
          {kitobxonlikStats.map(stat => (
            <div key={stat.classroom_id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all">
              <div 
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5"
                onClick={() => handleSelectReadingClassroom(stat.classroom_id)}
              >
                <div>
                  <h4 className="text-xl font-bold text-white flex items-center gap-2">
                    <GraduationCap className="text-blue-400" size={24} /> {stat.classroom_name}
                  </h4>
                  <p className="text-sm text-white/60 mt-1">{stat.subject || 'Fan belgilanmagan'} {stat.grade_level ? `| ${stat.grade_level}` : ''}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{stat.readers_count}/{stat.total_students}</div>
                    <div className="text-xs text-white/60">Faol o'quvchilar</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">{stat.total_books_read}</div>
                    <div className="text-xs text-white/60">O'qilgan kitoblar</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">{stat.average_score}</div>
                    <div className="text-xs text-white/60">O'rtacha ball</div>
                  </div>
                </div>
              </div>

              {selectedReadingClassroom === stat.classroom_id && (
                <div className="border-t border-white/10 bg-black/20 p-5">
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 cursor-pointer" onClick={() => copyInviteCode(stat.invite_code)}>
                      <Hash size={14} className="text-white/60" />
                      <span className="text-white font-mono font-bold">{stat.invite_code || 'Yo\'q'}</span>
                      <Copy size={14} className="text-white/40" />
                    </div>
                    <button onClick={() => { setSelectedClassroom(stat.classroom_id); setShowInviteModal(true); }}
                      className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-4 py-2 rounded-xl border-none cursor-pointer text-sm font-medium hover:scale-105 transition-transform">
                      <UserPlus size={16} /> Taklif qilish
                    </button>
                    <button onClick={() => confirmDeleteClassroom(stat)}
                      className="flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-xl border-none cursor-pointer text-sm font-medium hover:bg-red-500/30 transition-transform ml-auto">
                      <Trash2 size={16} /> Sinfni o'chirish
                    </button>
                  </div>
                  
                  <h5 className="text-md font-bold text-white mb-4">Sinf reytingi</h5>
                  {leaderboardLoading ? (
                    <div className="text-center py-6 text-white/60">Reyting yuklanmoqda...</div>
                  ) : classroomLeaderboard && classroomLeaderboard.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-4 py-3 text-xs font-bold text-white/60 uppercase">O'rin</th>
                          <th className="px-4 py-3 text-xs font-bold text-white/60 uppercase">O'quvchi</th>
                          <th className="px-4 py-3 text-xs font-bold text-white/60 uppercase">Kitoblar</th>
                          <th className="px-4 py-3 text-xs font-bold text-white/60 uppercase text-right">Umumiy Ball</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {classroomLeaderboard.map((item) => (
                          <tr key={item.student_id} className="hover:bg-white/5 cursor-pointer" onClick={() => handleReadingStudentClick(item)}>
                            <td className="px-4 py-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${item.rank === 1 ? 'bg-yellow-500 text-white shadow-lg' : item.rank === 2 ? 'bg-gray-300 text-gray-800' : item.rank === 3 ? 'bg-[#CD7F32] text-white' : 'text-white/60'}`}>
                                {item.rank}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img src={item.student?.avatar_url || '/default-avatar.png'} alt="Avatar" className="w-8 h-8 rounded-full object-cover bg-white/10" onError={e => e.target.src='https://ui-avatars.com/api/?name=' + (item.first_name||'U')} />
                                <div>
                                  <div className="text-sm font-bold text-white">{item.first_name} {item.last_name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-white/80">{item.total_books} ta</td>
                            <td className="px-4 py-3 text-sm font-bold text-white text-right">{item.total_score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-6 text-white/40">Bu sinfda hali kitob o'qigan o'quvchilar yo'q.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const fetchCreatedStudents = useCallback(async () => {
    try {
      setCreatedStudentsLoading(true);
      const res = await teacherService.getMyCreatedStudents();
      setMyCreatedStudents(res?.data || res || []);
    } catch (e) {
      console.error(e);
      showNotif('error', e.response?.data?.detail || "O'quvchilarni yuklashda xatolik");
    } finally {
      setCreatedStudentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchCreatedStudents();
    }
  }, [activeTab, fetchCreatedStudents]);

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent?.first_name || !editingStudent?.last_name) return showNotif('error', 'Ism va familiya kiritish shart');
    try {
      setCreatedStudentsLoading(true);
      const res = await teacherService.updateCreatedStudent(editingStudent.id, editingStudent);
      if (res.success || res.data) {
        showNotif('success', "O'quvchi ma'lumotlari yangilandi");
        setShowEditStudentModal(false);
        setEditingStudent(null);
        fetchCreatedStudents();
      }
    } catch (e) {
      showNotif('error', e.response?.data?.detail || "Yangilashda xatolik");
    } finally {
      setCreatedStudentsLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setCreatedStudentsLoading(true);
      const res = await teacherService.deleteCreatedStudent(studentToDelete.id);
      if (res.success || res.data) {
        showNotif('success', "O'quvchi o'chirildi");
        fetchCreatedStudents();
        setStudentToDelete(null);
      }
    } catch (e) {
      showNotif('error', e.response?.data?.detail || "O'chirishda xatolik");
    } finally {
      setCreatedStudentsLoading(false);
    }
  };

  const handleAddStudentToClassDirect = async (studentId, classroomId) => {
    if (!classroomId) return showNotif('error', "Sinfni tanlang");
    try {
      setCreatedStudentsLoading(true);
      const res = await teacherService.addStudentToClassDirect(studentId, classroomId);
      if (res.success || res.data) {
        showNotif('success', res.message || "O'quvchi sinfga qo'shildi");
      } else {
        showNotif('error', res.message || "Xatolik");
      }
    } catch (e) {
      showNotif('error', e.response?.data?.detail || "Sinfga qo'shishda xatolik");
    } finally {
      setCreatedStudentsLoading(false);
    }
  };

  const renderCreatedStudents = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">O'quvchilarim ({myCreatedStudents.length})</h3>
          <button onClick={() => setShowCreateStudentModal(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-pink-500 to-rose-500 text-white px-4 py-2 rounded-xl border-none cursor-pointer text-sm font-medium hover:scale-105 transition-transform shadow-lg shadow-pink-500/20">
            <UserPlus size={16} /> O'quvchi yaratish
          </button>
        </div>

        {createdStudentsLoading && myCreatedStudents.length === 0 ? (
          <div className="text-center p-8 text-white/60">Yuklanmoqda...</div>
        ) : myCreatedStudents.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
            <Users className="w-12 h-12 text-white/30 mx-auto mb-3" />
            <p className="text-white/60">Siz hali o'quvchi yaratmagansiz.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCreatedStudents.map(student => (
              <div key={student.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors group relative">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {student.first_name?.[0]}{student.last_name?.[0]}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg leading-tight">{student.first_name} {student.last_name}</h4>
                      <p className="text-white/50 text-xs">O'quvchi • {student.grade || "Sinf ko'rsatilmagan"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingStudent(student); setShowEditStudentModal(true); }} className="text-white/40 hover:text-white transition-colors" title="Tahrirlash">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => setStudentToDelete(student)} className="text-rose-400/40 hover:text-rose-400 transition-colors" title="O'chirish">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="bg-black/20 rounded-xl p-3 mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/40">Login (ID):</span>
                    <span className="text-white font-mono">{student.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Parol:</span>
                    <span className="text-white font-mono">{student.password}</span>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-white/50 mb-2">Sinfga biriktirish:</p>
                  <div className="flex gap-2">
                    <select
                      id={`class-select-${student.id}`}
                      className="flex-1 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none"
                    >
                      <option value="">Sinfni tanlang...</option>
                      {classrooms.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.subject === 'Kitobxonlik' ? '(Kitobxonlik)' : ''}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => {
                        const sel = document.getElementById(`class-select-${student.id}`);
                        if(sel && sel.value) {
                          handleAddStudentToClassDirect(student.id, sel.value);
                          sel.value = '';
                        }
                      }}
                      className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 p-1.5 rounded-lg transition-colors"
                      title="Sinfga qo'shish"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'students':
        return renderCreatedStudents();
      case 'reading_stats':
        return renderReadingStats();
      case 'dashboard':
        return renderDashboard();
      case 'classes': return renderClasses();
      case 'jurnal': return renderGradebook();
      case 'lessons': return renderEnhancedLessons();
      case 'assignments': return renderEnhancedAssignments();
      case 'testlarim': return (
        <TestLibrary
          classrooms={classrooms}
          onShowNotif={showNotif}
          onOpenTestBuilder={() => {
            setParsedQuestions([{ id: 1, question: '', options: ['', '', '', ''], correct_answer: 0 }]);
            setShowTestReview(true);
          }}
        />
      );
      case 'complex': return (
        <ComplexLessonBuilder
          classrooms={classrooms}
          onShowNotif={showNotif}
          onSaved={() => { fetchLessons(); setActiveTab('lessons'); }}
        />
      );
      case 'livequiz': return renderLiveQuiz();
      case 'ertaklar': return renderErtaklar();
      case 'resources': return renderResources();
      case 'school': return renderMySchool();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  // ============ ENHANCED LESSONS (AI + List) ============

  const renderEnhancedLessons = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Darslarim</h3>
        <div className="flex items-center gap-2">
          <div className="flex p-0.5 bg-white/5 rounded-lg">
            <button onClick={() => setLessonView('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${lessonView === 'list' ? 'bg-[#4b30fb] text-white' : 'text-white/40'}`}>
              <List className="w-3.5 h-3.5 inline mr-1" />Ro'yxat
            </button>
            <button onClick={() => setLessonView('ai')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${lessonView === 'ai' ? 'bg-[#4b30fb] text-white' : 'text-white/40'}`}>
              <Sparkles className="w-3.5 h-3.5 inline mr-1" />AI Generator
            </button>
          </div>
          {lessonView === 'list' && (
            <button onClick={() => setShowCreateLesson(true)}
              className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform text-sm font-medium">
              <Plus size={16} /> Yangi dars
            </button>
          )}
        </div>
      </div>
      {lessonView === 'ai' ? (
        <AILessonGenerator onLessonCreated={() => { fetchLessons(); setLessonView('list'); }} classrooms={classrooms} />
      ) : (
        renderLessonsList()
      )}
    </div>
  );

  const renderLessonsList = () => (
    <>
      {lessons.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <BookOpen className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">Hozircha dars yo'q</p>
          <p className="text-white/30 text-sm mt-2">AI Generator yordamida dars rejasini avtomatik tuzing</p>
          <button onClick={() => setLessonView('ai')}
            className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors">
            <Sparkles className="w-4 h-4 inline mr-1" /> AI bilan dars yaratish
          </button>
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
                {l.content && <p className="text-white/60 text-sm line-clamp-2 mb-3">{typeof l.content === 'string' && l.content.startsWith('{') ? 'AI tomonidan yaratilgan dars rejasi' : l.content}</p>}
                {l.video_url && (
                  <a href={l.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm mb-2">
                    <Play size={14} /> Video
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className="text-white/30 text-xs">{l.created_at ? new Date(l.created_at).toLocaleDateString('uz') : ''}</span>
                  <button onClick={() => {
                    setMarketItemData({
                      resource_id: l.id,
                      resource_type: 'lesson',
                      title: l.title,
                      price: 15000,
                      description: l.content || ''
                    });
                    setShowMarketListModal(true);
                  }} className="text-white/20 hover:text-green-400 p-1" title="Sotuvga qo'yish"><Tag size={14} /></button>
                  <button className="text-white/20 hover:text-blue-400 p-1"><Eye size={14} /></button>
                  <button onClick={() => teacherService.deleteLesson(l.id).then(() => { fetchLessons(); showNotif('success', "Dars o'chirildi"); }).catch(() => showNotif('error', 'Xatolik'))}
                    className="text-white/20 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                </div>
              </div>
          ))}
        </div>
      )}
    </>
  );

  // ============ ENHANCED ASSIGNMENTS (List + Calendar) ============

  const renderEnhancedAssignments = () => {
    if (selectedAssignment) return renderAssignments();
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Vazifalar</h3>
          <div className="flex items-center gap-2">
            <div className="flex p-0.5 bg-white/5 rounded-lg">
              <button onClick={() => setAssignmentView('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${assignmentView === 'list' ? 'bg-[#4b30fb] text-white' : 'text-white/40'}`}>
                <List className="w-3.5 h-3.5 inline mr-1" />Ro'yxat
              </button>
              <button onClick={() => setAssignmentView('calendar')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${assignmentView === 'calendar' ? 'bg-[#4b30fb] text-white' : 'text-white/40'}`}>
                <Calendar className="w-3.5 h-3.5 inline mr-1" />Kalendar
              </button>
            </div>
            <button onClick={() => setShowCreateAssignment(true)}
              className="flex items-center gap-2 bg-gradient-to-br from-green-500 to-green-600 text-white px-4 py-2 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform text-sm font-medium">
              <Plus size={16} /> Yangi vazifa
            </button>
          </div>
        </div>
        {assignmentView === 'calendar' ? (
          <AssignmentCalendar assignments={assignments} onAssignmentClick={fetchAssignmentDetail} />
        ) : (
          renderAssignmentList()
        )}
      </div>
    );
  };

  const renderAssignmentList = () => (
    <>
      {assignments.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <ClipboardList className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">Hozircha vazifa yo'q</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => (
            <div key={a.id} onClick={() => fetchAssignmentDetail(a.id)}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-white font-bold group-hover:text-[#4b30fb] transition-colors">{a.title}</h4>
                  <p className="text-white/50 text-sm mt-1">{a.description || ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${a.assignment_type === 'homework' ? 'bg-blue-500/20 text-blue-400' :
                    a.assignment_type === 'test' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>{a.assignment_type}</span>
                  <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-white/40">
                {a.due_date && <span><Calendar size={14} className="inline mr-1" />{new Date(a.due_date).toLocaleDateString('uz')}</span>}
                <span><Users size={14} className="inline mr-1" />{a.total_students || 0} ta</span>
                <span><CheckCircle size={14} className="inline mr-1" />{a.submitted_count || 0} topshirdi</span>
                <span className="text-green-400"><Award size={14} className="inline mr-1" />{a.graded_count || 0} baholandi</span>
              </div>
              {(a.total_students || 0) > 0 && (
                <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                    style={{ width: `${Math.round(((a.graded_count || 0) / a.total_students) * 100)}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

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
              <button key={tab.id} onClick={() => {
                if (tab.id === 'marketplace') {
                  navigate('/market');
                  return;
                }
                setActiveTab(tab.id);
                setSelectedClassroom(null);
                setClassroomDetail(null);
              }}
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

        {/* Mobile Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a2e] border-t border-white/10 flex z-[999]">
          {tabs.slice(0, 4).map((tab) => (
            <button key={tab.id} onClick={() => {
              setShowMobileMenu(false);
              if (tab.id === 'marketplace') {
                navigate('/market');
              } else {
                setActiveTab(tab.id);
              }
            }}
              className={`flex-1 flex flex-col items-center py-2 px-1 text-[10px] gap-1 border-none cursor-pointer transition-colors min-w-0 ${activeTab === tab.id && !showMobileMenu ? 'text-[#4b30fb] bg-transparent' : 'text-gray-400 bg-transparent'
                }`}>
              <tab.icon size={18} /><span className="truncate">{tab.label}</span>
            </button>
          ))}
          <button onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`flex-1 flex flex-col items-center py-2 px-1 text-[10px] gap-1 border-none cursor-pointer transition-colors min-w-0 ${showMobileMenu ? 'text-[#4b30fb] bg-transparent' : 'text-gray-400 bg-transparent'
              }`}>
            <Menu size={18} /><span>Yana</span>
          </button>
        </div>

        {/* Mobile "More" Menu Overlay */}
        {showMobileMenu && (
          <div className="md:hidden fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)}>
            <div className="absolute bottom-[60px] left-4 right-4 bg-[#1e1e3a] border border-white/10 rounded-2xl p-2 grid grid-cols-3 gap-1 shadow-2xl animate-in slide-in-from-bottom-5 duration-200" onClick={e => e.stopPropagation()}>
              {tabs.slice(4).map((tab) => (
                <button key={tab.id} onClick={() => {
                  setShowMobileMenu(false);
                  if (tab.id === 'marketplace') {
                    navigate('/market');
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
                  className={`flex flex-col items-center py-4 px-1 rounded-xl text-[10px] gap-2 border-none cursor-pointer transition-all ${activeTab === tab.id ? 'bg-[#4b30fb]/20 text-[#4b30fb]' : 'text-white/60 hover:bg-white/5 bg-transparent'
                    }`}>
                  <tab.icon size={20} /><span className="text-center line-clamp-1">{tab.label}</span>
                </button>
              ))}
              <button onClick={() => { logout(); navigate('/'); }}
                className="flex flex-col items-center py-4 px-1 rounded-xl text-[10px] gap-2 border-none cursor-pointer text-red-400 hover:bg-red-500/10 bg-transparent">
                <LogOut size={20} /><span>Chiqish</span>
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">{renderContent()}</div>
        </main>
      </div>


        {/* Sinfni o'chirishni tasdiqlash modali */}
        {classToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setClassToDelete(null)}></div>
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-md relative z-10 shadow-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-400">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sinfni o'chirishni tasdiqlaysizmi?</h3>
              <p className="text-white/60 text-sm mb-6">
                Siz <strong>{classToDelete.name || classToDelete.classroom_name}</strong> sinfini o'chirmoqchisiz.<br/>
                Sinfda <strong>{classToDelete.students_count ?? classToDelete.total_students ?? 0} ta o'quvchi</strong> bor.<br/>
                <span className="text-red-400 font-medium block mt-2">Bu ma'lumotlar qayta tiklanmaydi!</span>
              </p>
              
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setClassToDelete(null)}
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={executeDeleteClassroom}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 rounded-xl text-white font-bold transition-colors shadow-lg shadow-red-500/20"
                >
                  O'chirish
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Create Class Modal */}
      {renderModal(showCreateClass, () => setShowCreateClass(false), 'Yangi sinf yaratish',
        <form onSubmit={handleCreateClass} className="space-y-4">
          <input type="text" placeholder="Sinf nomi *" value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]" />
          <select value={newClass.subject || ''} onChange={e => setNewClass({ ...newClass, subject: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb]">
            <option value="" disabled className="text-gray-800">Fan tanlang *</option>
            <option value="Kitobxonlik" className="text-gray-800">Kitobxonlik</option>
            <option value="Matematika" className="text-gray-800">Matematika</option>
            <option value="Ona tili va Adabiyot" className="text-gray-800">Ona tili va Adabiyot</option>
            <option value="Ingliz tili" className="text-gray-800">Ingliz tili</option>
            <option value="Fizika" className="text-gray-800">Fizika</option>
            <option value="Kimyo" className="text-gray-800">Kimyo</option>
            <option value="Tarix" className="text-gray-800">Tarix</option>
            <option value="Biologiya" className="text-gray-800">Biologiya</option>
            <option value="Informatika" className="text-gray-800">Informatika</option>
            <option value="Boshqa" className="text-gray-800">Boshqa</option>
          </select>
          <input type="text" placeholder="Sinf darajasi (masalan: 5-sinf, 9-A)" value={newClass.grade_level} onChange={e => setNewClass({ ...newClass, grade_level: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]" />
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

      {/* Create Student Modal */}
      {renderModal(showCreateStudentModal, () => setShowCreateStudentModal(false), "Yangi o'quvchi yaratish",
        <form onSubmit={handleCreateStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">Ism</label>
              <input type="text" required value={createStudentData.first_name} onChange={e => setCreateStudentData({...createStudentData, first_name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb]" placeholder="Masalan: Ali" />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">Familiya</label>
              <input type="text" required value={createStudentData.last_name} onChange={e => setCreateStudentData({...createStudentData, last_name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb]" placeholder="Masalan: Valiyev" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Parol (ixtiyoriy, kiritilmasa avtomatik yaratiladi)</label>
            <input type="text" value={createStudentData.password} onChange={e => setCreateStudentData({...createStudentData, password: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4b30fb]" placeholder="Kamida 6 belgi" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
             {loading ? 'Yaratilmoqda...' : 'Yaratish'}
          </button>
        </form>
      )}

      {/* Edit Student Modal */}
      {renderModal(showEditStudentModal, () => setShowEditStudentModal(false), "O'quvchi ma'lumotlarini tahrirlash",
        <form onSubmit={handleUpdateStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">Ism</label>
              <input type="text" required value={editingStudent?.first_name || ''} onChange={e => setEditingStudent({...editingStudent, first_name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">Familiya</label>
              <input type="text" required value={editingStudent?.last_name || ''} onChange={e => setEditingStudent({...editingStudent, last_name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Yangi parol (ixtiyoriy, kiritilmasa o'zgarmaydi)</label>
            <input type="text" value={editingStudent?.password?.startsWith('PIN:') ? '' : (editingStudent?.password || '')} onChange={e => setEditingStudent({...editingStudent, password: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500" placeholder="Yangi parol..." />
          </div>
          <button type="submit" disabled={createdStudentsLoading} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">
             {createdStudentsLoading ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </form>
      )}

      {/* Studentni o'chirishni tasdiqlash modali */}
      {studentToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setStudentToDelete(null)}></div>
          <div className="relative bg-[#1a1b2e] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">O'quvchini o'chirishni tasdiqlaysizmi?</h3>
              <p className="text-white/60 text-sm mb-6">
                Siz <strong>{studentToDelete.first_name} {studentToDelete.last_name}</strong> ni butunlay o'chirmoqchisiz.<br/>
                Ushbu amalni ortga qaytarib bo'lmaydi va o'quvchining barcha yutuqlari o'chadi.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setStudentToDelete(null)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={handleDeleteStudent}
                  disabled={createdStudentsLoading}
                  className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  {createdStudentsLoading ? 'O\'chirilmoqda...' : 'O\'chirish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderModal(!!createdStudentInfo, () => setCreatedStudentInfo(null), "O'quvchi yaratildi",
        <div className="space-y-4 text-center">
          <div className="bg-green-500/20 text-green-400 p-4 rounded-xl mb-4">
            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            <p className="font-bold">O'quvchi tizimga qo'shildi</p>
          </div>
          <p className="text-white/80 text-sm">
            Quyidagi ma'lumotlarni o'quvchiga taqdim eting. O'quvchi ushbu ID va parol orqali tizimga kiradi.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/60">F.I.SH:</span>
              <span className="text-white font-bold">{createdStudentInfo?.first_name} {createdStudentInfo?.last_name}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/60">Login ID:</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono text-[#4b30fb] bg-white px-2 rounded font-bold">{createdStudentInfo?.id}</span>
                <button onClick={() => copyInviteCode(createdStudentInfo?.id)} className="text-white/40 hover:text-white"><Copy size={16}/></button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60">Parol:</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono text-[#4b30fb] bg-white px-2 rounded font-bold">{createdStudentInfo?.password}</span>
                <button onClick={() => copyInviteCode(createdStudentInfo?.password)} className="text-white/40 hover:text-white"><Copy size={16}/></button>
              </div>
            </div>
          </div>
          <button onClick={() => setCreatedStudentInfo(null)} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl mt-4">Yopish</button>
        </div>
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
            <div className="bg-gradient-to-br from-[#1e1e3e] to-[#2a2a4e] border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-purple-400" />
                <span className="text-white font-bold">Test yaratish usuli</span>
              </div>
              
              <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
                <button type="button" onClick={() => setTestMode('ai')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${testMode === 'ai' ? 'bg-[#4b30fb] text-white shadow-lg shadow-[#4b30fb]/20' : 'text-white/40 hover:text-white/60'}`}>
                  AI yordamida
                </button>
                <button type="button" onClick={() => setTestMode('parse')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${testMode === 'parse' ? 'bg-[#4b30fb] text-white shadow-lg shadow-[#4b30fb]/20' : 'text-white/40 hover:text-white/60'}`}>
                  Matn/Fayldan
                </button>
                <button type="button" onClick={() => setTestMode('manual')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${testMode === 'manual' ? 'bg-[#4b30fb] text-white shadow-lg shadow-[#4b30fb]/20' : 'text-white/40 hover:text-white/60'}`}>
                  Qo'lda (Tezkor)
                </button>
              </div>

              {testMode === 'ai' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <textarea
                    className="w-full bg-black/20 border border-purple-500/30 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-purple-400 placeholder:text-white/20"
                    rows={4}
                    placeholder="Dars matni yoxud hikoyani kiriting. AI unga asoslanib test tuzib beradi..."
                    value={aiPromptText}
                    onChange={(e) => setAiPromptText(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={aiGenerating}
                    onClick={handleGenerateAITest}
                    className="px-4 py-3 bg-purple-600/30 text-purple-300 rounded-xl text-sm font-bold hover:bg-purple-600/50 transition-all w-full border border-purple-500/30 flex items-center justify-center disabled:opacity-50">
                    {aiGenerating ? <div className="w-4 h-4 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    {aiGenerating ? 'Test generatsiya qilinmoqda...' : 'Testni generatsiya qilish'}
                  </button>
                </div>
              )}

              {testMode === 'parse' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-black/20 border border-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-2">Variant 1: Matnni joylang</p>
                    <textarea
                      className="w-full bg-transparent border-none p-0 text-white text-sm focus:outline-none placeholder:text-white/10"
                      rows={3}
                      placeholder="Test savollari va variantlarini bu yerga nusxalab qo'ying..."
                      value={aiPromptText}
                      onChange={(e) => setAiPromptText(e.target.value)}
                    />
                    <button type="button" onClick={handleParseTextTest} disabled={isAnalyzing || !aiPromptText}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium disabled:opacity-30">
                      {isAnalyzing ? "Tahlil qilinmoqda..." : "Matndan analiz qilish"}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                    <div className="relative flex justify-center"><span className="bg-[#1e1e3e] px-2 text-[10px] text-white/20 font-bold">YOKI</span></div>
                  </div>

                  <div className="bg-black/20 border border-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-2">Variant 2: Fayl yuklang (PDF/Word)</p>
                    <input type="file" accept=".pdf,.doc,.docx" id="test-file-input" className="hidden" 
                      onChange={(e) => handleParseFileTest(e.target.files[0])} />
                    <label htmlFor="test-file-input" className="flex items-center gap-3 p-3 bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400"><Paperclip size={16} /></div>
                      <div>
                        <div className="text-white text-xs font-medium">Hujjat sarlavhasini tanlang</div>
                        <div className="text-white/30 text-[10px]">PDF, Word fayllar qo'llab-quvvatlanadi</div>
                      </div>
                    </label>
                    {isAnalyzing && <div className="mt-2 text-center"><div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mr-2 inline-block align-middle" /><span className="text-[10px] text-blue-400">Fayl analiz qilinmoqda...</span></div>}
                  </div>
                </div>
              )}

              {testMode === 'manual' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                    <Edit size={24} className="text-white/20 mx-auto mb-2" />
                    <p className="text-white/60 text-xs">Test savollarini qo'lda kiritish yoki test builder-dan foydalanish uchun bosing</p>
                    <button type="button" onClick={() => { setParsedQuestions([{ id: 1, question: '', options: ['', '', '', ''], correct_answer: 0 }]); setShowTestReview(true); }}
                      className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors">
                      Test Builderni ochish
                    </button>
                  </div>
                </div>
              )}
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
          <input type="text" placeholder="Sinf darajasi (masalan: 5-sinf, 9-A)" value={newLesson.grade_level} onChange={e => setNewLesson({ ...newLesson, grade_level: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]" />
          <input type="text" placeholder="Video URL - ixtiyoriy (YouTube/Vimeo)" value={newLesson.video_url} onChange={e => setNewLesson({ ...newLesson, video_url: e.target.value })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#4b30fb]" />
          <div>
            <label className="text-white/60 text-sm mb-1 block">Fayl yuklash (rasm, PDF, hujjat - ixtiyoriy)</label>
            <input type="file" onChange={e => setLessonFile(e.target.files[0] || null)}
              className="w-full text-sm text-white/60 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#4b30fb] file:text-white hover:file:bg-[#3d24d9] file:cursor-pointer" />
            {lessonFile && <p className="text-white/40 text-xs mt-1">{lessonFile.name} ({(lessonFile.size / 1024).toFixed(1)} KB)</p>}
          </div>
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

      {/* Student Import Modal */}
      {renderModal(showStudentImport, () => setShowStudentImport(false), "O'quvchilarni import qilish",
        <StudentImport
          classroomId={selectedClassroom}
          onImportComplete={() => { fetchClassroomDetail(selectedClassroom); setShowStudentImport(false); }}
          onClose={() => setShowStudentImport(false)}
        />
      )}

      {/* Create Ertak Modal */}
      {createErtakModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1e1e3a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Yangi Kitob Yaratish</h3>
              <button onClick={() => setCreateErtakModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Sarlavha *</label>
                    <input type="text" value={ertakForm.title} onChange={v => setErtakForm({ ...ertakForm, title: v.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" placeholder="Kitob nomi..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Til</label>
                      <select value={ertakForm.language} onChange={v => setErtakForm({ ...ertakForm, language: v.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                        <option value="uz">O'zbekcha</option>
                        <option value="ru">Ruscha</option>
                        <option value="en">Inglizcha</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Yosh guruhi</label>
                      <select value={ertakForm.age_group} onChange={v => setErtakForm({ ...ertakForm, age_group: v.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                        <option value="Barchasi">Barchasi</option>
                        <option value="3-5">3-5 yosh</option>
                        <option value="6-8">6-8 yosh</option>
                        <option value="9-12">9-12 yosh</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Kitob Matni *</label>
                    <textarea value={ertakForm.content} onChange={v => setErtakForm({ ...ertakForm, content: v.target.value })} rows={10}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 resize-none" placeholder="Kitob mazmunini bu yerga yozing..." />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <label className="text-xs font-bold text-white/60 mb-3 block">Media fayllar</label>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-white/30 block mb-1">Rasm (Muqova)</span>
                        <input type="file" accept="image/*" onChange={e => setUploadImage(e.target.files[0])} className="text-xs text-white/40" />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/30 block mb-1">Audio (Kitob ovozi)</span>
                        <input type="file" accept="audio/*" onChange={e => setUploadFile(e.target.files[0])} className="text-xs text-white/40" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Savollar (Viktoriina)</label>
                      <button onClick={() => setErtakQuestions([...ertakQuestions, { question: '', answer: '' }])} className="text-[10px] text-orange-400 hover:text-orange-300 font-bold uppercase tracking-widest bg-transparent border-none cursor-pointer">+ Qo'shish</button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {ertakQuestions.map((q, idx) => (
                        <div key={idx} className="bg-black/20 rounded-xl p-3 space-y-2 relative group">
                          <input type="text" value={q.question} onChange={e => { const n = [...ertakQuestions]; n[idx].question = e.target.value; setErtakQuestions(n); }}
                            className="w-full bg-transparent border-b border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50 py-1" placeholder="Savol..." />
                          <input type="text" value={q.answer} onChange={e => { const n = [...ertakQuestions]; n[idx].answer = e.target.value; setErtakQuestions(n); }}
                            className="w-full bg-transparent text-orange-400 text-xs focus:outline-none py-1" placeholder="To'g'ri javob..." />
                          <button onClick={() => setErtakQuestions(ertakQuestions.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-white/10 bg-black/20 flex gap-3">
              <button onClick={() => setCreateErtakModal(false)} className="flex-1 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl text-sm font-bold transition-all">Bekor qilish</button>
              <button onClick={handleCreateErtak} disabled={saving || !ertakForm.title || !ertakForm.content}
                className="flex-1 py-3 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-all disabled:opacity-40">
                {saving ? 'Saqlanmoqda...' : 'Kitobni saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ertak Modal */}
      {editErtak && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1e1e3a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Kitobni Tahrirlash: {editErtak.title}</h3>
              <button onClick={() => setEditErtak(null)} className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Sarlavha *</label>
                    <input type="text" value={editErtakForm.title} onChange={v => setEditErtakForm({ ...editErtakForm, title: v.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Til</label>
                      <select value={editErtakForm.language} onChange={v => setEditErtakForm({ ...editErtakForm, language: v.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                        <option value="uz">O'zbekcha</option>
                        <option value="ru">Ruscha</option>
                        <option value="en">Inglizcha</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Yosh guruhi</label>
                      <select value={editErtakForm.age_group} onChange={v => setEditErtakForm({ ...editErtakForm, age_group: v.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
                        <option value="Barchasi">Barchasi</option>
                        <option value="3-5">3-5 yosh</option>
                        <option value="6-8">6-8 yosh</option>
                        <option value="9-12">9-12 yosh</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Ertak Matni *</label>
                    <textarea value={editErtakForm.content} onChange={v => setEditErtakForm({ ...editErtakForm, content: v.target.value })} rows={10}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 resize-none" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <label className="text-xs font-bold text-white/60 mb-3 block">Media fayllar</label>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-white/30 block mb-1">Yangi rasm (Ixtiyoriy)</span>
                        <input type="file" accept="image/*" onChange={e => setUploadImage(e.target.files[0])} className="text-xs text-white/40" />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/30 block mb-1">Yangi audio (Ixtiyoriy)</span>
                        <input type="file" accept="audio/*" onChange={e => setUploadFile(e.target.files[0])} className="text-xs text-white/40" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Savollar (Viktoriina)</label>
                      <button onClick={() => setEditErtakQuestions([...editErtakQuestions, { question: '', answer: '' }])} className="text-[10px] text-orange-400 hover:text-orange-300 font-bold uppercase tracking-widest bg-transparent border-none cursor-pointer">+ Qo'shish</button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {editErtakQuestions.map((q, idx) => (
                        <div key={idx} className="bg-black/20 rounded-xl p-3 space-y-2 relative group">
                          <input type="text" value={q.question} onChange={e => { const n = [...editErtakQuestions]; n[idx].question = e.target.value; setEditErtakQuestions(n); }}
                            className="w-full bg-transparent border-b border-white/10 text-white text-sm focus:outline-none focus:border-orange-500/50 py-1" placeholder="Savol..." />
                          <input type="text" value={q.answer} onChange={e => { const n = [...editErtakQuestions]; n[idx].answer = e.target.value; setEditErtakQuestions(n); }}
                            className="w-full bg-transparent text-orange-400 text-xs focus:outline-none py-1" placeholder="To'g'ri javob..." />
                          <button onClick={() => setEditErtakQuestions(editErtakQuestions.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-white/10 bg-black/20 flex gap-3">
              <button onClick={() => setEditErtak(null)} className="flex-1 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl text-sm font-bold transition-all">Bekor qilish</button>
              <button onClick={handleUpdateErtak} disabled={saving || !editErtakForm.title || !editErtakForm.content}
                className="flex-1 py-3 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-all disabled:opacity-40">
                {saving ? 'Yangilanmoqda...' : 'O\'zgarishlarni saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Marketplace Listing Modal */}
      {renderModal(showMarketListModal, () => setShowMarketListModal(false), "Resursni sotuvga qo'yish",
        <form onSubmit={handleListResourceInMarketplace} className="space-y-4">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-4">
             <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Tanlangan resurs</div>
             <div className="text-white font-bold">{marketItemData.title}</div>
          </div>
          
          <div>
            <label className="block text-xs font-black text-white/40 uppercase mb-2">Narxi (UZS)</label>
            <div className="relative">
              <input 
                type="number" 
                placeholder="15000" 
                value={marketItemData.price} 
                onChange={e => setMarketItemData({ ...marketItemData, price: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500" 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 font-bold">UZS</span>
            </div>
            <p className="text-[10px] text-white/30 mt-2 italic">Platforma komissiyasi: 10% ({(marketItemData.price * 0.1).toLocaleString()} so'm)</p>
          </div>

          <div>
            <label className="block text-xs font-black text-white/40 uppercase mb-2">Qisqacha tavsif</label>
            <textarea 
              placeholder="Ushbu dars nima haqida? (Buyerlar uchun)" 
              value={marketItemData.description} 
              onChange={e => setMarketItemData({ ...marketItemData, description: e.target.value })}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white h-24 resize-none focus:outline-none focus:border-green-500"
            />
          </div>

          <button 
            type="submit" 
            disabled={marketListingLoading}
            className="w-full bg-gradient-to-br from-green-500 to-green-600 text-white py-4 rounded-xl font-black shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {marketListingLoading ? 'YUKLANMOQDA...' : 'MARKETGA JOYLASHTIRISH'}
          </button>
        </form>
      )}

      {/* Test Review & Edit Modal */}
      {showErtakPreview && selectedErtakForPreview && (
        <ErtakPreviewModal 
          ertak={selectedErtakForPreview} 
          onClose={() => { setShowErtakPreview(false); setSelectedErtakForPreview(null); }} 
        />
      )}

      {/* Student Reading History Modal */}
      {selectedStudentHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedStudentHistory(null)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="text-blue-400" />
                {selectedStudentHistory.first_name} {selectedStudentHistory.last_name} tarixi
              </h3>
              <button onClick={() => setSelectedStudentHistory(null)} className="text-white/60 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            {studentHistoryLoading ? (
              <div className="text-center py-8 text-white/60">Yuklanmoqda...</div>
            ) : studentHistoryData.length > 0 ? (
              <div className="space-y-4">
                {studentHistoryData.map((record) => (
                  <div key={record.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 items-center">
                    <img 
                      src={record.book_image_url || '/default-book.png'} 
                      alt={record.book_title} 
                      className="w-16 h-20 object-cover rounded-lg bg-white/10 shrink-0" 
                      onError={e => e.target.src='/default-book.png'}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold text-white truncate">{record.book_title}</h4>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="text-sm">
                          <span className="text-white/60">Savollar: </span>
                          <span className="font-bold text-green-400">{record.quiz_score !== null ? record.quiz_score : '-'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-white/60">Test: </span>
                          <span className="font-bold text-blue-400">{record.test_score !== null ? record.test_score : '-'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-white/60">Sana: </span>
                          <span className="text-white/80">{new Date(record.completed_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-yellow-400">{(record.quiz_score || 0) + (record.test_score || 0)}</div>
                      <div className="text-xs text-white/40 uppercase">Ball</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                O'quvchi hali kitob o'qimagan.
              </div>
            )}
          </div>
        </div>
      )}

      <TestReviewModal 
        show={showTestReview} 
        questions={parsedQuestions} 
        onClose={() => setShowTestReview(false)} 
        onSave={handleTestFinalized} 
        onShowNotif={showNotif}
      />
    </div>
  );
};

const TestReviewModal = ({ show, questions, onClose, onSave, onShowNotif }) => {
  const [localQuestions, setLocalQuestions] = React.useState(questions);
  const [pastedText, setPastedText] = React.useState('');
  const [testName, setTestName] = React.useState('');
  const [testSubject, setTestSubject] = React.useState('');
  const [activeSection, setActiveSection] = React.useState('questions'); // questions, paste, file
  const fileInputRef = React.useRef(null);
  const imgInputRef = React.useRef(null);
  const [imgTarget, setImgTarget] = React.useState(null); // { qIdx, type: 'question'|'option', oIdx? }
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  React.useEffect(() => {
    setLocalQuestions(questions);
  }, [questions]);

  if (!show) return null;

  // ========== parseRawText: aqlli matn tahlilchisi ==========
  const parseRawText = (raw) => {
    if (!raw || !raw.trim()) return [];
    const lines = raw.split('\n').map(l => l.trimEnd());
    const result = [];
    let current = null;
    const answerKeyMap = {};

    // 1-qadam: Oxiridagi javob kalitlarini izlash (masalan: "1. A 2. C 3. B")
    const fullText = raw.trim();
    const keyPatterns = [
      /(\d+)\s*[\.\)]\s*([A-Da-d])/g,
    ];
    // Oxirgi paragrafdan javob kalitlarini izlash
    const paragraphs = fullText.split(/\n\s*\n/);
    const lastParagraph = paragraphs[paragraphs.length - 1]?.trim() || '';
    // Agar oxirgi paragraf faqat javob kalitlaridan iborat bo'lsa
    const keyLineMatch = lastParagraph.match(/^[\d\s\.\)\:A-Da-d,]+$/);
    if (keyLineMatch) {
      let m;
      const regex = /(\d+)\s*[\.\)\:]\s*([A-Da-d])/g;
      while ((m = regex.exec(lastParagraph)) !== null) {
        const qNum = parseInt(m[1]);
        const ansLetter = m[2].toUpperCase();
        answerKeyMap[qNum] = 'ABCD'.indexOf(ansLetter);
      }
    }

    // 2-qadam: Savollarni ajratish
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Savol boshlanishini aniqlash: "1. ...", "1) ...", "1️. ..." yoki "2️. ..."
      const qMatch = line.match(/^(\d+)\s*[\.\)\️⃣]\s*\.?\s*(.+)/);
      if (qMatch) {
        if (current) result.push(current);
        current = {
          id: Date.now() + result.length,
          question: qMatch[2].trim(),
          options: [],
          correct_answer: 0,
          type: 'multiple',
          image: null,
          optionImages: {},
        };
        continue;
      }

      if (!current) continue;

      // "To'g'ri javob" qatorini aniqlash
      const correctMatch = line.match(/[Tt]o['']?g['']?ri\s+javob\s*[:\-]?\s*([A-Da-d])/i);
      if (correctMatch) {
        const idx = 'ABCD'.indexOf(correctMatch[1].toUpperCase());
        if (idx >= 0) current.correct_answer = idx;
        continue;
      }

      // Variant qatorini aniqlash: "A) ...", "#B) ...", "A. ..."
      const optMatch = line.match(/^(#)?\s*([A-Da-d])\s*[\.\)]\s*(.+)/);
      if (optMatch) {
        const isCorrect = !!optMatch[1];
        const optText = optMatch[3].trim();
        const optIdx = current.options.length;
        current.options.push(optText);
        if (isCorrect) current.correct_answer = optIdx;
        continue;
      }

      // Qolgan qatorlarni savol matni davomi deb qo'shish
      if (current.options.length === 0) {
        current.question += '\n' + line;
      }
    }
    if (current) result.push(current);

    // 3-qadam: Oxiridagi javob kalitlari bilan solishtirish
    if (Object.keys(answerKeyMap).length > 0) {
      result.forEach((q, idx) => {
        const qNum = idx + 1;
        if (answerKeyMap[qNum] !== undefined && answerKeyMap[qNum] >= 0) {
          q.correct_answer = answerKeyMap[qNum];
        }
      });
    }

    // 4 ta variant bo'lishini ta'minlash
    result.forEach(q => {
      while (q.options.length < 4) q.options.push('');
    });

    return result;
  };

  const handleSmartPaste = () => {
    const parsed = parseRawText(pastedText);
    if (parsed.length === 0) return;
    setLocalQuestions(prev => [...prev, ...parsed]);
    setPastedText('');
    setActiveSection('questions');
  };

  // Fayl o'qish (TXT)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'txt') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        const parsed = parseRawText(text);
        if (parsed.length > 0) {
          setLocalQuestions(prev => [...prev, ...parsed]);
          setActiveSection('questions');
        }
      };
      reader.readAsText(file);
    } else if (ext === 'pdf' || ext === 'docx') {
      // PDF/DOCX uchun backend orqali tahlil qilish
      setIsAnalyzing(true);
      try {
        const res = await teacherService.parseFileTest(file);
        if (res.success && res.tests?.length > 0) {
          const mapped = res.tests.map(q => ({
            id: Date.now() + Math.random(),
            question: q.question,
            options: q.options || ['', '', '', ''],
            correct_answer: q.correct !== undefined ? q.correct : 0,
            type: 'multiple',
            image: null,
            optionImages: {},
          }));
          setLocalQuestions(prev => [...prev, ...mapped]);
          setActiveSection('questions');
          onShowNotif('success', `${mapped.length} ta savol olindi`);
        } else {
          onShowNotif('warning', "Savollar topilmadi");
        }
      } catch (err) {
        onShowNotif('error', "Faylni tahlil qilishda xatolik");
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      onShowNotif('error', 'Faqat TXT, PDF va Word fayllari qo\'llab-quvvatlanadi');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Rasm yuklash
  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !imgTarget) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      const updated = [...localQuestions];
      if (imgTarget.type === 'question') {
        updated[imgTarget.qIdx].image = url;
      } else {
        if (!updated[imgTarget.qIdx].optionImages) updated[imgTarget.qIdx].optionImages = {};
        updated[imgTarget.qIdx].optionImages[imgTarget.oIdx] = url;
      }
      setLocalQuestions(updated);
      setImgTarget(null);
    };
    reader.readAsDataURL(file);
    if (imgInputRef.current) imgInputRef.current.value = '';
  };

  const triggerImageUpload = (qIdx, type, oIdx) => {
    setImgTarget({ qIdx, type, oIdx });
    imgInputRef.current?.click();
  };

  const updateQuestion = (idx, field, val) => {
    const updated = [...localQuestions];
    updated[idx] = { ...updated[idx], [field]: val };
    setLocalQuestions(updated);
  };

  const updateOption = (qIdx, oIdx, val) => {
    const updated = [...localQuestions];
    updated[qIdx].options = [...updated[qIdx].options];
    updated[qIdx].options[oIdx] = val;
    setLocalQuestions(updated);
  };

  const removeQuestion = (idx) => {
    setLocalQuestions(localQuestions.filter((_, i) => i !== idx));
  };

  const addQuestion = () => {
    setLocalQuestions([...localQuestions, {
      id: Date.now(),
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      type: 'multiple',
      image: null,
      optionImages: {},
    }]);
  };

  const toggleQuestionType = (qIdx) => {
    const updated = [...localQuestions];
    const q = { ...updated[qIdx] };
    if (q.type === 'text') {
      q.type = 'multiple';
      q.options = ['', '', '', ''];
      q.correct_answer = 0;
    } else {
      q.type = 'text';
      q.options = [];
      q.correct_answer = '';
    }
    updated[qIdx] = q;
    setLocalQuestions(updated);
  };

  const removeImage = (qIdx, type, oIdx) => {
    const updated = [...localQuestions];
    if (type === 'question') {
      updated[qIdx] = { ...updated[qIdx], image: null };
    } else {
      const imgs = { ...updated[qIdx].optionImages };
      delete imgs[oIdx];
      updated[qIdx] = { ...updated[qIdx], optionImages: imgs };
    }
    setLocalQuestions(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1e1e3a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Hidden inputs */}
        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} />
        <input type="file" ref={imgInputRef} className="hidden" accept="image/*" onChange={handleImageFile} />

        {/* Header */}
        <div className="p-5 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-lg">Test Muharriri</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-xs transition-all disabled:opacity-50" title="PDF/Word/TXT fayldan yuklash">
                {isAnalyzing ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Upload size={14} />}
                {isAnalyzing ? 'Tahlil...' : 'Fayl'}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"><X size={20} /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Fan nomi</label>
              <input
                type="text"
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
                placeholder="Masalan: Matematika, Tarix, Fizika..."
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/15"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Test nomi</label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Masalan: Kasr sonlar, Amir Temur davri..."
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 placeholder:text-white/15"
              />
            </div>
          </div>
          <p className="text-white/30 text-xs">Jami: {localQuestions.length} ta savol</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3">
          <button onClick={() => setActiveSection('questions')}
            className={`px-4 py-2 rounded-t-lg text-xs font-bold transition-all ${activeSection === 'questions' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
            Savollar ({localQuestions.length})
          </button>
          <button onClick={() => setActiveSection('paste')}
            className={`px-4 py-2 rounded-t-lg text-xs font-bold transition-all ${activeSection === 'paste' ? 'bg-purple-500/20 text-purple-300' : 'text-white/30 hover:text-white/60'}`}>
            Matndan import
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Paste section */}
          {activeSection === 'paste' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} className="text-purple-400" />
                  <span className="text-white/80 text-sm font-bold">Matnni joylashtiring</span>
                </div>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={"Test matnini shu yerga joylang...\n\nMisol:\n1. Savol matni?\nA) Variant A\n#B) To'g'ri javob\nC) Variant C\nD) Variant D\n\nYoki oxirida: 1. A 2. C 3. B"}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-purple-500/50 min-h-[200px] font-mono leading-relaxed"
                />
                <div className="flex gap-2">
                  <button onClick={handleSmartPaste} disabled={!pastedText.trim()}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-30 flex items-center justify-center gap-2">
                    <Zap size={16} /> Matnni testga aylantirish
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                    <Upload size={16} /> Fayldan
                  </button>
                </div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                <p className="text-white/30 text-[11px] font-bold uppercase tracking-wider mb-2">Qo'llab-quvvatlanadigan formatlar:</p>
                <div className="space-y-1.5 text-white/40 text-xs">
                  <p>• <code className="bg-white/10 px-1 rounded">#B) Javob</code> — # belgisi to'g'ri javobni belgilaydi</p>
                  <p>• <code className="bg-white/10 px-1 rounded">To'g'ri javob C</code> — har bir savoldan keyin</p>
                  <p>• <code className="bg-white/10 px-1 rounded">1. A 2. C 3. B</code> — oxirida javoblar ro'yxati</p>
                </div>
              </div>
            </div>
          )}

          {/* Questions section */}
          {activeSection === 'questions' && (
            <>
              {localQuestions.length === 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                  <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 text-sm">Hozircha savol yo'q</p>
                  <p className="text-white/30 text-xs mt-1">Qo'lda qo'shing yoki "Matndan import" bo'limidan foydalaning</p>
                </div>
              )}

              {localQuestions.map((q, qIdx) => (
                <div key={q.id || qIdx} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4 relative group">
                  {/* Savol header */}
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Savol {qIdx + 1}</label>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleQuestionType(qIdx)}
                        className="p-1.5 text-white/30 hover:text-blue-400 transition-colors" title={q.type === 'text' ? 'Variantli qilish' : 'Yozma qilish'}>
                        <Type size={15} />
                      </button>
                      <button onClick={() => triggerImageUpload(qIdx, 'question')}
                        className="p-1.5 text-white/30 hover:text-yellow-400 transition-colors" title="Rasm qo'shish">
                        <ImageIcon size={15} />
                      </button>
                      <button onClick={() => removeQuestion(qIdx)}
                        className="p-1.5 text-white/30 hover:text-red-400 transition-colors" title="O'chirish">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Savol matni + rasm */}
                  <div className="space-y-2">
                    {q.image && (
                      <div className="relative inline-block">
                        <img src={q.image} className="max-w-[200px] h-auto rounded-lg border border-white/10" alt="" />
                        <button onClick={() => removeImage(qIdx, 'question')}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-400">×</button>
                      </div>
                    )}
                    <textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-purple-500/50 min-h-[60px]"
                      placeholder="Savol matni..."
                    />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${q.type === 'text' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                      {q.type === 'text' ? 'Yozma javob' : 'Variantli'}
                    </span>
                  </div>

                  {/* Javoblar */}
                  {q.type === 'text' ? (
                    <input
                      type="text"
                      value={q.correct_answer || ''}
                      onChange={(e) => updateQuestion(qIdx, 'correct_answer', e.target.value)}
                      className="w-full bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-400/50"
                      placeholder="To'g'ri javobni yozing..."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(q.options || []).map((opt, oIdx) => (
                        <div key={oIdx} className={`flex items-center gap-2 p-2 rounded-lg transition-all ${q.correct_answer === oIdx ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5 border border-transparent'}`}>
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correct_answer === oIdx}
                            onChange={() => updateQuestion(qIdx, 'correct_answer', oIdx)}
                            className="w-4 h-4 accent-green-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            {q.optionImages?.[oIdx] && (
                              <div className="relative inline-block mb-1">
                                <img src={q.optionImages[oIdx]} className="max-w-[80px] h-auto rounded border border-white/10" alt="" />
                                <button onClick={() => removeImage(qIdx, 'option', oIdx)}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center">×</button>
                              </div>
                            )}
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                              className="w-full bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-white/15"
                              placeholder={`Variant ${String.fromCharCode(65 + oIdx)}`}
                            />
                          </div>
                          <button onClick={() => triggerImageUpload(qIdx, 'option', oIdx)}
                            className="text-white/15 hover:text-white/50 flex-shrink-0 transition-colors">
                            <ImageIcon size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <button onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-white/5 rounded-xl text-white/30 hover:text-white hover:border-white/10 hover:bg-white/5 transition-all text-sm font-medium flex items-center justify-center gap-2">
                <Plus size={18} /> Yangi savol qo'shish
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-black/20 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl text-sm font-bold transition-all">Bekor qilish</button>
          <button onClick={() => onSave(localQuestions, testSubject ? `${testSubject} — ${testName}` : testName, testSubject)} disabled={localQuestions.length === 0}
            className="flex-1 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-all disabled:opacity-40">
            Tasdiqlash va saqlash
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
