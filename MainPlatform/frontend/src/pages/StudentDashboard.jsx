import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';
import coinService from '../services/coinService';
import { studentService } from '../services/studentService';
import notificationService from '../services/notificationService';
import organizationService from '../services/organizationService';
import {
    BookOpen, Trophy, Clock, Star, Play, CheckCircle, Search, Filter,
    TrendingUp, Award, Target, Calendar, MessageSquare, Users, Bell,
    Settings, Camera, Edit, Upload, Download, Send, Heart, Share2,
    Video, Phone, Mail, MapPin, GraduationCap, FileText, BarChart3,
    ChevronRight, Plus, X, Eye, Lock, Globe, Palette, Moon, Sun,
    Image, Flag, Gift, Zap, Shield, HelpCircle, MessageCircle,
    Home, Book, ClipboardList, Medal, School, Activity, TrendingDown, Bot, Coins, Flame, Languages, Laptop,
    School as SchoolIcon, UserPlus, LogIn
} from 'lucide-react';

const STORY_API_BASE = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL + '/smartkids'
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
    const [mySchool, setMySchool] = useState(undefined); // undefined=not loaded, null=no school

    const fetchLMSData = async () => {
        try {
            const [classesRes, invitesRes, assignsRes] = await Promise.all([
                studentService.getMyClassrooms(),
                studentService.getInvitations(),
                studentService.getAssignments()
            ]);
            setClassrooms(classesRes.data?.classes || []);
            setInvitations(invitesRes.data?.invitations || []);
            setAssignments(assignsRes.data?.assignments || []);
        } catch (err) {
            console.error("Error fetching LMS data:", err);
        }
    };

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/student`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
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

    const handleSubmitAssignment = async () => {
        if (!selectedTask || !submissionContent.trim()) return;
        try {
            await studentService.submitAssignment(selectedTask.id, { content: submissionContent });
            showNotif('success', "Vazifa topshirildi!");
            setSubmissionContent('');
            setSelectedTask(null);
            await fetchLMSData(); // Refresh assignments list
        } catch (err) {
            showNotif('error', err.message || "Vazifa topshirishda xatolik");
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
        // Backend returns either Assignment direct, or AssignmentSubmission wrapped
        const assign = a.assignment || a;
        return {
            id: a.id || assign.id, // submission id or assignment id
            assignment_id: assign.id,
            title: assign.title,
            deadline: assign.due_date ? new Date(assign.due_date).toLocaleDateString('uz') : 'Muddatsiz',
            xp: assign.max_score || 50,
            status: a.submission_status === 'submitted' ? 'completed' : 'pending',
            assignment: assign,
            submission: a.submission_status ? a : null,
            score: a.score
        };
    }) : (dashboardData?.tasks || []);

    const subjects = [
        { id: 1, name: 'Matematika', teacher: 'Nodira Karimova', avgGrade: 4.8, color: '#8B5CF6' },
        { id: 2, name: 'Ingliz tili', teacher: 'Sardor Alimov', avgGrade: 4.5, color: '#EC4899' }
    ];

    const books = [
        { id: 1, title: 'Matematika 7-sinf', category: 'science', cover: <BookOpen size={48} className="text-blue-500" />, pages: 180, description: 'Algebra va geometriya asoslari, tenglamalar, funksiyalar.' },
        { id: 2, title: 'English Grammar', category: 'lang', cover: <Languages size={48} className="text-pink-500" />, pages: 120, description: 'Ingliz tili grammatikasi — tenses, articles, prepositions.' },
        { id: 3, title: 'Python for Kids', category: 'it', cover: <Laptop size={48} className="text-purple-500" />, pages: 200, description: 'Dasturlash asoslari — o\'zgaruvchilar, sikllar, funksiyalar.' },
        { id: 4, title: 'Ona tili 7-sinf', category: 'lang', cover: <Book size={48} className="text-emerald-500" />, pages: 160, description: 'O\'zbek tili grammatikasi va adabiyot.' },
        { id: 5, title: 'Tabiatshunoslik', category: 'science', cover: <Globe size={48} className="text-teal-500" />, pages: 150, description: 'Tabiat hodisalari, o\'simliklar va hayvonot olami.' },
        { id: 6, title: 'Informatika', category: 'it', cover: <Laptop size={48} className="text-indigo-500" />, pages: 140, description: 'Kompyuter savodxonligi va dasturiy ta\'minot.' }
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

    const filteredBooks = libraryFilter === 'all' ? books : books.filter(b => b.category === libraryFilter);

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
                            {user.parent ? <>Ota-onangiz sizni kuzatib bormoqda <Shield size={16} /></> : "Bugungi rejangizda 2 ta yangi vazifa bor."}
                        </p>
                        <button onClick={() => setActiveTab('tasks')} className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                            Boshlash
                        </button>
                    </div>

                    <div className="relative z-10 animate-bounce">{user.monster}</div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => navigate('/livequiz')} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🎯</div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Live Quiz</h3>
                            <p className="text-white/80 text-xs">Kod bilan qo'shiling</p>
                        </div>
                    </button>
                    <button onClick={() => navigate('/dashboard')} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🏆</div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Olimpiada</h3>
                            <p className="text-white/80 text-xs">Bilimingizni sinang</p>
                        </div>
                    </button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-blue-500" /> 📖 Kitob O'qish Tahlillari
                    </h3>
                    {loadingAnalyses ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
                            <p className="text-gray-500">Yuklanmoqda...</p>
                        </div>
                    ) : readingAnalyses && readingAnalyses.total_sessions > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                {Object.entries(t.library.filters).map(([key, label]) => (
                    <button key={key} onClick={() => setLibraryFilter(key)}
                        className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${libraryFilter === key ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                        {label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredBooks.map(book => (
                    <div key={book.id} onClick={() => setSelectedBook(book)}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
                        <div className="aspect-[3/4] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center mb-3 group-hover:from-indigo-50 group-hover:to-purple-50 transition-all">
                            {book.cover}
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{book.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">{book.pages} sahifa</p>
                    </div>
                ))}
            </div>

            {selectedBook && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedBook(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-gray-800">{selectedBook.title}</h3>
                            <button onClick={() => setSelectedBook(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 flex items-center justify-center mb-4">
                            {selectedBook.cover}
                        </div>
                        <p className="text-gray-600 text-sm mb-4">{selectedBook.description}</p>
                        <div className="flex gap-4 text-sm text-gray-500 mb-6">
                            <span className="flex items-center gap-1"><FileText size={14} /> {selectedBook.pages} sahifa</span>
                            <span className="flex items-center gap-1"><BookOpen size={14} /> {selectedBook.category === 'science' ? 'Fanlar' : selectedBook.category === 'lang' ? 'Tillar' : 'IT'}</span>
                        </div>
                        <button onClick={() => { setSelectedBook(null); navigate('/smartkids'); }}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                            <Play size={18} /> O'qishni boshlash
                        </button>
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
                <div className={`fixed top-20 right-4 z-[9999] px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {notification.message}
                </div>
            )}

            {/* Task Detail Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]" onClick={() => setSelectedTask(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">{selectedTask.title}</h3>
                                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                    <Calendar size={14} /> {selectedTask.deadline} • {selectedTask.xp} ball
                                </p>
                            </div>
                            <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="p-6 flex-1 text-gray-700 whitespace-pre-wrap">
                            {selectedTask.assignment?.content || "Vazifa matni mavjud emas."}
                        </div>

                        {selectedTask.status === 'completed' && selectedTask.submission && (
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

                        {selectedTask.status === 'pending' && (
                            <div className="p-6 bg-gray-50 border-t border-gray-100">
                                <h4 className="font-bold text-gray-800 mb-2">Javobingizni kiriting</h4>
                                <textarea
                                    value={submissionContent}
                                    onChange={e => setSubmissionContent(e.target.value)}
                                    className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-h-[150px] resize-y"
                                    placeholder="Ustoz, vazifani bajardim..."
                                />
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={handleSubmitAssignment}
                                        disabled={!submissionContent.trim()}
                                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
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
                    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 z-50 flex justify-around items-center">
                        {['dashboard', 'classes', 'tasks', 'school', 'achievements'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[64px] h-[56px] transition-all ${activeTab === tab ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {tab === 'dashboard' && <Star size={22} />}
                                {tab === 'classes' && <SchoolIcon size={22} />}
                                {tab === 'tasks' && <CheckCircle size={22} />}
                                {tab === 'school' && <School size={22} />}
                                {tab === 'achievements' && <Trophy size={22} />}
                                <span className="text-[10px] mt-1 font-medium">{tab === 'school' ? 'Maktabim' : t.tabs[tab]}</span>
                            </button>
                        ))}
                    </div>

                    <div className="hidden md:flex gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
                        {['dashboard', 'classes', 'tasks', 'library', 'school', 'achievements'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2.5 rounded-xl font-medium transition-all min-h-[44px] flex items-center justify-center ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                {tab === 'school' ? 'Maktabim' : t.tabs[tab]}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'classes' && renderClasses()}
                    {activeTab === 'library' && renderLibrary()}
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
                                {displayTasks.filter(t => taskFilter === 'all' || t.status === taskFilter).map(task => (
                                    <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 bg-gray-50 border border-gray-100 rounded-xl gap-3">
                                        <div>
                                            <h4 className={`font-bold ${task.status === 'completed' ? 'text-gray-500' : 'text-gray-800'}`}>{task.title}</h4>
                                            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                                <Calendar size={14} /> {task.deadline}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 self-end md:self-auto">
                                            {task.status === 'completed' && task.score !== undefined && task.score !== null && (
                                                <span className="font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full text-xs md:text-sm">{task.score} / {task.xp} ball</span>
                                            )}
                                            {task.status === 'pending' ? (
                                                <button onClick={() => setSelectedTask(task)} className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors">Bajarish</button>
                                            ) : (
                                                <button onClick={() => setSelectedTask(task)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-300 transition-colors">Ko'rish</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {displayTasks.filter(t => taskFilter === 'all' || t.status === taskFilter).length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        Bu bo'limda vazifalar yo'q.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'school' && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><School size={24} className="text-indigo-500" /> Maktabim</h2>
                            {mySchool === undefined ? (
                                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto" /></div>
                            ) : mySchool === null ? (
                                <div className="text-center py-8">
                                    <School size={48} className="mx-auto mb-3 text-gray-300" />
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