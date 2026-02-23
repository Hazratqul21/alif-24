import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import parentService from '../services/parentService';
import organizationService from '../services/organizationService';
import Navbar from '../components/Common/Navbar';
import { Users, CreditCard, Bell, Settings, PieChart, Calendar, TrendingUp, Plus, X, Eye, EyeOff, Key, UserCheck, ArrowDown, ArrowUp, School, BookOpen, ClipboardList, Zap, Phone, Globe, CheckCircle } from 'lucide-react';
import apiService from '../services/apiService';

const ParentDashboard = () => {
    const { language } = useLanguage();
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedChildStats, setSelectedChildStats] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [searching, setSearching] = useState(false);
    const [inviteSent, setInviteSent] = useState(false);
    const [pendingInvites, setPendingInvites] = useState([]);

    // Teacher info state
    const [childTeachers, setChildTeachers] = useState({});

    // Assignment/Task state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedChild, setSelectedChild] = useState(null);
    const [childAssignments, setChildAssignments] = useState({});
    const [assignmentFile, setAssignmentFile] = useState(null);
    const [assignmentForm, setAssignmentForm] = useState({
        title: '',
        description: '',
        due_date: '',
        max_score: 100
    });

    // Grading state
    const [gradingItem, setGradingItem] = useState(null);
    const [gradeScore, setGradeScore] = useState('');
    const [gradeFeedback, setGradeFeedback] = useState('');
    const [gradingLoading, setGradingLoading] = useState(false);

    // Notifications state
    const [notifications, setNotifications] = useState([]);

    // School state
    const [mySchool, setMySchool] = useState(undefined);

    // Settings state
    const [parentSettings, setParentSettings] = useState(() => {
        const saved = localStorage.getItem('parent_settings');
        return saved ? JSON.parse(saved) : {
            emailNotif: true, pushNotif: true, smsNotif: false,
            gradeAlerts: true, attendanceAlerts: true, taskAlerts: true,
            weeklyReport: true, screenTimeLimit: false
        };
    });
    // Subscription state
    const [subscription, setSubscription] = useState(null);

    // Promo code state
    const [promoCode, setPromoCode] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoResult, setPromoResult] = useState(null);

    useEffect(() => {
        fetchChildren();
        fetchPendingInvites();
        // Fetch subscription from /auth/me
        apiService.get('/auth/me').then(res => {
            setSubscription(res?.subscription || res?.data?.subscription || null);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (children.length > 0) {
            fetchAllChildrenAssignments();
        }
    }, [children]);

    useEffect(() => {
        if (activeTab === 'school' && mySchool === undefined) {
            organizationService.getMySchool().then(res => {
                setMySchool(res.school || res.data?.school || null);
            }).catch(() => setMySchool(null));
        }
    }, [activeTab, mySchool]);

    const fetchChildren = async () => {
        try {
            setLoading(true);
            const data = await parentService.getChildren();
            setChildren(data);
        } catch (error) {
            console.error("Error fetching children:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllChildrenAssignments = async () => {
        const assignmentsMap = {};
        const teachersMap = {};
        for (const child of children) {
            try {
                const res = await parentService.getChildAssignments(child.id);
                assignmentsMap[child.id] = res.data?.assignments || [];
            } catch (e) {
                assignmentsMap[child.id] = [];
            }
            try {
                const tRes = await parentService.getChildTeachers(child.id);
                teachersMap[child.id] = tRes.data || [];
            } catch (e) {
                teachersMap[child.id] = [];
            }
        }
        setChildAssignments(assignmentsMap);
        setChildTeachers(teachersMap);
    };

    const handleParentGrade = async () => {
        if (!gradingItem || gradeScore === '') return;
        const score = parseFloat(gradeScore);
        const maxScore = gradingItem.assignment?.max_score || 100;
        if (isNaN(score) || score < 0 || score > maxScore) {
            alert(`Ball 0 dan ${maxScore} gacha bo'lishi kerak`);
            return;
        }
        try {
            setGradingLoading(true);
            await parentService.gradeSubmission(gradingItem.assignment_id, gradingItem.id, {
                score,
                feedback: gradeFeedback || null,
            });
            setGradingItem(null);
            setGradeScore('');
            setGradeFeedback('');
            fetchAllChildrenAssignments();
            alert('Baho muvaffaqiyatli qo\'yildi!');
        } catch (e) {
            alert(e.message || 'Baholashda xatolik');
        } finally {
            setGradingLoading(false);
        }
    };

    const handleAssignTask = async (e) => {
        e.preventDefault();
        if (!selectedChild) return;
        try {
            const payload = { ...assignmentForm, target_student_ids: [selectedChild.id], assignment_type: 'homework' };
            if (!payload.due_date) delete payload.due_date;

            // Optional upload
            if (assignmentFile) {
                try {
                    const upRes = await parentService.uploadAssignmentFile(assignmentFile);
                    if (upRes.url) {
                        payload.attachments = [{
                            name: assignmentFile.name,
                            url: upRes.url,
                            size: upRes.size || assignmentFile.size
                        }];
                    }
                } catch (upErr) {
                    alert(upErr.message || 'Fayl yuklashda xatolik yuz berdi');
                    return;
                }
            }

            await parentService.assignTask(payload);
            setShowAssignModal(false);
            setAssignmentForm({ title: '', description: '', due_date: '', max_score: 100 });
            setAssignmentFile(null);
            fetchAllChildrenAssignments();
            alert('Vazifa muvaffaqiyatli berildi!');
        } catch (e) {
            alert(e.message || 'Vazifa berishda xatolik');
        }
    };

    const fetchPendingInvites = async () => {
        try {
            const data = await parentService.getPendingInvites();
            setPendingInvites(data || []);
        } catch (e) { console.error(e); }
    };

    const handleSearchChild = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        try {
            setSearching(true);
            setSearchError('');
            setSearchResult(null);
            const result = await parentService.searchChild(searchQuery.trim());
            setSearchResult(result);
        } catch (error) {
            setSearchError(error.message || "O'quvchi topilmadi");
        } finally {
            setSearching(false);
        }
    };

    const handleInviteChild = async () => {
        if (!searchResult?.id) return;
        try {
            await parentService.inviteChild(searchResult.id);
            setInviteSent(true);
            fetchPendingInvites();
        } catch (error) {
            setSearchError(error.message || "Taklif yuborishda xatolik");
        }
    };

    const content = {
        uz: {
            title: 'Ota-ona Kabineti',
            welcome: 'Xush kelibsiz',
            tabs: {
                dashboard: 'Farzandlarim',
                payments: 'To\'lovlar',
                notifications: 'Xabarnomalar',
                school: 'Maktab',
                settings: 'Sozlamalar'
            },
            children: {
                add: 'Farzand qo\'shish',
                viewReport: 'To\'liq hisobot',
                noChildren: 'Hozircha farzandlar qo\'shilmagan'
            },
            addModal: {
                title: 'Yangi farzand akkaunti',
                firstName: 'Ismi',
                lastName: 'Familiyasi',
                relationship: 'Siz kimsiz?',
                submit: 'Yaratish',
                success: 'Akkaunt yaratildi!',
                credentialsNote: 'Ushbu ma\'lumotlarni saqlab qo\'ying. Bola tizimga kirishi uchun kerak bo\'ladi:',
                close: 'Yopish'
            },
            payments: {
                balance: 'Joriy balans',
                history: 'To\'lovlar tarixi',
                pay: 'Hisobni to\'ldirish'
            }
        },
        ru: {
            title: 'Кабинет Родителя',
            welcome: 'Добро пожаловать',
            tabs: {
                dashboard: 'Мои Дети',
                payments: 'Платежи',
                notifications: 'Уведомления',
                school: 'Школа',
                settings: 'Настройки'
            },
            children: {
                add: 'Добавить ребенка',
                viewReport: 'Полный отчет',
                noChildren: 'Дети пока не добавлены'
            },
            addModal: {
                title: 'Новый аккаунт ребенка',
                firstName: 'Имя',
                lastName: 'Фамилия',
                relationship: 'Кто вы?',
                submit: 'Создать',
                success: 'Аккаунт создан!',
                credentialsNote: 'Сохраните эти данные. Они понадобятся ребенку для входа:',
                close: 'Закрыть'
            },
            payments: {
                balance: 'Текущий баланс',
                history: 'История платежей',
                pay: 'Пополнить счет'
            }
        },
        en: {
            title: 'Parent Dashboard',
            welcome: 'Welcome',
            tabs: {
                dashboard: 'My Children',
                payments: 'Payments',
                notifications: 'Notifications',
                school: 'School',
                settings: 'Settings'
            },
            children: {
                add: 'Add Child',
                viewReport: 'Full Report',
                noChildren: 'No children added yet'
            },
            addModal: {
                title: 'New Child Account',
                firstName: 'First Name',
                lastName: 'Last Name',
                relationship: 'Who are you?',
                submit: 'Create',
                success: 'Account created!',
                credentialsNote: 'Save these credentials. Your child will need them to log in:',
                close: 'Close'
            },
            payments: {
                balance: 'Current Balance',
                history: 'Payment History',
                pay: 'Top Up'
            }
        }
    };

    const t = content[language] || content.uz;

    // Transactions mock data for UI
    const transactions = [];

    const renderDashboard = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {children.map(child => {
                return (
                    <div key={child.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-2xl border-2 border-blue-100 font-bold text-blue-600">
                                    {child.first_name?.[0] || '?'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{child.first_name} {child.last_name}</h3>
                                    {child.username && <p className="text-gray-500 font-mono text-sm">@{child.username}</p>}
                                </div>
                            </div>
                            <div className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg text-sm">
                                {child.status === 'active' ? 'Faol' : 'Nofaol'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">
                                    <Calendar size={14} /> Qo'shilgan
                                </div>
                                <span className="text-sm font-bold text-gray-800">{child.created_at ? new Date(child.created_at).toLocaleDateString('uz') : '-'}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">
                                    <TrendingUp size={14} /> Role
                                </div>
                                <span className="text-sm font-bold text-gray-800 capitalize">{child.role || 'student'}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await parentService.getChildDetails(child.id);
                                        setSelectedChildStats(res);
                                        setShowReportModal(true);
                                    } catch (err) {
                                        alert(err.message || 'Xatolik');
                                    }
                                }}
                                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition"
                            >
                                {t.children.viewReport}
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedChild(child);
                                    setShowAssignModal(true);
                                }}
                                className="px-4 py-2.5 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition"
                                title="Vazifa berish"
                            >
                                <ClipboardList size={18} />
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirm(`${child.first_name} uchun yangi PIN yaratilsinmi?`)) return;
                                    try {
                                        const res = await parentService.regenerateChildPin(child.id);
                                        alert(`Yangi PIN: ${res.new_pin}\nUsername: ${res.username}`);
                                    } catch (err) { alert(err.message || 'Xatolik'); }
                                }}
                                className="px-4 py-2.5 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition"
                                title="PIN yangilash"
                            >
                                <Key size={18} />
                            </button>
                        </div>

                        {/* Teachers for this child */}
                        {childTeachers[child.id]?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <School size={16} /> O'qituvchilar ({childTeachers[child.id].length})
                                </h4>
                                <div className="space-y-2">
                                    {childTeachers[child.id].map((info, idx) => (
                                        <div key={idx} className="bg-indigo-50 p-3 rounded-xl">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="font-bold text-gray-800 text-sm">{info.teacher.first_name} {info.teacher.last_name}</span>
                                                    {info.teacher.specialty && <span className="text-xs text-indigo-600 ml-2">({info.teacher.specialty})</span>}
                                                </div>
                                                <span className="text-xs bg-white text-indigo-600 px-2 py-0.5 rounded-full font-medium">{info.classroom.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                {info.classroom.subject && <span>{info.classroom.subject}</span>}
                                                {info.teacher.experience_years && <span>{info.teacher.experience_years} yil tajriba</span>}
                                                {info.teacher.phone && <span>{info.teacher.phone}</span>}
                                            </div>
                                            {info.teacher.bio && <p className="text-xs text-gray-500 mt-1 italic">{info.teacher.bio}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Assignments for this child */}
                        {childAssignments[child.id]?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <BookOpen size={16} /> Vazifalar ({childAssignments[child.id].length})
                                </h4>
                                <div className="space-y-2">
                                    {childAssignments[child.id].slice(0, 5).map(a => {
                                        const st = a.status || 'pending';
                                        const assign = a.assignment || a;
                                        const maxScore = assign.max_score || 100;
                                        const isParentCreated = assign.creator_role === 'parent';
                                        return (
                                            <div key={a.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg text-sm">
                                                <div className="flex-1 min-w-0 mr-2">
                                                    <span className="font-medium text-gray-800 truncate block">{assign.title || a.title}</span>
                                                    {a.teacher_name && <span className="text-xs text-gray-400">{a.teacher_name}</span>}
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {st === 'graded' ? (
                                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${(a.score / maxScore) >= 0.8 ? 'bg-green-100 text-green-700' :
                                                            (a.score / maxScore) >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {a.score}/{maxScore}
                                                        </span>
                                                    ) : (st === 'submitted' || st === 'late') && isParentCreated ? (
                                                        <button onClick={(e) => { e.stopPropagation(); setGradingItem({ ...a, assignment: assign }); setGradeScore(''); setGradeFeedback(''); }}
                                                            className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium hover:bg-green-200 transition border-none cursor-pointer">
                                                            Baholash
                                                        </button>
                                                    ) : (
                                                        <span className={`text-xs px-2 py-1 rounded-full ${st === 'submitted' ? 'bg-green-100 text-green-700' :
                                                            st === 'late' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {st === 'submitted' ? 'Bajarildi' :
                                                                st === 'late' ? 'Kech' : 'Kutilmoqda'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            <button
                onClick={() => setShowAddModal(true)}
                className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-8 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors bg-gray-50/50 hover:bg-blue-50/10 min-h-[250px]"
            >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-blue-500">
                    <Plus size={32} />
                </div>
                <span className="font-medium">{t.children.add}</span>
            </button>
        </div>
    );

    const renderPayments = () => (
        <div className="max-w-4xl">
            <div className={`rounded-2xl p-5 md:p-8 text-white mb-6 md:mb-8 shadow-lg ${subscription ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-200' : 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-200'}`}>
                <p className="opacity-80 mb-2 font-medium text-sm md:text-base">Joriy obuna</p>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                    <h2 className="text-2xl md:text-4xl font-bold">{subscription ? subscription.plan_name : 'Bepul'}</h2>
                    <span className={`px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm ${subscription?.status === 'active' ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                        {subscription?.status === 'active' ? '✅ Faol' : 'Obuna yo\'q'}
                    </span>
                </div>
                {subscription?.expires_at && (
                    <p className="mt-3 text-sm opacity-80">
                        Muddat: {new Date(subscription.expires_at).toLocaleDateString('uz', { year: 'numeric', month: 'long', day: 'numeric' })} gacha
                    </p>
                )}
            </div>

            {subscription?.features && Object.keys(subscription.features).length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                    <h3 className="font-bold text-lg text-gray-700 mb-4">Plan imkoniyatlari</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(subscription.features).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-3 text-sm">
                                <CheckCircle size={16} className={value ? 'text-emerald-500' : 'text-gray-300'} />
                                <span className={value ? 'text-gray-700' : 'text-gray-400 line-through'}>{key}</span>
                            </div>
                        ))}
                    </div>
                    {subscription.max_children && (
                        <p className="mt-4 text-sm text-gray-500 border-t border-gray-100 pt-3">
                            Maksimal bolalar soni: <span className="font-bold text-gray-700">{subscription.max_children}</span>
                        </p>
                    )}
                </div>
            )}

            {/* Promocode */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <h3 className="font-bold text-lg text-gray-700 mb-3">Promocode</h3>
                <div className="flex gap-2">
                    <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Kodni kiriting..."
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 font-mono tracking-wider uppercase" />
                    <button disabled={!promoCode || promoLoading} onClick={async () => {
                        setPromoLoading(true);
                        setPromoResult(null);
                        try {
                            const res = await apiService.post('/auth/promo-code', { code: promoCode });
                            const data = res?.data || res;
                            setPromoResult({ type: 'success', message: data.message || 'Muvaffaqiyatli!', result: data.result });
                            setPromoCode('');
                            // Refresh subscription
                            apiService.get('/auth/me').then(r => setSubscription(r?.subscription || r?.data?.subscription || null)).catch(() => { });
                        } catch (e) {
                            setPromoResult({ type: 'error', message: e.response?.data?.detail || 'Xatolik yuz berdi' });
                        }
                        setPromoLoading(false);
                    }}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition disabled:opacity-50">
                        {promoLoading ? '...' : 'Faollashtirish'}
                    </button>
                </div>
                {promoResult && (
                    <div className={`mt-3 p-3 rounded-xl text-sm ${promoResult.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        <p className="font-medium">{promoResult.message}</p>
                        {promoResult.result && <p className="text-xs mt-1 opacity-80">{promoResult.result}</p>}
                    </div>
                )}
            </div>

            {!subscription && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                    <CreditCard size={48} className="mx-auto mb-3 text-gray-300" />
                    <h3 className="font-bold text-lg text-gray-700 mb-2">Hozircha bepul foydalanmoqdasiz</h3>
                    <p className="text-gray-500 text-sm">Obuna olish uchun administratsiyaga murojaat qiling yoki promocode kiriting</p>
                </div>
            )}
        </div>
    );

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gray-50/50 flex flex-col md:flex-row pt-[70px]">
                {/* Desktop sidebar */}
                <aside className="hidden md:block w-64 bg-white border-r border-gray-200 p-6 flex-shrink-0">
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-lg">
                            {authUser?.first_name?.[0]}{authUser?.last_name?.[0]}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 leading-tight">{authUser?.first_name} {authUser?.last_name}</h3>
                            <p className="text-xs text-gray-500">Ota-ona kabineti</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-purple-50 text-purple-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <Users size={20} /> {t.tabs.dashboard}
                        </button>
                        <button onClick={() => setActiveTab('payments')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'payments' ? 'bg-purple-50 text-purple-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <CreditCard size={20} /> {t.tabs.payments}
                        </button>
                        <button onClick={() => setActiveTab('notifications')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'notifications' ? 'bg-purple-50 text-purple-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <Bell size={20} /> {t.tabs.notifications}
                        </button>
                        <button onClick={() => setActiveTab('school')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'school' ? 'bg-purple-50 text-purple-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <School size={20} /> {t.tabs.school}
                        </button>
                        <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-purple-50 text-purple-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <Settings size={20} /> {t.tabs.settings}
                        </button>
                    </nav>
                </aside>

                {/* Mobile horizontal tab bar */}
                <div className="md:hidden bg-white border-b border-gray-200 flex overflow-x-auto no-scrollbar">
                    {[
                        { key: 'dashboard', icon: <Users size={18} />, label: t.tabs.dashboard },
                        { key: 'payments', icon: <CreditCard size={18} />, label: t.tabs.payments },
                        { key: 'notifications', icon: <Bell size={18} />, label: t.tabs.notifications },
                        { key: 'school', icon: <School size={18} />, label: t.tabs.school },
                        { key: 'settings', icon: <Settings size={18} />, label: t.tabs.settings }
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap text-sm font-medium border-b-2 transition-all flex-1 justify-center ${activeTab === tab.key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500'}`}>
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <main className="flex-1 p-4 md:p-10 overflow-x-hidden">
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'payments' && renderPayments()}

                    {activeTab === 'school' && (
                        <div className="max-w-3xl">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><School size={24} className="text-purple-500" /> Farzand maktabi</h2>
                            {mySchool === undefined ? (
                                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" /></div>
                            ) : mySchool === null ? (
                                <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                                    <School size={48} className="mx-auto mb-3 text-gray-300" />
                                    <p className="text-gray-500">Farzandingiz hozircha biror maktabga biriktirilmagan</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl">{mySchool.name?.charAt(0)}</div>
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
                                        {mySchool.website && <a href={mySchool.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 flex items-center gap-1"><Globe size={14} /> {mySchool.website}</a>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="max-w-3xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800">{t.tabs.notifications}</h2>
                                <button onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                                    className="text-sm text-blue-600 font-medium hover:underline">
                                    Barchasini o'qilgan deb belgilash
                                </button>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                {notifications.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <Bell size={48} className="mx-auto mb-3 opacity-30" />
                                        <p>Xabarnomalar yo'q</p>
                                    </div>
                                ) : notifications.map(notif => (
                                    <div key={notif.id}
                                        onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                                        className={`p-4 border-b border-gray-100 last:border-0 flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50/50' : ''}`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.type === 'grade' ? 'bg-green-100 text-green-600' :
                                            notif.type === 'task' ? 'bg-blue-100 text-blue-600' :
                                                notif.type === 'report' ? 'bg-purple-100 text-purple-600' :
                                                    'bg-orange-100 text-orange-600'
                                            }`}>
                                            {notif.type === 'grade' ? <TrendingUp size={18} /> :
                                                notif.type === 'task' ? <Calendar size={18} /> :
                                                    notif.type === 'report' ? <PieChart size={18} /> :
                                                        <Bell size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`font-medium text-gray-800 ${!notif.read ? 'font-bold' : ''}`}>{notif.title}</h4>
                                                {!notif.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>}
                                            </div>
                                            <p className="text-sm text-gray-500">{notif.desc}</p>
                                            <span className="text-xs text-gray-400">{notif.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-2xl space-y-6">
                            <h2 className="text-xl font-bold text-gray-800">{t.tabs.settings}</h2>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="font-bold text-gray-800 mb-4">Bildirishnoma sozlamalari</h3>
                                <div className="space-y-4">
                                    {[
                                        { key: 'emailNotif', label: 'Email bildirishnomalar' },
                                        { key: 'pushNotif', label: 'Push bildirishnomalar' },
                                        { key: 'smsNotif', label: 'SMS bildirishnomalar' }
                                    ].map(item => (
                                        <div key={item.key} className="flex justify-between items-center py-2">
                                            <span className="text-gray-700">{item.label}</span>
                                            <div onClick={() => {
                                                setParentSettings(prev => {
                                                    const updated = { ...prev, [item.key]: !prev[item.key] };
                                                    localStorage.setItem('parent_settings', JSON.stringify(updated));
                                                    return updated;
                                                });
                                            }}
                                                className="cursor-pointer relative"
                                                style={{ width: '44px', height: '24px', borderRadius: '12px', background: parentSettings[item.key] ? '#10b981' : '#d1d5db', transition: 'background 0.2s' }}>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: parentSettings[item.key] ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="font-bold text-gray-800 mb-4">Ogohlantirish turlari</h3>
                                <div className="space-y-4">
                                    {[
                                        { key: 'gradeAlerts', label: 'Baho o\'zgarishlari' },
                                        { key: 'attendanceAlerts', label: 'Davomat xabarlari' },
                                        { key: 'taskAlerts', label: 'Vazifa muddatlari' },
                                        { key: 'weeklyReport', label: 'Haftalik hisobot' }
                                    ].map(item => (
                                        <div key={item.key} className="flex justify-between items-center py-2">
                                            <span className="text-gray-700">{item.label}</span>
                                            <div onClick={() => {
                                                setParentSettings(prev => {
                                                    const updated = { ...prev, [item.key]: !prev[item.key] };
                                                    localStorage.setItem('parent_settings', JSON.stringify(updated));
                                                    return updated;
                                                });
                                            }}
                                                className="cursor-pointer relative"
                                                style={{ width: '44px', height: '24px', borderRadius: '12px', background: parentSettings[item.key] ? '#10b981' : '#d1d5db', transition: 'background 0.2s' }}>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: parentSettings[item.key] ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="font-bold text-gray-800 mb-4">Ekran vaqti nazorati</h3>
                                <div className="flex justify-between items-center py-2">
                                    <div>
                                        <span className="text-gray-700">Ekran vaqtini cheklash</span>
                                        <p className="text-xs text-gray-400 mt-1">Farzandlar uchun kunlik 2 soat limit</p>
                                    </div>
                                    <div onClick={() => {
                                        setParentSettings(prev => {
                                            const updated = { ...prev, screenTimeLimit: !prev.screenTimeLimit };
                                            localStorage.setItem('parent_settings', JSON.stringify(updated));
                                            return updated;
                                        });
                                    }}
                                        className="cursor-pointer relative"
                                        style={{ width: '44px', height: '24px', borderRadius: '12px', background: parentSettings.screenTimeLimit ? '#10b981' : '#d1d5db', transition: 'background 0.2s' }}>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: parentSettings.screenTimeLimit ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Add Child Modal — Search + Invite */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Farzand qo'shish</h3>
                            <button onClick={() => { setShowAddModal(false); setSearchQuery(''); setSearchResult(null); setSearchError(''); setInviteSent(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            {inviteSent ? (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <UserCheck size={32} />
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900 mb-2">Taklif yuborildi!</h4>
                                    <p className="text-gray-500 text-sm mb-6">
                                        Farzandingiz saytga kirganda taklifni ko'radi va qabul qilishi mumkin. Qabul qilgandan so'ng u sizning kabinetingizda ko'rinadi.
                                    </p>
                                    <button
                                        onClick={() => { setShowAddModal(false); setSearchQuery(''); setSearchResult(null); setSearchError(''); setInviteSent(false); }}
                                        className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition"
                                    >
                                        Yopish
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
                                        <p className="text-sm text-blue-700">
                                            Farzandingiz allaqachon ro'yxatdan o'tgan bo'lishi kerak. Uni <b>ID raqami</b>, <b>email</b>, <b>telefon raqami</b> yoki <b>username</b> orqali qidiring.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSearchChild} className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="ID, email, telefon yoki username..."
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                        <button type="submit" disabled={searching || !searchQuery.trim()}
                                            className="px-5 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition text-sm whitespace-nowrap">
                                            {searching ? '...' : 'Qidirish'}
                                        </button>
                                    </form>

                                    {searchError && (
                                        <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 mb-4 text-sm">{searchError}</div>
                                    )}

                                    {searchResult && (
                                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-4">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
                                                    {searchResult.first_name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-gray-800">{searchResult.first_name} {searchResult.last_name}</h4>
                                                    {searchResult.username && <p className="text-gray-500 text-sm font-mono">@{searchResult.username}</p>}
                                                    <p className="text-gray-400 text-xs">ID: {searchResult.id}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleInviteChild}
                                                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95"
                                            >
                                                Taklif yuborish
                                            </button>
                                        </div>
                                    )}

                                    {pendingInvites.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <h4 className="text-sm font-semibold text-gray-600 mb-2">Kutilayotgan takliflar:</h4>
                                            <div className="space-y-2">
                                                {pendingInvites.map(inv => (
                                                    <div key={inv.invite_id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl p-3">
                                                        <div>
                                                            <span className="font-medium text-gray-800 text-sm">{inv.first_name} {inv.last_name}</span>
                                                            <span className="text-xs text-amber-600 ml-2">kutilmoqda...</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Assign Task Modal */}
            {showAssignModal && selectedChild && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Vazifa berish - {selectedChild.first_name}</h3>
                            <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleAssignTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Sarlavha</label>
                                <input
                                    type="text" required
                                    value={assignmentForm.title}
                                    onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                                    placeholder="Masalan: Matematika mashqlari"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tavsif</label>
                                <textarea
                                    value={assignmentForm.description}
                                    onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                                    placeholder="Vazifa tavsifi..."
                                    rows={3}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                                />
                            </div>

                            {/* File Upload Section for Parents */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Material / Fayl biriktirish (Max: 10M)</label>
                                <input
                                    type="file"
                                    onChange={(e) => {
                                        const f = e.target.files[0];
                                        if (f) {
                                            if (f.size > 10 * 1024 * 1024) {
                                                alert('Fayl hajmi 10MB dan oshmasligi kerak!');
                                                e.target.value = '';
                                                setAssignmentFile(null);
                                            } else {
                                                setAssignmentFile(f);
                                            }
                                        }
                                    }}
                                    className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-green-50 file:text-green-700
                                    hover:file:bg-green-100"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Muddat</label>
                                    <input
                                        type="date"
                                        value={assignmentForm.due_date}
                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Max ball</label>
                                    <input
                                        type="number"
                                        min={1} max={100}
                                        value={assignmentForm.max_score}
                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, max_score: parseInt(e.target.value) || 100 })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition">
                                Vazifa berish
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Grading Modal */}
            {gradingItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setGradingItem(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Baholash</h3>
                            <button onClick={() => setGradingItem(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                            <div className="font-medium text-gray-800">{gradingItem.assignment?.title || 'Vazifa'}</div>
                            {gradingItem.content && <p className="text-gray-500 text-sm mt-1">{gradingItem.content}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Ball (0 — {gradingItem.assignment?.max_score || 100})</label>
                            <div className="flex items-center gap-3">
                                <input type="number" min="0" max={gradingItem.assignment?.max_score || 100} step="1"
                                    value={gradeScore} onChange={e => setGradeScore(e.target.value)} placeholder="0"
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-center focus:ring-2 focus:ring-green-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                <span className="text-gray-400 text-lg font-bold">/ {gradingItem.assignment?.max_score || 100}</span>
                            </div>
                            <div className="flex gap-2 mt-3">
                                {[100, 90, 80, 70, 60, 50].map(v => {
                                    const maxS = gradingItem.assignment?.max_score || 100;
                                    const actualVal = Math.round(maxS * v / 100);
                                    return (
                                        <button key={v} onClick={() => setGradeScore(String(actualVal))}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${parseInt(gradeScore) === actualVal
                                                ? 'bg-green-600 text-white border-green-600'
                                                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                                }`}>{v}%</button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Izoh (ixtiyoriy)</label>
                            <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)}
                                placeholder="Bolaga izoh yozing..." rows={2}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none resize-none text-sm" />
                        </div>
                        <button onClick={handleParentGrade} disabled={gradingLoading || gradeScore === ''}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition ${gradingLoading || gradeScore === '' ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                                }`}>
                            {gradingLoading ? 'Saqlanmoqda...' : 'Bahoni saqlash'}
                        </button>
                    </div>
                </div>
            )}

            {showReportModal && selectedChildStats && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">{selectedChildStats.first_name} {selectedChildStats.last_name} hisoboti</h3>
                            <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-amber-100 p-4 rounded-xl border border-amber-200">
                                    <h4 className="text-amber-800 text-sm font-semibold mb-1">XP / Ballar</h4>
                                    <p className="text-2xl font-bold text-amber-600">{selectedChildStats.stats?.total_points || 0}</p>
                                </div>
                                <div className="bg-yellow-100 p-4 rounded-xl border border-yellow-200">
                                    <h4 className="text-yellow-800 text-sm font-semibold mb-1">Tangalar</h4>
                                    <p className="text-2xl font-bold text-yellow-600">{selectedChildStats.stats?.total_coins || 0}</p>
                                </div>
                                <div className="bg-blue-100 p-4 rounded-xl border border-blue-200">
                                    <h4 className="text-blue-800 text-sm font-semibold mb-1">Daraja (Level)</h4>
                                    <p className="text-2xl font-bold text-blue-600">{selectedChildStats.stats?.level || 1}</p>
                                </div>
                                <div className="bg-emerald-100 p-4 rounded-xl border border-emerald-200">
                                    <h4 className="text-emerald-800 text-sm font-semibold mb-1">O'rtacha baho</h4>
                                    <p className="text-2xl font-bold text-emerald-600">{selectedChildStats.stats?.average_score || 0}%</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 border rounded-xl p-4">
                                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-emerald-500" />
                                    O'quv faolligi
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Tamomlangan darslar:</span>
                                        <span className="font-bold text-gray-800">{selectedChildStats.stats?.total_lessons || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-gray-600">Joriy ketma-ketlik (kun):</span>
                                        <span className="font-bold text-orange-500">{selectedChildStats.stats?.current_streak || 0} kun</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowReportModal(false)}
                                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                                >
                                    Yopish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ParentDashboard;
