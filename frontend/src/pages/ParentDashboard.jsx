import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import parentService from '../services/parentService';
import Navbar from '../components/Common/Navbar';
import { Users, CreditCard, Bell, Settings, PieChart, Calendar, TrendingUp, Plus, X, Eye, EyeOff, Key, UserCheck } from 'lucide-react';

const ParentDashboard = () => {
    const { language } = useLanguage();
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newChild, setNewChild] = useState({ first_name: '', last_name: '', relationship: 'father' });
    const [createdChild, setCreatedChild] = useState(null);

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
            setNewChild({ first_name: '', last_name: '', relationship: 'father' });
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
            {children.map(childData => {
                const child = childData.user;
                const profile = childData.profile;
                return (
                    <div key={child.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-2xl border-2 border-blue-100 font-bold text-blue-600">
                                    {child.first_name[0]}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{child.first_name} {child.last_name}</h3>
                                    <p className="text-gray-500 font-mono text-sm">@{child.username}</p>
                                </div>
                            </div>
                            <div className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg text-sm">
                                {profile?.total_points || 0} XP
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">
                                    <Calendar size={14} /> Daraja
                                </div>
                                <span className="text-xl font-bold text-gray-800">{profile?.level || 1}</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">
                                    <TrendingUp size={14} /> Darslar
                                </div>
                                <span className="text-xl font-bold text-gray-800">{profile?.total_lessons_completed || 0}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition">
                                {t.children.viewReport}
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
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-8 text-white mb-8 shadow-lg shadow-indigo-200">
                <p className="opacity-80 mb-2 font-medium">{t.payments.balance}</p>
                <div className="flex justify-between items-end">
                    <h2 className="text-4xl font-bold">145,000 UZS</h2>
                    <button className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold shadow-sm hover:scale-105 transition-transform flex items-center gap-2">
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
                                {tx.amount.startsWith('+') ? '↓' : '↑'}
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
                <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-6 flex-shrink-0">
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

                <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'payments' && renderPayments()}

                    {(activeTab === 'notifications' || activeTab === 'settings') && (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                            <Settings size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">Tez orada...</p>
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
                                            type="text" required
                                            value={newChild.last_name}
                                            onChange={(e) => setNewChild({ ...newChild, last_name: e.target.value })}
                                            className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">{t.addModal.relationship}</label>
                                        <select
                                            value={newChild.relationship}
                                            onChange={(e) => setNewChild({ ...newChild, relationship: e.target.value })}
                                            className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        >
                                            <option value="father">Dada</option>
                                            <option value="mother">Oyi</option>
                                            <option value="guardian">Vasiy</option>
                                        </select>
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
                                            <div className="text-lg font-mono font-bold text-blue-700">{createdChild.credentials.username}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">PIN Kod</label>
                                            <div className="text-lg font-mono font-bold text-blue-700">{createdChild.credentials.pin}</div>
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
