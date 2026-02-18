import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import parentService from '../services/parentService';
import Navbar from '../components/Common/Navbar';
import { Users, CreditCard, Bell, Settings, PieChart, Calendar, TrendingUp, Plus, X, Eye, EyeOff, Key, UserCheck, ArrowDown, ArrowUp, School } from 'lucide-react';

const ParentDashboard = () => {
    const { language } = useLanguage();
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newChild, setNewChild] = useState({ first_name: '', last_name: '', date_of_birth: '', gender: '', grade: '' });
    const [createdChild, setCreatedChild] = useState(null);

    // Notifications state
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'Matematika bahosi yangilandi', desc: 'Ali 5 baho oldi', time: '2 soat oldin', read: false, type: 'grade' },
        { id: 2, title: 'Yangi vazifa berildi', desc: 'Ingliz tili: New Words', time: '5 soat oldin', read: false, type: 'task' },
        { id: 3, title: 'Haftalik hisobot tayyor', desc: 'Ali\'ning o\'tgan hafta natijalari', time: '1 kun oldin', read: true, type: 'report' },
        { id: 4, title: 'Davomat ogohlantirishi', desc: 'Ali bugun 1-darsga kelmadi', time: '2 kun oldin', read: true, type: 'attendance' }
    ]);

    // Settings state
    const [parentSettings, setParentSettings] = useState(() => {
        const saved = localStorage.getItem('parent_settings');
        return saved ? JSON.parse(saved) : {
            emailNotif: true, pushNotif: true, smsNotif: false,
            gradeAlerts: true, attendanceAlerts: true, taskAlerts: true,
            weeklyReport: true, screenTimeLimit: false
        };
    });

    useEffect(() => {
        fetchChildren();
    }, []);

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

    const handleAddChild = async (e) => {
        e.preventDefault();
        try {
            const result = await parentService.createChild(newChild);
            setCreatedChild(result);
            fetchChildren();
            setNewChild({ first_name: '', last_name: '', date_of_birth: '', gender: '', grade: '' });
        } catch (error) {
            alert(error.message || "Xatolik yuz berdi");
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
        }
    };

    const t = content[language] || content.uz;

    // Transactions mock data for UI
    const transactions = [
        { id: 1, desc: 'Obuna (Pro)', amount: '-50,000 UZS', date: '01.12.2023', status: 'success' },
        { id: 2, desc: 'Hamyon to\'ldirish', amount: '+100,000 UZS', date: '30.11.2023', status: 'success' }
    ];

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
                                onClick={() => alert(`${child.first_name} uchun hisobot tez orada tayyor bo'ladi`)}
                                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition"
                            >
                                {t.children.viewReport}
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
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-5 md:p-8 text-white mb-6 md:mb-8 shadow-lg shadow-indigo-200">
                <p className="opacity-80 mb-2 font-medium text-sm md:text-base">{t.payments.balance}</p>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                    <h2 className="text-2xl md:text-4xl font-bold">145,000 UZS</h2>
                    <button className="bg-white text-indigo-600 px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-bold shadow-sm hover:scale-105 transition-transform flex items-center gap-2 text-sm md:text-base">
                        <CreditCard size={18} /> {t.payments.pay}
                    </button>
                </div>
            </div>

            <h3 className="font-bold text-xl text-gray-800 mb-4">{t.payments.history}</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {transactions.map(tx => (
                    <div key={tx.id} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center hover:bg-gray-50 cursor-default">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount.startsWith('+') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {tx.amount.startsWith('+') ? <ArrowDown size={20} /> : <ArrowUp size={20} />}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">{tx.desc}</h4>
                                <p className="text-xs text-gray-500">{tx.date}</p>
                            </div>
                        </div>
                        <span className={`font-bold ${tx.amount.startsWith('+') ? 'text-green-600' : 'text-gray-900'}`}>{tx.amount}</span>
                    </div>
                ))}
            </div>
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
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            notif.type === 'grade' ? 'bg-green-100 text-green-600' :
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

            {/* Add Child Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">{t.addModal.title}</h3>
                            <button onClick={() => { setShowAddModal(false); setCreatedChild(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            {!createdChild ? (
                                <form onSubmit={handleAddChild} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">{t.addModal.firstName}</label>
                                            <input
                                                type="text" required
                                                value={newChild.first_name}
                                                onChange={(e) => setNewChild({ ...newChild, first_name: e.target.value })}
                                                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">{t.addModal.lastName}</label>
                                            <input
                                                type="text"
                                                value={newChild.last_name}
                                                onChange={(e) => setNewChild({ ...newChild, last_name: e.target.value })}
                                                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tug'ilgan sana</label>
                                            <input
                                                type="date"
                                                value={newChild.date_of_birth}
                                                onChange={(e) => setNewChild({ ...newChild, date_of_birth: e.target.value })}
                                                max={new Date().toISOString().split('T')[0]}
                                                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Jins</label>
                                            <div className="flex gap-2">
                                                <label className={`flex-1 flex items-center justify-center py-3 rounded-xl cursor-pointer transition-all text-sm font-medium ${
                                                    newChild.gender === 'male' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}>
                                                    <input type="radio" name="child_gender" value="male" checked={newChild.gender === 'male'} onChange={(e) => setNewChild({ ...newChild, gender: e.target.value })} className="sr-only" />
                                                    Erkak
                                                </label>
                                                <label className={`flex-1 flex items-center justify-center py-3 rounded-xl cursor-pointer transition-all text-sm font-medium ${
                                                    newChild.gender === 'female' ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-400' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}>
                                                    <input type="radio" name="child_gender" value="female" checked={newChild.gender === 'female'} onChange={(e) => setNewChild({ ...newChild, gender: e.target.value })} className="sr-only" />
                                                    Ayol
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Sinf</label>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {['1-sinf','2-sinf','3-sinf','4-sinf','5-sinf','6-sinf','7-sinf','8-sinf','9-sinf','10-sinf','11-sinf'].map(g => (
                                                <label key={g} className={`flex items-center justify-center py-2 rounded-lg cursor-pointer transition-all text-xs font-medium ${
                                                    newChild.grade === g ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}>
                                                    <input type="radio" name="child_grade" value={g} checked={newChild.grade === g} onChange={(e) => setNewChild({ ...newChild, grade: e.target.value })} className="sr-only" />
                                                    {g}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">
                                        {t.addModal.submit}
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <UserCheck size={32} />
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900 mb-2">{t.addModal.success}</h4>
                                    <p className="text-gray-500 text-sm mb-6">{t.addModal.credentialsNote}</p>

                                    <div className="bg-blue-50 rounded-2xl p-6 text-left space-y-3 mb-6">
                                        <div>
                                            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Username</label>
                                            <div className="text-lg font-mono font-bold text-blue-700">{createdChild.username || createdChild.credentials?.username}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">PIN Kod</label>
                                            <div className="text-lg font-mono font-bold text-blue-700">{createdChild.pin || createdChild.credentials?.pin}</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { setShowAddModal(false); setCreatedChild(null); }}
                                        className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition"
                                    >
                                        {t.addModal.close}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ParentDashboard;
