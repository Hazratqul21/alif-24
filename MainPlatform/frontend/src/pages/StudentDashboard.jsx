import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';
import coinService from '../services/coinService';
import { studentService } from '../services/studentService';
import notificationService from '../services/notificationService';
import organizationService from '../services/organizationService';
// Olympiad student UI is on olimp.alif24.uz (separate platform)
import {
    BookOpen, Trophy, Clock, Star, Play, CheckCircle, Search, Filter,
    TrendingUp, Award, Target, Calendar, MessageSquare, Users, Bell,
    Settings, Camera, Edit, Upload, Download, Send, Heart, Share2,
    Video, Phone, Mail, MapPin, GraduationCap, FileText, BarChart3,
    ChevronRight, Plus, X, Eye, Lock, Globe, Palette, Moon, Sun,
    Image, Flag, Gift, Zap, Shield, HelpCircle, MessageCircle,
    Home, Book, ClipboardList, Medal, School, Activity, TrendingDown, Bot, Coins, Flame, Languages, Laptop, Mic,
    School as SchoolIcon, UserPlus, LogIn
} from 'lucide-react';

const STORY_API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '')
    ? (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') + '/smartkids'
    : "/api/v1/smartkids";

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const { user: authUser } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);
    const [libraryFilter, setLibraryFilter] = useState('all');
    const [coinBalance, setCoinBalance] = useState(null);
    const [classrooms, setClassrooms] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [notification, setNotification] = useState(null);
    const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);
    const [bonusMessage, setBonusMessage] = useState(null);
    const [taskFilter, setTaskFilter] = useState('all');
    const [selectedTask, setSelectedTask] = useState(null);
    const [submissionContent, setSubmissionContent] = useState('');
    const [submissionFile, setSubmissionFile] = useState(null);
    const [mySchool, setMySchool] = useState(undefined); // undefined=not loaded, null=no school
    const [parentInvites, setParentInvites] = useState([]);
    const [realLessons, setRealLessons] = useState([]);
    const [realStories, setRealStories] = useState([]);
    const [contentLoading, setContentLoading] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [selectedStory, setSelectedStory] = useState(null);

    // TTS + Recording states for story modal
    const [storyPlaying, setStoryPlaying] = useState(false);
    const [storyTtsLoading, setStoryTtsLoading] = useState(false);
    const [storyTtsDone, setStoryTtsDone] = useState(false);
    const [storyRecording, setStoryRecording] = useState(false);
    const [storyRecordedUrl, setStoryRecordedUrl] = useState(null);
    const [storyPlayingRec, setStoryPlayingRec] = useState(false);
    const storyAudioRef = React.useRef(null);
    const storyMediaRecRef = React.useRef(null);
    const storyChunksRef = React.useRef([]);
    const storyRecAudioRef = React.useRef(null);

    // Interactive Test states
    const [testQuestions, setTestQuestions] = useState([]);
    const [testAnswers, setTestAnswers] = useState({});
    const [testCurrentQ, setTestCurrentQ] = useState(0);
    const [testTimeLeft, setTestTimeLeft] = useState(0);
    const [testStarted, setTestStarted] = useState(false);
    const [testSubmitting, setTestSubmitting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const fetchLMSData = async () => {
        try {
            const [classesRes, invitesRes, assignsRes] = await Promise.all([
                studentService.getMyClassrooms(),
                studentService.getInvitations(),
                studentService.getAssignments(),
            ]);
            setClassrooms(classesRes.data?.classes || []);
            setInvitations(invitesRes.data?.invitations || []);
            setAssignments(assignsRes.data?.assignments || []);
        } catch (err) {
            console.error("Error fetching LMS data:", err);
        }
        // Fetch parent invites separately (won't break if endpoint missing)
        try {
            const res = await notificationService.getNotifications();
            const notifs = res.data?.notifications || res.data || [];
            setParentInvites(notifs.filter(n => n.type === 'parent_invite' && !n.is_read));
        } catch (e) { /* ignore */ }
    };

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const apiBaseUrl = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';
                const response = await fetch(`${apiBaseUrl}/dashboard/student`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const res = await response.json();
                    setDashboardData(res.data);
                }
            } catch (err) {
                console.error("Error fetching dashboard:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
        fetchLMSData();

        // Fetch coin balance
        coinService.getBalance().then(data => {
            setCoinBalance(data);
        }).catch(() => { });

        // Notification polling har 30 sek
        const notifInterval = setInterval(async () => {
            try {
                const res = await notificationService.getUnreadCount();
                setUnreadNotifCount(res.data?.unread_count || 0);
            } catch (e) {
                // Ignore silent errors
            }
        }, 30000);

        return () => clearInterval(notifInterval);
    }, []);

    useEffect(() => {
        if (activeTab === 'school' && mySchool === undefined) {
            organizationService.getMySchool().then(res => {
                setMySchool(res.school || res.data?.school || null);
            }).catch(() => setMySchool(null));
        }
        if (activeTab === 'library' && realLessons.length === 0 && realStories.length === 0 && !contentLoading) {
            setContentLoading(true);
            Promise.allSettled([
                studentService.getLessons(),
                studentService.getErtaklar(),
            ]).then(([lessRes, storRes]) => {
                if (lessRes.status === 'fulfilled') {
                    const ld = lessRes.value.data || lessRes.value;
                    setRealLessons(Array.isArray(ld) ? ld : []);
                }
                if (storRes.status === 'fulfilled') {
                    const sd = storRes.value.data || storRes.value;
                    setRealStories(Array.isArray(sd) ? sd : []);
                }
            }).finally(() => setContentLoading(false));
        }
    }, [activeTab, mySchool]);

    // Timer logic
    useEffect(() => {
        let interval;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        } else if (!isTimerRunning && timer !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timer]);

    const handleDailyBonus = async () => {
        try {
            const result = await coinService.claimDailyBonus();
            if (result.coins_earned > 0) {
                setBonusMessage(`+${result.coins_earned} coin!`);
                setCoinBalance(prev => prev ? { ...prev, current_balance: result.new_balance } : prev);
            } else {
                setBonusMessage(result.message || 'Bugun bonus allaqachon olingan');
            }
            setDailyBonusClaimed(true);
            setTimeout(() => setBonusMessage(null), 3000);
        } catch (err) {
            setBonusMessage('Xatolik yuz berdi');
            setTimeout(() => setBonusMessage(null), 3000);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const showNotif = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleJoinClass = async (e) => {
        e.preventDefault();
        try {
            await studentService.joinByCode(joinCode);
            showNotif('success', "Sinfga muvaffaqiyatli qo'shildingiz!");
            setShowJoinModal(false);
            setJoinCode('');
            await fetchLMSData();
        } catch (err) {
            showNotif('error', err.message || "Sinfga qo'shilishda xatolik");
        }
    };

    const handleRespondInvitation = async (invitationId, action) => {
        try {
            await studentService.respondInvitation(invitationId, action);
            showNotif('success', action === 'accept' ? "Taklif qabul qilindi!" : "Taklif rad etildi");
            await fetchLMSData();
        } catch (err) {
            showNotif('error', err.message || "Xatolik yuz berdi");
        }
    };

    const handleRespondParentInvite = async (notifId, action) => {
        try {
            if (action === 'accept') {
                await studentService.acceptParentInvite(notifId);
                showNotif('success', "Ota-ona taklifi qabul qilindi!");
            } else {
                await studentService.declineParentInvite(notifId);
                showNotif('success', "Ota-ona taklifi rad etildi");
            }
            await fetchLMSData();
        } catch (err) {
            showNotif('error', err.message || "Xatolik yuz berdi");
        }
    };

    const handleSubmitAssignment = async () => {
        if (!selectedTask || (!submissionContent.trim() && !submissionFile)) return;
        try {
            let fileUrl = null;
            let fileName = null;
            if (submissionFile) {
                const formData = new FormData();
                formData.append('file', submissionFile);
                const upRes = await studentService.uploadFile(formData);
                fileUrl = upRes.url || upRes.data?.url;
                fileName = submissionFile.name;
            }
            const payload = { content: submissionContent };
            if (fileUrl) { payload.file_url = fileUrl; payload.file_name = fileName; }
            await studentService.submitAssignment(selectedTask.assignment_id || selectedTask.id, payload);
            showNotif('success', "Vazifa topshirildi!");
            setSubmissionContent('');
            setSubmissionFile(null);
            setSelectedTask(null);
            await fetchLMSData();
        } catch (err) {
            showNotif('error', err.message || "Vazifa topshirishda xatolik");
        }
    };

    const openTestTask = (task) => {
        setSelectedTask(task);
        setTestResult(null);
        setTestAnswers({});
        setTestCurrentQ(0);
        setTestStarted(false);
        setTestSubmitting(false);
        try {
            const content = task.assignment?.content || task.content;
            if (content) {
                const parsed = JSON.parse(content);
                setTestQuestions(parsed.questions || []);
                setTestTimeLeft((parsed.time_limit_minutes || 10) * 60);
            } else {
                setTestQuestions([]);
            }
        } catch {
            setTestQuestions([]);
        }
    };

    const startTest = () => {
        setTestStarted(true);
        setTestCurrentQ(0);
        setTestAnswers({});
        setTestResult(null);
    };

    const handleSubmitTest = async () => {
        if (testSubmitting) return;
        setTestSubmitting(true);
        try {
            const assignmentId = selectedTask.assignment_id || selectedTask.id;
            const res = await studentService.submitTest(assignmentId, testAnswers);
            setTestResult(res.data || res);
            setTestStarted(false);
            showNotif('success', `Test topshirildi! ${res.data?.correct_count || 0}/${res.data?.total || 0}`);
            await fetchLMSData();
        } catch (err) {
            showNotif('error', err.message || "Test topshirishda xatolik");
        } finally {
            setTestSubmitting(false);
        }
    };

    const content = {
        uz: {
            title: 'Mening Kabinetim',
            welcome: 'Salom',
            tabs: {
                dashboard: 'Bosh sahifa',
                classes: 'Sinflarim',
                profile: 'Shaxsiy kabinet',
                academic: 'Akademik',
                tasks: 'Vazifalar',
                grades: 'Baholar',
                messages: 'Xabarlar',
                library: 'Kutubxona',
                achievements: 'Yutuqlar',
                events: 'Tadbirlar',
                help: 'Yordam',
                school: 'Maktabim'
            },
            stats: {
                points: 'Ballarim',
                streak: 'Seriya'
            },
            library: {
                filters: {
                    all: 'Barchasi',
                    science: 'Fanlar',
                    lang: 'Tillar',
                    it: 'IT'
                }
            }
        },
        ru: {
            title: 'Мой Кабинет',
            welcome: 'Привет',
            tabs: {
                dashboard: 'Главная',
                classes: 'Мои классы',
                profile: 'Профиль',
                academic: 'Академия',
                tasks: 'Задания',
                grades: 'Оценки',
                messages: 'Сообщения',
                library: 'Библиотека',
                achievements: 'Достижения',
                events: 'События',
                help: 'Помощь',
                school: 'Моя школа'
            },
            stats: {
                points: 'Баллы',
                streak: 'Серия'
            },
            library: {
                filters: {
                    all: 'Все',
                    science: 'Науки',
                    lang: 'Языки',
                    it: 'IT'
                }
            }
        },
        en: {
            title: 'My Dashboard',
            welcome: 'Hello',
            tabs: {
                dashboard: 'Home',
                classes: 'My Classes',
                profile: 'Profile',
                academic: 'Academic',
                tasks: 'Tasks',
                grades: 'Grades',
                messages: 'Messages',
                library: 'Library',
                achievements: 'Achievements',
                events: 'Events',
                help: 'Help',
                school: 'My School'
            },
            stats: {
                points: 'My Points',
                streak: 'Streak'
            },
            library: {
                filters: {
                    all: 'All',
                    science: 'Science',
                    lang: 'Languages',
                    it: 'IT'
                }
            }
        }
    };

    const t = content[language] || content.uz;

    const user = {
        name: authUser?.first_name || 'Ali',
        lastName: authUser?.last_name || 'Valiyev',
        monster: <Bot size={80} className="text-white" />,
        points: dashboardData?.profile?.points || 0,
        streak: dashboardData?.profile?.streak || 0,
        level: dashboardData?.profile?.level || 1,
        parent: null, // Simply removed complex check for now
        class: '7-A',
        avgGrade: 4.5,
        rank: 3
    };

    const readingAnalyses = dashboardData?.reading_stats || {};
    const loadingAnalyses = loading;

    // Use assignments from LMS API if available, else fallback
    const displayTasks = assignments.length > 0 ? assignments.map(a => {
        // Backend returns AssignmentSubmission fields + "assignment" nested object
        const assign = a.assignment || a;
        const subStatus = a.status || 'pending'; // backend returns "status" not "submission_status"
        return {
            id: a.id || assign.id,
            assignment_id: assign.id,
            title: assign.title,
            deadline: assign.due_date ? new Date(assign.due_date).toLocaleDateString('uz') : 'Muddatsiz',
            xp: assign.max_score || 50,
            status: (subStatus === 'submitted' || subStatus === 'graded') ? 'completed' : 'pending',
            assignment_type: assign.assignment_type || 'homework',
            content: assign.content,
            assignment: assign,
            submission: a.status ? a : null,
            score: a.score,
            teacher_name: a.teacher_name,
        };
    }) : (dashboardData?.tasks || []);

    const subjects = [
        { id: 1, name: 'Matematika', teacher: 'Nodira Karimova', avgGrade: 4.8, color: '#8B5CF6' },
        { id: 2, name: 'Ingliz tili', teacher: 'Sardor Alimov', avgGrade: 4.5, color: '#EC4899' }
    ];

    const achievements = dashboardData?.achievements || [
        { id: 1, title: 'Birinchi qadam', desc: 'Birinchi darsni yakunladingiz', icon: <Flag size={32} className="text-blue-500" />, earned: true },
        { id: 2, title: 'Kitobxon', desc: '5 ta kitob o\'qidingiz', icon: <BookOpen size={32} className="text-emerald-500" />, earned: (dashboardData?.reading_stats?.total_sessions || 0) >= 5 },
        { id: 3, title: 'Matematika ustasi', desc: '10 ta matematik masala yechdingiz', icon: <Target size={32} className="text-purple-500" />, earned: false },
        { id: 4, title: 'Seriyali', desc: '7 kun ketma-ket kirdingiz', icon: <Flame size={32} className="text-orange-500" />, earned: (user.streak >= 7) },
        { id: 5, title: 'Yulduz', desc: '100 ball to\'pladingiz', icon: <Star size={32} className="text-yellow-500" />, earned: (user.points >= 100) },
        { id: 6, title: 'Tezkor', desc: 'Vazifani 5 daqiqada bajardingiz', icon: <Zap size={32} className="text-amber-500" />, earned: false },
        { id: 7, title: 'Do\'stona', desc: 'Xabar yubordingiz', icon: <MessageCircle size={32} className="text-pink-500" />, earned: false },
        { id: 8, title: 'Champion', desc: 'Sinf birinchisi bo\'ldingiz', icon: <Trophy size={32} className="text-yellow-600" />, earned: false }
    ];

    const renderDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl md:rounded-3xl p-5 md:p-8 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="z-10 flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h2 className="text-xl md:text-3xl font-bold">{t.welcome}, {user.name}!</h2>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">Lvl {user.level}</span>
                            {authUser?.id && <span className="bg-white/15 px-2 py-0.5 rounded-full text-[10px] font-mono opacity-70 cursor-pointer hover:opacity-100" onClick={() => { navigator.clipboard.writeText(authUser.id); setNotification({ type: 'success', text: 'ID nusxalandi!' }); }} title="ID nusxalash">ID: {authUser.id}</span>}
                        </div>
                        <p className="opacity-90 mb-6 flex items-center gap-2">
                            {user.parent ? <>Ota-onangiz sizni kuzatib bormoqda <Shield size={16} /></> : (displayTasks.filter(t => t.status === 'pending').length > 0 ? `Sizda ${displayTasks.filter(t => t.status === 'pending').length} ta bajarilmagan vazifa bor.` : "Barcha vazifalar bajarilgan!")}
                        </p>
                        <button onClick={() => setActiveTab('tasks')} className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                            Boshlash
                        </button>
                    </div>

                    <div className="relative z-10 animate-bounce">{user.monster}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl"><Coins size={24} className="text-yellow-600" /></div>
                        <div>
                            <p className="text-gray-500 text-sm">Coinlar</p>
                            <h3 className="text-2xl font-bold text-gray-800">{coinBalance?.current_balance ?? user.points}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl"><Flame size={24} className="text-orange-600" /></div>
                        <div>
                            <p className="text-gray-500 text-sm">{t.stats.streak}</p>
                            <h3 className="text-2xl font-bold text-gray-800">{user.streak} kun</h3>
                        </div>
                    </div>
                    <button onClick={handleDailyBonus} disabled={dailyBonusClaimed}
                        className={`bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4 text-left transition-all ${dailyBonusClaimed ? 'border-green-200 bg-green-50' : 'border-yellow-200 hover:border-yellow-400 hover:shadow-md cursor-pointer'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${dailyBonusClaimed ? 'bg-green-100' : 'bg-yellow-100 animate-pulse'}`}>
                            {dailyBonusClaimed ? <CheckCircle size={24} className="text-green-600" /> : <Gift size={24} className="text-yellow-600" />}
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Kunlik bonus</p>
                            <h3 className="text-lg font-bold text-gray-800">{dailyBonusClaimed ? 'Olingan' : '+5 coin'}</h3>
                        </div>
                    </button>
                </div>
                {bonusMessage && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center text-yellow-800 font-medium animate-pulse">
                        {bonusMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <button onClick={() => navigate('/livequiz')} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 sm:p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><Target size={24} /></div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Live Quiz</h3>
                            <p className="text-white/80 text-xs">Kod bilan qo'shiling</p>
                        </div>
                    </button>
                    <button onClick={() => navigate('/dashboard')} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><Trophy size={24} /></div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Olimpiada</h3>
                            <p className="text-white/80 text-xs">Bilimingizni sinang</p>
                        </div>
                    </button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-blue-500" /> Kitob O'qish Tahlillari
                    </h3>
                    {loadingAnalyses ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
                            <p className="text-gray-500">Yuklanmoqda...</p>
                        </div>
                    ) : readingAnalyses && readingAnalyses.total_sessions > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            <div className="bg-blue-50 p-4 rounded-xl text-center">
                                <div className="text-2xl font-bold text-blue-600">{readingAnalyses.total_words || 0}</div>
                                <div className="text-xs text-gray-600 mt-1">So'zlar</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl text-center">
                                <div className="text-2xl font-bold text-green-600">{readingAnalyses.avg_comprehension || 0}%</div>
                                <div className="text-xs text-gray-600 mt-1">Tushunish</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-xl text-center">
                                <div className="text-2xl font-bold text-purple-600">{readingAnalyses.avg_pronunciation || 0}%</div>
                                <div className="text-xs text-gray-600 mt-1">Talaffuz</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl text-center">
                                <div className="text-2xl font-bold text-red-600">{readingAnalyses.total_errors || 0}</div>
                                <div className="text-xs text-gray-600 mt-1">Xatolar</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <BookOpen size={48} className="mx-auto mb-2 opacity-30" />
                            <p>Hali kitob o'qimadingiz</p>
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Clock size={20} className="text-blue-500" /> Diqqat Vaqti
                        </h3>
                        <span className="text-2xl font-mono font-bold text-gray-700">{formatTime(timer)}</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isTimerRunning ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
                            {isTimerRunning ? 'To\'xtatish' : 'Boshlash'}
                        </button>
                        <button onClick={() => { setIsTimerRunning(false); setTimer(0) }} className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200">
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CheckCircle size={20} className="text-green-500" /> Vazifalarim
                    </h3>
                    <div className="space-y-3">
                        {displayTasks.filter(t => t.status === 'pending').slice(0, 3).map(task => (
                            <div key={task.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <h4 className="font-semibold text-gray-800 text-sm">{task.title}</h4>
                                <p className="text-xs text-gray-500">{task.deadline}</p>
                            </div>
                        ))}
                        <button onClick={() => setActiveTab('tasks')} className="w-full py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg">
                            Barchasi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderClasses = () => (
        <div className="space-y-6">
            {/* Invitations */}
            {invitations.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <UserPlus size={20} className="text-blue-500" /> Sinfga takliflar ({invitations.length})
                    </h3>
                    <div className="space-y-3">
                        {invitations.map(inv => (
                            <div key={inv.invitation_id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-800">{inv.classroom_name}</h4>
                                    <p className="text-sm text-gray-500">{inv.subject || 'Fan belgilanmagan'} • {inv.teacher_name}</p>
                                    {inv.message && <p className="text-xs text-gray-400 mt-1">"{inv.message}"</p>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRespondInvitation(inv.invitation_id, 'accept')}
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors">
                                        Qabul qilish
                                    </button>
                                    <button onClick={() => handleRespondInvitation(inv.invitation_id, 'decline')}
                                        className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                                        Rad etish
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Parent Invites */}
            {parentInvites.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Shield size={20} className="text-purple-500" /> Ota-ona taklifi ({parentInvites.length})
                    </h3>
                    <div className="space-y-3">
                        {parentInvites.map(inv => (
                            <div key={inv.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-800">{inv.title}</h4>
                                    <p className="text-sm text-gray-500">{inv.message}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRespondParentInvite(inv.id, 'accept')}
                                        className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors">
                                        Qabul qilish
                                    </button>
                                    <button onClick={() => handleRespondParentInvite(inv.id, 'decline')}
                                        className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                                        Rad etish
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* My Classrooms */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                    <SchoolIcon size={24} className="text-indigo-500" /> Sinflarim ({classrooms.length})
                </h3>
                <button onClick={() => setShowJoinModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    <LogIn size={18} /> Kod bilan qo'shilish
                </button>
            </div>

            {classrooms.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                    <SchoolIcon size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Hozircha hech qanday sinfga qo'shilmagansiz</p>
                    <p className="text-sm text-gray-400 mt-2">O'qituvchidan taklif kuting yoki kod bilan qo'shiling</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classrooms.map(c => (
                        <div key={c.classroom_id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                                        <SchoolIcon size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">{c.name}</h4>
                                        <p className="text-sm text-gray-500">{c.subject || ''} {c.grade_level ? `| ${c.grade_level}` : ''}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">O'qituvchi: <span className="font-medium text-gray-700">{c.teacher_name || "Noma'lum"}</span></span>
                                <span className="text-xs text-gray-400">{new Date(c.joined_at).toLocaleDateString('uz')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderLibrary = () => (
        <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
                {[
                    { key: 'lessons', label: 'Darslar', icon: <BookOpen size={16} />, count: realLessons.length },
                    { key: 'stories', label: 'Ertaklar', icon: <Book size={16} />, count: realStories.length },
                ].map(item => (
                    <button key={item.key} onClick={() => setLibraryFilter(item.key)}
                        className={`px-4 py-2.5 rounded-full font-medium text-sm transition-all flex items-center gap-2 ${libraryFilter === item.key || (libraryFilter === 'all' && item.key === 'lessons') ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                        {item.icon} {item.label} <span className="text-xs opacity-70">({item.count})</span>
                    </button>
                ))}
            </div>
            {contentLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
            ) : libraryFilter === 'stories' ? (
                <div>
                    {realStories.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <Book size={48} className="mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500">Hozircha ertaklar yo'q</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {realStories.map(story => (
                                <div key={story.id} onClick={() => setSelectedStory(story)} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mb-3 group-hover:from-purple-200 group-hover:to-pink-200 transition-all">
                                        <Book size={24} className="text-purple-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-800 mb-1">{story.title}</h3>
                                    <p className="text-gray-500 text-sm line-clamp-2 mb-2">{story.content?.substring(0, 120)}...</p>
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                        <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{story.age_group || '6-8'} yosh</span>
                                        <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">{story.language === 'uz' ? "O'zbek" : story.language === 'ru' ? 'Rus' : 'English'}</span>
                                        {story.has_audio && <span className="flex items-center gap-1"><Mic size={12} /> Audio</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    {realLessons.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <BookOpen size={48} className="mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500">Hozircha darslar yo'q</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {realLessons.map(lesson => (
                                <div key={lesson.id} onClick={() => setSelectedLesson(lesson)} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center shrink-0 group-hover:from-blue-200 group-hover:to-indigo-200 transition-all">
                                            <BookOpen size={24} className="text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-800 mb-1">{lesson.title}</h3>
                                            <p className="text-gray-500 text-sm line-clamp-2 mb-2">{lesson.content?.substring(0, 100)}</p>
                                            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                                                {lesson.subject && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{lesson.subject}</span>}
                                                {lesson.grade_level && <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{lesson.grade_level}</span>}
                                                {lesson.video_url && <span className="flex items-center gap-1 text-indigo-500"><Video size={12} /> Video</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {selectedLesson && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedLesson(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-gray-800">{selectedLesson.title}</h3>
                            <button onClick={() => setSelectedLesson(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="flex items-center gap-3 mb-4 text-sm">
                            {selectedLesson.subject && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{selectedLesson.subject}</span>}
                            {selectedLesson.grade_level && <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full">{selectedLesson.grade_level}</span>}
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-700 mb-4 whitespace-pre-wrap">{selectedLesson.content}</div>
                        {selectedLesson.video_url && (
                            <a href={selectedLesson.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm mb-4"><Video size={16} /> Video darsni ko'rish</a>
                        )}
                        {selectedLesson.attachments?.length > 0 && (
                            <div className="border-t pt-3 mt-3">
                                <p className="text-xs text-gray-500 mb-2">Materiallar:</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedLesson.attachments.map((att, i) => (
                                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200"><Download size={12} /> {att.name || `Fayl ${i + 1}`}</a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {selectedStory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => {
                    if (storyAudioRef.current) { storyAudioRef.current.pause(); storyAudioRef.current = null; }
                    if (storyMediaRecRef.current?.state === 'recording') storyMediaRecRef.current.stop();
                    if (storyRecAudioRef.current) { storyRecAudioRef.current.pause(); storyRecAudioRef.current = null; }
                    setStoryPlaying(false); setStoryTtsLoading(false); setStoryTtsDone(false);
                    setStoryRecording(false); setStoryRecordedUrl(null); setStoryPlayingRec(false);
                    setSelectedStory(null);
                }}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-2xl font-bold text-gray-800">{selectedStory.title}</h3>
                            <button onClick={() => {
                                if (storyAudioRef.current) { storyAudioRef.current.pause(); storyAudioRef.current = null; }
                                if (storyMediaRecRef.current?.state === 'recording') storyMediaRecRef.current.stop();
                                if (storyRecAudioRef.current) { storyRecAudioRef.current.pause(); storyRecAudioRef.current = null; }
                                setStoryPlaying(false); setStoryTtsLoading(false); setStoryTtsDone(false);
                                setStoryRecording(false); setStoryRecordedUrl(null); setStoryPlayingRec(false);
                                setSelectedStory(null);
                            }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="flex items-center gap-3 mb-4 text-sm">
                            <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full">{selectedStory.age_group || '6-8'} yosh</span>
                            <span className="bg-gray-50 text-gray-600 px-3 py-1 rounded-full">{selectedStory.language === 'uz' ? "O'zbek" : selectedStory.language === 'ru' ? 'Rus' : 'English'}</span>
                        </div>

                        {/* Ertak matni */}
                        <div className="prose prose-lg max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed mb-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">{selectedStory.content}</div>

                        {/* 1-qadam: AI o'qib bersin */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-3">
                            <p className="text-indigo-600 text-xs font-bold mb-2">1-qadam: AI o'qib bersin 🤖</p>
                            <div className="flex items-center gap-3">
                                <button
                                    disabled={storyTtsLoading}
                                    onClick={async () => {
                                        if (storyPlaying) {
                                            if (storyAudioRef.current) { storyAudioRef.current.pause(); storyAudioRef.current.currentTime = 0; storyAudioRef.current = null; }
                                            setStoryPlaying(false);
                                            return;
                                        }
                                        try {
                                            setStoryTtsLoading(true);
                                            const apiBase = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';
                                            const resp = await fetch(`${apiBase}/public/stories/${selectedStory.id}/tts`, { method: 'POST', credentials: 'include' });
                                            if (!resp.ok) throw new Error('TTS xato');
                                            const blob = await resp.blob();
                                            const url = URL.createObjectURL(blob);
                                            const audio = new Audio(url);
                                            storyAudioRef.current = audio;
                                            audio.onended = () => { setStoryPlaying(false); setStoryTtsDone(true); URL.revokeObjectURL(url); storyAudioRef.current = null; };
                                            audio.onerror = () => { setStoryPlaying(false); URL.revokeObjectURL(url); storyAudioRef.current = null; };
                                            await audio.play();
                                            setStoryPlaying(true);
                                        } catch (err) { console.error(err); alert("Audio yuklab bo'lmadi"); }
                                        finally { setStoryTtsLoading(false); }
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${storyPlaying ? 'bg-red-100 text-red-600 hover:bg-red-200' :
                                        storyTtsLoading ? 'bg-gray-100 text-gray-400 cursor-wait' :
                                            'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                >
                                    {storyTtsLoading ? <><Clock size={16} className="animate-spin" /> Yuklanmoqda...</> :
                                        storyPlaying ? <><X size={16} /> To'xtatish</> :
                                            <><Play size={16} /> 🤖 AI o'qib bersin</>}
                                </button>
                                {storyPlaying && <span className="text-xs text-indigo-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" /> Eshitilmoqda...</span>}
                                {storyTtsDone && !storyPlaying && <span className="text-xs text-green-600">✅ AI o'qib bo'ldi!</span>}
                            </div>
                        </div>

                        {/* 2-qadam: Bola o'qisin */}
                        <div className={`rounded-xl p-4 border transition-all ${storyTtsDone ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                            <p className="text-green-700 text-xs font-bold mb-2">2-qadam: Endi sen o'qi! 🎤</p>
                            {!storyTtsDone ? (
                                <p className="text-gray-400 text-sm">Avval AI o'qib bersin!</p>
                            ) : (
                                <div className="flex flex-wrap items-center gap-3">
                                    {storyRecording ? (
                                        <button onClick={() => {
                                            if (storyMediaRecRef.current?.state === 'recording') storyMediaRecRef.current.stop();
                                            setStoryRecording(false);
                                        }} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium animate-pulse">
                                            <Mic size={16} /> Yozishni to'xtatish
                                        </button>
                                    ) : (
                                        <button onClick={async () => {
                                            try {
                                                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                                const mr = new MediaRecorder(stream);
                                                storyMediaRecRef.current = mr;
                                                storyChunksRef.current = [];
                                                mr.ondataavailable = (ev) => { if (ev.data.size > 0) storyChunksRef.current.push(ev.data); };
                                                mr.onstop = () => {
                                                    const blob = new Blob(storyChunksRef.current, { type: 'audio/webm' });
                                                    setStoryRecordedUrl(URL.createObjectURL(blob));
                                                    stream.getTracks().forEach(t => t.stop());
                                                };
                                                mr.start();
                                                setStoryRecording(true);
                                            } catch { alert("Mikrofonga ruxsat bering!"); }
                                        }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition">
                                            <Mic size={16} /> 🎤 O'qishni boshlash
                                        </button>
                                    )}
                                    {storyRecording && <span className="text-xs text-red-500 flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Yozilmoqda...</span>}
                                    {storyRecordedUrl && !storyRecording && (
                                        <>
                                            <button onClick={() => {
                                                if (storyPlayingRec) {
                                                    if (storyRecAudioRef.current) { storyRecAudioRef.current.pause(); storyRecAudioRef.current = null; }
                                                    setStoryPlayingRec(false);
                                                    return;
                                                }
                                                const a = new Audio(storyRecordedUrl);
                                                storyRecAudioRef.current = a;
                                                a.onended = () => { setStoryPlayingRec(false); storyRecAudioRef.current = null; };
                                                a.play();
                                                setStoryPlayingRec(true);
                                            }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${storyPlayingRec ? 'bg-amber-100 text-amber-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                                <Play size={16} /> {storyPlayingRec ? "To'xtatish" : "🔊 O'z ovozingni eshit"}
                                            </button>
                                            <span className="text-xs text-green-600 font-medium">🌟 Barakalla! Ajoyib o'qiding!</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderSchool = () => (
        <div className="space-y-6">
            {mySchool === undefined ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto" /></div>
            ) : mySchool === null ? (
                <div className="text-center py-8">
                    <SchoolIcon size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">Hozircha biror maktabga biriktirilmagansiz</p>
                </div>
            ) : (
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl">{mySchool.name?.charAt(0)}</div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{mySchool.name}</h3>
                            {mySchool.district && <p className="text-gray-500 text-sm">{mySchool.district}</p>}
                        </div>
                    </div>
                    {mySchool.address && <p className="text-gray-500 text-sm mb-4">{mySchool.address}</p>}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{mySchool.total_teachers || 0}</div>
                            <div className="text-xs text-gray-500 mt-1">O'qituvchilar</div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">{mySchool.total_students || 0}</div>
                            <div className="text-xs text-gray-500 mt-1">O'quvchilar</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                        {mySchool.phone && <span className="flex items-center gap-1"><Phone size={14} /> {mySchool.phone}</span>}
                        {mySchool.website && <a href={mySchool.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Globe size={14} /> {mySchool.website}</a>}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            <Navbar />

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[10000] px-5 py-3 rounded-xl shadow-lg text-white font-medium ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {notification.message}
                </div>
            )}

            {/* Task Detail Modal — unified for test and regular */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]" onClick={() => { if (!testStarted) { setSelectedTask(null); setTestQuestions([]); setTestResult(null); } }}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col mx-2 sm:mx-auto" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <FileText size={20} className="text-indigo-500" /> {selectedTask.title}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {testQuestions.length > 0 ? `${testQuestions.length} ta savol | ` : ''}{selectedTask.xp} ball
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {testStarted && !testResult && (
                                    <div className={`px-3 py-1.5 rounded-full font-bold text-sm flex items-center gap-1 ${testTimeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-indigo-100 text-indigo-600'}`}>
                                        <Clock size={14} /> {formatTime(testTimeLeft)}
                                    </div>
                                )}
                                {!testStarted && (
                                    <button onClick={() => { setSelectedTask(null); setTestQuestions([]); setTestResult(null); }} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full">
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* TEST: Not started — Intro */}
                        {testQuestions.length > 0 && !testStarted && !testResult && selectedTask.status === 'pending' && (
                            <div className="p-8 text-center">
                                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText size={36} className="text-indigo-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Testga tayyormisiz?</h3>
                                <p className="text-gray-500 mb-1">{testQuestions.length} ta savol</p>
                                <p className="text-gray-500 mb-6">Vaqt: {formatTime(testTimeLeft)}</p>
                                <button onClick={startTest} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all hover:scale-105 text-lg">
                                    Testni boshlash
                                </button>
                            </div>
                        )}

                        {/* TEST: Already completed */}
                        {testQuestions.length > 0 && selectedTask.status === 'completed' && !testResult && (
                            <div className="p-8 text-center">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={36} className="text-green-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Test topshirilgan</h3>
                                {selectedTask.score != null && <p className="text-3xl font-bold text-indigo-600">{selectedTask.score} / {selectedTask.xp} ball</p>}
                                {selectedTask.submission?.feedback && <p className="text-gray-500 mt-2">{selectedTask.submission.feedback}</p>}
                            </div>
                        )}

                        {/* TEST: Active quiz */}
                        {testStarted && !testResult && testQuestions.length > 0 && (() => {
                            const q = testQuestions[testCurrentQ];
                            if (!q) return null;
                            const opts = q.options;
                            const optKeys = typeof opts === 'object' && !Array.isArray(opts) ? Object.keys(opts) : [];
                            return (
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                        {testQuestions.map((_, i) => (
                                            <button key={i} onClick={() => setTestCurrentQ(i)}
                                                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${i === testCurrentQ ? 'bg-indigo-600 text-white scale-110' : testAnswers[String(i)] ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-5 mb-4">
                                        <p className="text-sm text-indigo-500 font-bold mb-2">Savol {testCurrentQ + 1}/{testQuestions.length}</p>
                                        <h4 className="text-lg font-bold text-gray-800">{q.question}</h4>
                                    </div>
                                    <div className="space-y-3 mb-6">
                                        {optKeys.length > 0 ? optKeys.map(key => (
                                            <button key={key} onClick={() => setTestAnswers(prev => ({ ...prev, [String(testCurrentQ)]: key }))}
                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${testAnswers[String(testCurrentQ)] === key ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}>
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${testAnswers[String(testCurrentQ)] === key ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                    {key.toUpperCase()}
                                                </span>
                                                <span className="font-medium text-gray-700">{opts[key]}</span>
                                            </button>
                                        )) : (Array.isArray(opts) ? opts : []).map((opt, j) => {
                                            const key = String.fromCharCode(97 + j);
                                            return (
                                                <button key={j} onClick={() => setTestAnswers(prev => ({ ...prev, [String(testCurrentQ)]: key }))}
                                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${testAnswers[String(testCurrentQ)] === key ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}>
                                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${testAnswers[String(testCurrentQ)] === key ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                        {key.toUpperCase()}
                                                    </span>
                                                    <span className="font-medium text-gray-700">{opt}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <button onClick={() => setTestCurrentQ(Math.max(0, testCurrentQ - 1))} disabled={testCurrentQ === 0}
                                            className="px-4 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-30 font-medium">
                                            Oldingi
                                        </button>
                                        {testCurrentQ < testQuestions.length - 1 ? (
                                            <button onClick={() => setTestCurrentQ(testCurrentQ + 1)}
                                                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">
                                                Keyingi
                                            </button>
                                        ) : (
                                            <button onClick={handleSubmitTest} disabled={testSubmitting}
                                                className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                                                {testSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                                                Testni topshirish
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* TEST: Result */}
                        {testResult && (
                            <div className="p-6">
                                <div className="text-center mb-6">
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${(testResult.correct_count / testResult.total) >= 0.7 ? 'bg-green-100' : 'bg-orange-100'}`}>
                                        {(testResult.correct_count / testResult.total) >= 0.7 ? <Trophy size={40} className="text-green-500" /> : <Target size={40} className="text-orange-500" />}
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800">
                                        {(testResult.correct_count / testResult.total) >= 0.7 ? 'Ajoyib!' : 'Yomon emas!'}
                                    </h3>
                                    <p className="text-4xl font-bold text-indigo-600 my-2">{testResult.score} / {testResult.max_score}</p>
                                    <p className="text-gray-500">To'g'ri javoblar: {testResult.correct_count} / {testResult.total}</p>
                                    {testResult.coins_earned > 0 && <p className="text-yellow-600 font-bold mt-1">+{testResult.coins_earned} coin!</p>}
                                </div>
                                <div className="space-y-3 mb-6">
                                    {(testResult.results || []).map((r, i) => (
                                        <div key={i} className={`p-3 rounded-xl border-2 ${r.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                            <div className="flex items-start gap-2">
                                                {r.is_correct ? <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" /> : <X size={18} className="text-red-500 mt-0.5 shrink-0" />}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{i + 1}. {r.question}</p>
                                                    {!r.is_correct && (
                                                        <p className="text-xs mt-1">
                                                            <span className="text-red-500">Sizning javob: {r.student_answer?.toUpperCase()}</span>
                                                            {' | '}
                                                            <span className="text-green-600">To'g'ri: {r.correct_answer?.toUpperCase()}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => { setSelectedTask(null); setTestQuestions([]); setTestResult(null); }}
                                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">
                                    Yopish
                                </button>
                            </div>
                        )}

                        {/* REGULAR: Task content (non-test) */}
                        {testQuestions.length === 0 && (
                            <div className="p-6 md:p-8 flex-1">
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 md:p-6 mb-4">
                                    <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wide mb-3">Vazifa tavsifi</h4>
                                    <div className="text-gray-800 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                                        {selectedTask.description || "Vazifa matni mavjud emas."}
                                    </div>
                                </div>
                                {selectedTask.assignment?.attachments?.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                        <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2"><Download size={16} /> Biriktirilgan fayllar</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTask.assignment.attachments.map((att, i) => (
                                                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm">
                                                    <Download size={16} />
                                                    {att.name || `Fayl ${i + 1}`}
                                                    {att.size && <span className="text-xs text-blue-400">({(att.size / 1024).toFixed(0)} KB)</span>}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {testQuestions.length === 0 && selectedTask.status === 'completed' && selectedTask.submission && (
                            <div className="p-6 bg-gray-50 border-t border-gray-100">
                                <h4 className="font-bold text-gray-800 mb-2">Sizning javobingiz</h4>
                                <div className="p-4 bg-white border border-gray-200 rounded-xl whitespace-pre-wrap">
                                    {selectedTask.submission.content || "Fayl yuborilgan."}
                                </div>
                                {selectedTask.submission.feedback && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                        <h4 className="font-bold text-blue-800 mb-1">O'qituvchi izohi:</h4>
                                        <p className="text-blue-700">{selectedTask.submission.feedback}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {testQuestions.length === 0 && selectedTask.status === 'pending' && (
                            <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100">
                                <h4 className="font-bold text-gray-800 mb-3 text-lg">Javobingizni kiriting</h4>
                                <textarea
                                    value={submissionContent}
                                    onChange={e => setSubmissionContent(e.target.value)}
                                    className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-h-[180px] resize-y text-base"
                                    placeholder="Ustoz, vazifani bajardim..."
                                />
                                <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                    <div className="flex-1">
                                        <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors text-sm font-medium text-gray-600">
                                            <Upload size={16} />
                                            <span>{submissionFile ? submissionFile.name : 'Fayl biriktirish (ixtiyoriy)'}</span>
                                            <input type="file" className="hidden" onChange={e => {
                                                const f = e.target.files[0];
                                                if (f && f.size > 10 * 1024 * 1024) {
                                                    showNotif('error', 'Fayl 10MB dan oshmasligi kerak');
                                                    e.target.value = '';
                                                } else {
                                                    setSubmissionFile(f || null);
                                                }
                                            }} />
                                        </label>
                                        {submissionFile && (
                                            <button onClick={() => setSubmissionFile(null)} className="mt-1 text-xs text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer">
                                                Faylni olib tashlash
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={handleSubmitAssignment} disabled={!submissionContent.trim() && !submissionFile}
                                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base">
                                        <Send size={18} /> Topshirish
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Join Class Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]" onClick={() => setShowJoinModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Sinfga qo'shilish</h3>
                            <button onClick={() => setShowJoinModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">O'qituvchi bergan 6 xonali kodni kiriting</p>
                        <form onSubmit={handleJoinClass} className="space-y-4">
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="ABC123"
                                maxLength={6}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg font-bold tracking-wider uppercase focus:outline-none focus:border-indigo-500"
                            />
                            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                                Qo'shilish
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-[#f0f2f5] min-h-screen pt-4 pb-20 md:pb-4">
                <div className="container mx-auto px-4">
                    {/* Mobile bottom nav */}
                    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 z-50 flex overflow-x-auto no-scrollbar">
                        {['dashboard', 'classes', 'tasks', 'grades', 'library', 'olympiad', 'school', 'achievements'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[56px] h-[56px] transition-all flex-shrink-0 ${activeTab === tab ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {tab === 'dashboard' && <Star size={20} />}
                                {tab === 'classes' && <SchoolIcon size={20} />}
                                {tab === 'tasks' && <CheckCircle size={20} />}
                                {tab === 'grades' && <BarChart3 size={20} />}
                                {tab === 'library' && <Book size={20} />}
                                {tab === 'olympiad' && <Trophy size={20} />}
                                {tab === 'school' && <School size={20} />}
                                {tab === 'achievements' && <Award size={20} />}
                                <span className="text-[10px] mt-1 font-medium">{tab === 'olympiad' ? 'Olimpiada' : tab === 'school' ? 'Maktab' : t.tabs[tab]}</span>
                            </button>
                        ))}
                    </div>

                    {/* Desktop tabs */}
                    <div className="hidden md:flex gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
                        {['dashboard', 'classes', 'tasks', 'grades', 'library', 'olympiad', 'school', 'achievements'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2.5 rounded-xl font-medium transition-all min-h-[44px] flex items-center justify-center ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                {tab === 'olympiad' ? 'Olimpiada' : tab === 'school' ? 'Maktabim' : t.tabs[tab]}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'classes' && renderClasses()}
                    {activeTab === 'library' && renderLibrary()}

                    {activeTab === 'grades' && (() => {
                        const gradedTasks = displayTasks.filter(t => t.status === 'completed' && t.score !== undefined && t.score !== null);
                        const avgScore = gradedTasks.length > 0 ? Math.round(gradedTasks.reduce((sum, t) => sum + (t.score / (t.xp || 100)) * 100, 0) / gradedTasks.length) : 0;
                        return (
                            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm">
                                <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2"><BarChart3 size={22} className="text-indigo-500" /> Baholarim</h2>
                                {gradedTasks.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
                                        <div className="bg-indigo-50 rounded-xl p-2 sm:p-4 text-center">
                                            <p className="text-2xl font-bold text-indigo-600">{gradedTasks.length}</p>
                                            <p className="text-xs text-gray-500">Baholangan</p>
                                        </div>
                                        <div className="bg-green-50 rounded-xl p-2 sm:p-4 text-center">
                                            <p className="text-xl sm:text-2xl font-bold text-green-600">{avgScore}%</p>
                                            <p className="text-xs text-gray-500">O'rtacha ball</p>
                                        </div>
                                        <div className="bg-amber-50 rounded-xl p-2 sm:p-4 text-center">
                                            <p className="text-xl sm:text-2xl font-bold text-amber-600">{gradedTasks.filter(t => (t.score / (t.xp || 100)) >= 0.8).length}</p>
                                            <p className="text-xs text-gray-500">A'lo (80%+)</p>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {gradedTasks.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
                                            <p className="font-medium">Hali baholar yo'q</p>
                                            <p className="text-sm mt-1">Vazifalarni bajaring — o'qituvchi baholaydi</p>
                                        </div>
                                    ) : gradedTasks.map(task => {
                                        const pct = Math.round((task.score / (task.xp || 100)) * 100);
                                        const badgeCls = pct >= 80 ? 'text-green-600 bg-green-100' : pct >= 50 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100';
                                        const barCls = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
                                        const pctCls = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600';
                                        return (
                                            <div key={task.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-bold text-gray-800">{task.title}</h4>
                                                    <span className={`font-bold ${badgeCls} px-3 py-1 rounded-full text-sm`}>{task.score} / {task.xp}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className={`${barCls} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <p className="text-xs text-gray-500">{task.deadline}</p>
                                                    <p className={`text-xs font-bold ${pctCls}`}>{pct}%</p>
                                                </div>
                                                {task.submission?.feedback && (
                                                    <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                                                        <span className="font-medium">Izoh:</span> {task.submission.feedback}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {activeTab === 'tasks' && (
                        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                <h2 className="text-lg md:text-xl font-bold">Vazifalarim</h2>
                                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-full overflow-x-auto min-w-max">
                                    {['all', 'pending', 'completed'].map(filter => (
                                        <button key={filter} onClick={() => setTaskFilter(filter)}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${taskFilter === filter ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`}>
                                            {filter === 'all' ? 'Barchasi' : filter === 'pending' ? 'Bajarilmagan' : 'Bajarilgan'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {displayTasks.filter(tk => taskFilter === 'all' || tk.status === taskFilter).map(task => (
                                    <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 bg-gray-50 border border-gray-100 rounded-xl gap-3">
                                        <div>
                                            <h4 className={`font-bold ${task.status === 'completed' ? 'text-gray-500' : 'text-gray-800'}`}>{task.title}</h4>
                                            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1"><Calendar size={14} /> {task.deadline}</p>
                                        </div>
                                        <div className="flex items-center gap-3 self-end md:self-auto">
                                            {task.status === 'completed' && task.score !== undefined && task.score !== null && (
                                                <span className="font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full text-xs md:text-sm">{task.score} / {task.xp} ball</span>
                                            )}
                                            {task.status === 'pending' ? (
                                                <button onClick={() => openTestTask(task)} className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors">Bajarish</button>
                                            ) : (
                                                <button onClick={() => openTestTask(task)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-300 transition-colors">Ko'rish</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {displayTasks.filter(tk => taskFilter === 'all' || tk.status === taskFilter).length === 0 && (
                                    <div className="text-center py-8 text-gray-500">Bu bo'limda vazifalar yo'q.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'olympiad' && (
                        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Trophy size={40} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Olimpiadalar</h2>
                            <p className="text-gray-500 mb-2">Test, o'qish tezligi va aralash olimpiadalar</p>
                            <p className="text-gray-400 text-sm mb-6">Olimpiadalarda qatnashish uchun maxsus platforma yaratilgan</p>
                            <button
                                onClick={() => {
                                    window.location.href = 'https://olimp.alif24.uz';
                                }}
                                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl border-none cursor-pointer"
                            >
                                <Trophy size={20} /> Olimpiadaga o'tish
                                <ChevronRight size={18} />
                            </button>
                            <p className="text-xs text-gray-400 mt-4">olimp.alif24.uz — alohida tezkor platforma</p>
                        </div>
                    )}

                    {activeTab === 'school' && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><School size={24} className="text-indigo-500" /> Maktabim</h2>
                            {renderSchool()}
                        </div>
                    )}

                    {activeTab === 'achievements' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Yutuqlarim</h2>
                                <span className="text-sm text-gray-500">{achievements.filter(a => a.earned).length}/{achievements.length} qo'lga kiritilgan</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {achievements.map(ach => (
                                    <div key={ach.id} className={`bg-white p-4 md:p-6 rounded-2xl text-center shadow-sm flex flex-col items-center transition-all ${ach.earned ? 'border-2 border-yellow-300 shadow-yellow-100' : 'opacity-50 grayscale'}`}>
                                        <div className={`mb-3 p-3 rounded-full ${ach.earned ? 'bg-yellow-50' : 'bg-gray-100'}`}>{ach.icon}</div>
                                        <h3 className="font-bold text-gray-800 text-sm">{ach.title}</h3>
                                        <p className="text-xs text-gray-500 mt-1">{ach.desc}</p>
                                        {ach.earned && <span className="mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Qo'lga kiritilgan</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default StudentDashboard;