import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';
import { 
    BookOpen, Trophy, Clock, Star, Play, CheckCircle, Search, Filter, 
    TrendingUp, Award, Target, Calendar, MessageSquare, Users, Bell,
    Settings, Camera, Edit, Upload, Download, Send, Heart, Share2,
    Video, Phone, Mail, MapPin, GraduationCap, FileText, BarChart3,
    ChevronRight, Plus, X, Eye, Lock, Globe, Palette, Moon, Sun,
    Image, Flag, Gift, Zap, Shield, HelpCircle, MessageCircle,
    Home, Book, ClipboardList, Medal, School, Activity, TrendingDown
} from 'lucide-react';

const STORY_API_BASE = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/v1', '/story')
    : "http://localhost:8000/api/story";

const StudentDashboard = () => {
    const { language } = useLanguage();
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeSubTab, setActiveSubTab] = useState('overview');
    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [readingAnalyses, setReadingAnalyses] = useState(null);
    const [loadingAnalyses, setLoadingAnalyses] = useState(false);
    const [studentProfile, setStudentProfile] = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setStudentProfile(data.data);
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            }
        };
        fetchProfile();
    }, []);

    const content = {
        uz: {
            title: 'Mening Kabinetim',
            welcome: 'Salom',
            tabs: {
                dashboard: 'Bosh sahifa',
                profile: 'Shaxsiy kabinet',
                academic: 'Akademik',
                tasks: 'Vazifalar',
                grades: 'Baholar',
                messages: 'Xabarlar',
                library: 'Kutubxona',
                achievements: 'Yutuqlar',
                events: 'Tadbirlar',
                help: 'Yordam'
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
                profile: 'Профиль',
                academic: 'Академия',
                tasks: 'Задания',
                grades: 'Оценки',
                messages: 'Сообщения',
                library: 'Библиотека',
                achievements: 'Достижения',
                events: 'События',
                help: 'Помощь'
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
        }
    };

    const t = content[language] || content.uz;

    const user = {
        name: authUser?.first_name || 'Ali',
        lastName: authUser?.last_name || 'Valiyev',
        monster: '👾',
        points: studentProfile?.student_profile?.total_points || 0,
        streak: studentProfile?.student_profile?.current_streak || 0,
        level: studentProfile?.student_profile?.level || 1,
        parent: studentProfile?.parent_id ? 'Oila' : null,
        class: '7-A',
        avgGrade: 4.5,
        rank: 3
    };

    const subjects = [
        { id: 1, name: 'Matematika', teacher: 'Nodira Karimova', avgGrade: 4.8, color: '#8B5CF6' },
        { id: 2, name: 'Ingliz tili', teacher: 'Sardor Alimov', avgGrade: 4.5, color: '#EC4899' }
    ];

    const tasks = [
        { id: 1, title: 'Matematika: Ko\'paytirish jadvali', deadline: 'Bugun, 18:00', xp: 50, status: 'pending' },
        { id: 2, title: 'English: New Words', deadline: 'Ertaga', xp: 30, status: 'pending' },
        { id: 3, title: 'Ona tili: Mashq 54', deadline: 'Bajarildi', xp: 40, status: 'completed' }
    ];

    const books = [
        { id: 1, title: 'Matematika 7-sinf', category: 'science', cover: '📐' },
        { id: 2, title: 'English Grammar', category: 'lang', cover: '🇬🇧' },
        { id: 3, title: 'Python for Kids', category: 'it', cover: '🐍' }
    ];

    useEffect(() => {
        let interval;
        if (isTimerRunning) {
            interval = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    useEffect(() => {
        const loadReadingAnalyses = async () => {
            if (!authUser?.id) return;
            setLoadingAnalyses(true);
            try {
                const userId = authUser.id || localStorage.getItem('user_id');
                const url = `${STORY_API_BASE}/user-analyses/${userId}?days=30`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    setReadingAnalyses(data);
                }
            } catch (error) {
                console.error('Tahlillar yuklashda xatolik:', error);
            } finally {
                setLoadingAnalyses(false);
            }
        };
        loadReadingAnalyses();
    }, [authUser]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const renderDashboard = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-3xl font-bold">{t.welcome}, {user.name}!</h2>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">Lvl {user.level}</span>
                        </div>
                        <p className="opacity-90 mb-6">
                            {user.parent ? "Ota-onangiz sizni kuzatib bormoqda 🛡️" : "Bugungi rejangizda 2 ta yangi vazifa bor."}
                        </p>
                        <button onClick={() => setActiveTab('tasks')} className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                            Boshlash
                        </button>
                    </div>
                    <div className="text-[80px] relative z-10 animate-bounce">{user.monster}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">🪙</div>
                        <div>
                            <p className="text-gray-500 text-sm">{t.stats.points}</p>
                            <h3 className="text-2xl font-bold text-gray-800">{user.points}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl">🔥</div>
                        <div>
                            <p className="text-gray-500 text-sm">{t.stats.streak}</p>
                            <h3 className="text-2xl font-bold text-gray-800">{user.streak} kun</h3>
                        </div>
                    </div>
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
                                <div className="text-2xl font-bold text-red-600">{readingAnalyses.total_speech_errors || 0}</div>
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
                        {tasks.filter(t => t.status === 'pending').map(task => (
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

    const renderLibrary = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {books.map(book => (
                    <div key={book.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group">
                        <div className="aspect-[3/4] bg-gray-50 rounded-xl flex items-center justify-center text-6xl mb-3">{book.cover}</div>
                        <h3 className="font-bold text-gray-800 text-sm line-clamp-2">{book.title}</h3>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <>
            <Navbar />
            <div className="bg-[#f0f2f5] min-h-screen pt-4 pb-20 md:pb-4">
                <div className="container mx-auto px-4">
                    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 z-50 flex justify-around">
                        {['dashboard', 'tasks', 'library', 'achievements'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === tab ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                                {tab === 'dashboard' && <Star size={24} />}
                                {tab === 'tasks' && <CheckCircle size={24} />}
                                {tab === 'library' && <BookOpen size={24} />}
                                {tab === 'achievements' && <Trophy size={24} />}
                                <span className="text-[10px] mt-1 font-medium">{t.tabs[tab]}</span>
                            </button>
                        ))}
                    </div>

                    <div className="hidden md:flex gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 inline-flex">
                        {['dashboard', 'tasks', 'library', 'achievements'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-xl font-medium transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}>
                                {t.tabs[tab]}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'library' && renderLibrary()}
                    {activeTab === 'tasks' && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold mb-6">Vazifalarim</h2>
                            {tasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-4 border-b border-gray-100">
                                    <div>
                                        <h4 className={`font-bold ${task.status === 'completed' ? 'text-gray-400' : 'text-gray-800'}`}>{task.title}</h4>
                                        <p className="text-sm text-gray-500">{task.deadline}</p>
                                    </div>
                                    {task.status === 'pending' && (
                                        <button className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium">Bajarish</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'achievements' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white p-6 rounded-2xl text-center shadow-sm">
                                    <div className="text-4xl mb-3">🏆</div>
                                    <h3 className="font-bold text-gray-800">Yutuq {i}</h3>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default StudentDashboard;