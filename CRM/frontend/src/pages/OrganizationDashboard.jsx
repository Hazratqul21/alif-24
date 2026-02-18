import React, { useState, useEffect } from 'react';
import {
    Users, TrendingUp, BookOpen, Activity,
    Search, Filter, RefreshCw, Eye, Lock,
    FileText, Calendar, Plus, Trash2, Upload, MessageSquare, Phone, Mail
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import organizationService from '../services/organizationService';
import crmService from '../services/crmService';
import CRMBoard from '../components/crm/CRMBoard';
import { formatDate } from '../utils/formatDate';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const OrganizationDashboard = () => {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [leads, setLeads] = useState([]);

    const [activeTab, setActiveTab] = useState('stats');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    // Modal states
    const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
    const [teacherIdToAdd, setTeacherIdToAdd] = useState('');

    const [showInviteStudentModal, setShowInviteStudentModal] = useState(false);
    const [inviteStudentData, setInviteStudentData] = useState({ name: '', phone: '', email: '' });

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadFileUrl, setUploadFileUrl] = useState('');

    const [showEditLeadModal, setShowEditLeadModal] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [editLeadData, setEditLeadData] = useState({ first_name: '', last_name: '', phone: '', notes: '' });

    // Load Data
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsData, teachersData, pendingData, materialsData, usersData, leadsData] = await Promise.all([
                organizationService.getStats().catch(err => null),
                organizationService.getTeachers().catch(err => []),
                organizationService.getPendingTeachers().catch(err => []),
                organizationService.getMaterials().catch(err => []),
                organizationService.getUsers().catch(err => ({ users: [] })),
                crmService.getLeads().catch(err => [])
            ]);

            if (statsData) setStats(statsData);
            if (teachersData) setTeachers(teachersData);
            if (pendingData) setPendingTeachers(Array.isArray(pendingData) ? pendingData : []);
            if (materialsData) setMaterials(materialsData);
            if (usersData && usersData.users) setUsersList(usersData.users);
            if (leadsData) setLeads(leadsData);

        } catch (error) {
            console.error('Load error:', error);
            setError("Ma'lumotlarni yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Handlers
    const handleInviteStudent = async (e) => {
        e.preventDefault();
        try {
            await organizationService.inviteStudent(inviteStudentData);
            setShowInviteStudentModal(false);
            setInviteStudentData({ name: '', phone: '', email: '' });
            loadData();
            alert("O'quvchi muvaffaqiyatli taklif qilindi.");
        } catch (error) {
            alert("Xatolik: " + error.message);
        }
    };

    const handleCRMStatusChange = async (leadId, newStatus) => {
        try {
            await crmService.updateLead(leadId, { status: newStatus });
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
            // Refresh stats to update charts
            const newStats = await organizationService.getStats();
            setStats(newStats);
        } catch (error) {
            console.error("CRM Update failed", error);
            loadData();
        }
    };

    const handleCRMEdit = (lead) => {
        setEditingLead(lead);
        setEditLeadData({
            first_name: lead.first_name || '',
            last_name: lead.last_name || '',
            phone: lead.phone || '',
            notes: lead.notes || ''
        });
        setShowEditLeadModal(true);
    };

    const handleSaveLeadEdit = async (e) => {
        e.preventDefault();
        try {
            await crmService.updateLead(editingLead.id, editLeadData);
            setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, ...editLeadData } : l));
            setShowEditLeadModal(false);
            setEditingLead(null);
        } catch (error) {
            alert('Tahrirlashda xatolik: ' + error.message);
        }
    };

    const handleCRMDelete = async (leadId) => {
        if (!window.confirm("O'chirmoqchimisiz?")) return;
        try {
            await crmService.deleteLead(leadId);
            setLeads(prev => prev.filter(l => l.id !== leadId));
            const newStats = await organizationService.getStats();
            setStats(newStats);
        } catch (error) {
            alert("O'chirib bo'lmadi");
        }
    };

    const handleAddTeacher = async (e) => {
        e.preventDefault();
        try {
            await organizationService.addTeacher(teacherIdToAdd);
            setShowAddTeacherModal(false);
            setTeacherIdToAdd('');
            loadData();
            alert('Teacher added successfully');
        } catch (error) {
            alert('Error adding teacher: ' + error.message);
        }
    };

    const handleRemoveTeacher = async (id) => {
        if (!window.confirm('Are you sure you want to remove this teacher?')) return;
        try {
            await organizationService.removeTeacher(id);
            loadData();
        } catch (error) {
            alert('Error removing teacher');
        }
    };

    const handleUploadMaterial = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', uploadTitle);
            formData.append('file_url', uploadFileUrl);

            await organizationService.uploadMaterial(formData);
            setShowUploadModal(false);
            setUploadTitle('');
            setUploadFileUrl('');
            loadData();
            alert('Material uploaded successfully');
        } catch (error) {
            alert('Error uploading material');
        }
    };

    // Filter Users
    const handleApproveTeacher = async (userId) => {
        try {
            await organizationService.approveTeacher(userId);
            alert("O'qituvchi tasdiqlandi!");
            loadData();
        } catch (err) {
            alert('Xatolik: ' + err.message);
        }
    };

    const handleRejectTeacher = async (userId) => {
        const reason = prompt("Rad etish sababini kiriting:");
        if (!reason) return;
        try {
            await organizationService.rejectTeacher(userId, reason);
            alert("O'qituvchi rad etildi");
            loadData();
        } catch (err) {
            alert('Xatolik: ' + err.message);
        }
    };

    const filteredUsers = usersList.filter(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
            email.includes(searchTerm.toLowerCase());
        const matchesRole = !roleFilter || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getRoleName = (role) => {
        const roles = {
            'student': 'O‘quvchi',
            'teacher': 'O‘qituvchi',
            'parent': 'Ota-ona',
            'organization': 'Ta’lim tashkiloti',
            'moderator': 'Moderator'
        };
        return roles[role] || role;
    };

    // Chart Data Preparation
    const studentLeadData = stats ? [
        { name: 'O\'quvchilar', count: stats.total_students || 0 },
        { name: 'Lidlar', count: stats.total_leads || 0 },
    ] : [];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center gap-3">
                        <div className="min-w-0">
                            <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">Ta'lim tashkiloti Paneli</h1>
                            <p className="text-xs md:text-sm text-gray-600 truncate">{user?.first_name} {user?.last_name} <span className="hidden sm:inline">| {user?.email}</span></p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <button
                                onClick={loadData}
                                className="px-3 md:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">Yangilash</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-6 sticky top-20 z-20">
                    <div className="border-b border-gray-200">
                        <nav className="flex gap-4 md:gap-8 px-3 md:px-6 overflow-x-auto no-scrollbar">
                            {[
                                { key: 'stats', label: 'Statistika', icon: TrendingUp },
                                { key: 'crm', label: 'CRM / Lidlar', icon: MessageSquare },
                                { key: 'teachers', label: 'O‘qituvchilar', icon: Users },
                                { key: 'materials', label: 'Content Box', icon: BookOpen },
                                { key: 'schedule', label: 'Dars Jadvali', icon: Calendar },
                                { key: 'users', label: 'Foydalanuvchilar', icon: Users },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === tab.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <tab.icon size={20} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* --- STATS TAB --- */}
                {activeTab === 'stats' && (
                    <>
                        {loading && !stats && (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        )}

                        {!loading && !stats && (
                            <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm">
                                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                                    <Activity size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">Statistika ma'lumotlari mavjud emas</h3>
                                <p className="mb-4">Ma'lumotlarni yuklashda xatolik yuz berdi yoki hali ma'lumot yo'q.</p>
                                <button
                                    onClick={loadData}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Qayta urinish
                                </button>
                            </div>
                        )}

                        {stats && (
                            <div className="space-y-6 animate-fadeIn">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                                    <StatCard label="Jami O'quvchilar" value={stats.total_students} icon={<Users />} color="blue" />
                                    <StatCard label="Jami Lidlar" value={stats.total_leads} icon={<TrendingUp />} color="orange" />
                                    <StatCard label="O'qituvchilar" value={stats.total_teachers} icon={<BookOpen />} color="purple" />
                                    <StatCard label="Faollik" value="Yuqori" icon={<Activity />} color="green" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Distribution Chart */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm">
                                        <h3 className="text-lg font-bold mb-4">Lidlar Statusi Bo'yicha</h3>
                                        <div className="h-64 w-full">
                                            {stats.leads_by_status && stats.leads_by_status.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={stats.leads_by_status}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                            outerRadius={80}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                        >
                                                            {stats.leads_by_status.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                                    <div className="bg-gray-50 p-3 rounded-full mb-2">
                                                        <TrendingUp size={24} />
                                                    </div>
                                                    <p>Ma'lumot yo'q</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Comparison Chart */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm">
                                        <h3 className="text-lg font-bold mb-4">O'quvchilar va Lidlar</h3>
                                        <div className="h-64 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={studentLeadData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" />
                                                    <YAxis allowDecimals={false} />
                                                    <RechartsTooltip />
                                                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Activities */}
                                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-gray-100">
                                        <h3 className="text-lg font-bold">So'nggi Faoliyatlar</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lid</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Faoliyat</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Xulosa</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vaqt</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {stats.recent_activities && stats.recent_activities.length > 0 ? (
                                                    stats.recent_activities.map((activity) => (
                                                        <tr key={activity.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                                {activity.lead_name}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs uppercase font-bold">
                                                                    {activity.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                                {activity.summary}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {formatDate(activity.created_at)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <div className="bg-gray-50 p-3 rounded-full mb-2">
                                                                    <Activity size={24} />
                                                                </div>
                                                                <p>Hozircha faoliyatlar yo'q</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* --- CRM TAB --- */}
                {activeTab === 'crm' && (
                    <div className="h-[calc(100vh-250px)] animate-fadeIn">
                        <CRMBoard
                            leads={leads}
                            onStatusChange={handleCRMStatusChange}
                            onEdit={handleCRMEdit}
                            onDelete={handleCRMDelete}
                        />
                    </div>
                )}

                {/* --- TEACHERS TAB --- */}
                {activeTab === 'teachers' && (
                    <div className="bg-white rounded-lg shadow-sm p-6 animate-fadeIn">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Mening O'qituvchilarim</h2>
                            <button
                                onClick={() => setShowAddTeacherModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                <Plus size={18} /> O'qituvchi Qo'shish
                            </button>
                        </div>

                        {/* Pending Teachers Section */}
                        {pendingTeachers.length > 0 && (
                            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h3 className="font-bold text-yellow-800 mb-3">Tasdiqlash kutayotgan o'qituvchilar ({pendingTeachers.length})</h3>
                                <div className="space-y-3">
                                    {pendingTeachers.map(pt => (
                                        <div key={pt.user?.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                                            <div>
                                                <div className="font-medium text-gray-900">{pt.user?.first_name} {pt.user?.last_name}</div>
                                                <div className="text-sm text-gray-500">{pt.user?.email || pt.user?.phone} | {pt.profile?.specialization || 'Mutaxassislik ko\'rsatilmagan'}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApproveTeacher(pt.user?.id)} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition">Tasdiqlash</button>
                                                <button onClick={() => handleRejectTeacher(pt.user?.id)} className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition">Rad etish</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ism</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Malaka</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right">Amallar</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {teachers.map(teacher => (
                                        <tr key={teacher.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {teacher.first_name} {teacher.last_name}
                                                </div>
                                                <div className="text-xs text-gray-500">{teacher.email || teacher.phone}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {teacher.specialization || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full ${teacher.verification_status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    teacher.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {teacher.verification_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                                {teacher.verification_status === 'pending' && (
                                                    <button onClick={() => handleApproveTeacher(teacher.user_id)} className="text-green-600 hover:text-green-800 text-xs bg-green-50 px-2 py-1 rounded">Tasdiqlash</button>
                                                )}
                                                <button
                                                    onClick={() => handleRemoveTeacher(teacher.id)}
                                                    className="text-red-600 hover:text-red-900 transition"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {teachers.length === 0 && (
                                <div className="text-center p-8 text-gray-500">O'qituvchilar ro'yxati bo'sh</div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- MATERIALS TAB --- */}
                {activeTab === 'materials' && (
                    <div className="bg-white rounded-lg shadow-sm p-6 animate-fadeIn">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Content Box</h2>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                <Upload size={18} /> Material Yuklash
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {materials.map(material => (
                                <div key={material.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all bg-white hover:-translate-y-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                            <FileText size={24} />
                                        </div>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                            {material.category || 'Fayl'}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1">{material.title}</h3>
                                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{material.description}</p>
                                    <a
                                        href={material.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                    >
                                        <Eye size={14} /> Ko'rish
                                    </a>
                                </div>
                            ))}
                        </div>
                        {materials.length === 0 && (
                            <div className="text-center p-8 text-gray-500">Materiallar yuklanmagan</div>
                        )}
                    </div>
                )}

                {/* --- SCHEDULE TAB --- */}
                {activeTab === 'schedule' && (
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center animate-fadeIn">
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="bg-blue-50 p-4 rounded-full mb-4">
                                <Calendar size={48} className="text-blue-500" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Dars Jadvali</h3>
                            <p className="text-gray-500 mb-6 max-w-sm">Sinf xonalari bo'yicha dars jadvallarini boshqarish. Bu funksiya tez orada ishga tushadi.</p>
                            <button className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg cursor-not-allowed" disabled>
                                Tez orada
                            </button>
                        </div>
                    </div>
                )}

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-lg shadow-sm animate-fadeIn">
                        <div className="p-4 md:p-6 border-b border-gray-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                <h2 className="text-lg font-bold">Foydalanuvchilar</h2>
                                <button
                                    onClick={() => setShowInviteStudentModal(true)}
                                    className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 transition text-sm"
                                >
                                    <Plus size={18} /> O'quvchi Taklif Qilish
                                </button>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Qidirish (ism, email)..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    />
                                </div>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                    <option value="">Barcha rollar</option>
                                    <option value="student">O'quvchilar</option>
                                    <option value="teacher">O'qituvchilar</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ism</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aloqa</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holat</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                {u.name || (u.first_name + ' ' + u.last_name)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex flex-col">
                                                    <span className="flex items-center gap-1"><Mail size={12} /> {u.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full ${u.role === 'student' ? 'bg-blue-100 text-blue-800' :
                                                    u.role === 'teacher' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'
                                                    }`}>
                                                    {getRoleName(u.role)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                                    Faol
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center py-8 text-gray-500">Hech narsa topilmadi</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- MODALS --- */}
                {showAddTeacherModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                            <h3 className="text-lg font-bold mb-4">O'qituvchi Qo'shish</h3>
                            <form onSubmit={handleAddTeacher}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">O'qituvchi ID</label>
                                    <input
                                        type="text"
                                        value={teacherIdToAdd}
                                        onChange={e => setTeacherIdToAdd(e.target.value)}
                                        className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        required
                                        placeholder="UUID kiriting..."
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        * O'qituvchi tizimda ro'yxatdan o'tgan bo'lishi kerak
                                    </p>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddTeacherModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                    >
                                        Qo'shish
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showUploadModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                            <h3 className="text-lg font-bold mb-4">Material Yuklash</h3>
                            <form onSubmit={handleUploadMaterial}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Nomi</label>
                                    <input
                                        type="text"
                                        value={uploadTitle}
                                        onChange={e => setUploadTitle(e.target.value)}
                                        className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                        placeholder="Masalan: 5-sinf darsligi"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Fayl URL</label>
                                    <input
                                        type="text"
                                        value={uploadFileUrl}
                                        onChange={e => setUploadFileUrl(e.target.value)}
                                        className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                    >
                                        Yuklash
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Invite Student Modal */}
                {showInviteStudentModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                            <h3 className="text-lg font-bold mb-4">O'quvchi Taklif Qilish</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                O'quvchi ma'lumotlarini kiriting. Tizim avtomatik ravishda login va parolni SMS/Email orqali yuboradi.
                            </p>
                            <form onSubmit={handleInviteStudent}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Ism va Familiya</label>
                                    <input
                                        type="text"
                                        value={inviteStudentData.name}
                                        onChange={e => setInviteStudentData({ ...inviteStudentData, name: e.target.value })}
                                        className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                        placeholder="Ali Valiyev"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Telefon Raqami</label>
                                    <input
                                        type="tel"
                                        value={inviteStudentData.phone}
                                        onChange={e => setInviteStudentData({ ...inviteStudentData, phone: e.target.value })}
                                        className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                        placeholder="+998901234567"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Email <span className="text-gray-400 font-normal">(Ixtiyoriy)</span></label>
                                    <input
                                        type="email"
                                        value={inviteStudentData.email}
                                        onChange={e => setInviteStudentData({ ...inviteStudentData, email: e.target.value })}
                                        className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="student@example.com"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteStudentModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                    >
                                        Taklif Qilish
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Lead Modal */}
                {showEditLeadModal && editingLead && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                            <h3 className="text-lg font-bold mb-4">Lidni Tahrirlash</h3>
                            <form onSubmit={handleSaveLeadEdit}>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Ism</label>
                                        <input
                                            type="text"
                                            value={editLeadData.first_name}
                                            onChange={e => setEditLeadData({ ...editLeadData, first_name: e.target.value })}
                                            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Familiya</label>
                                        <input
                                            type="text"
                                            value={editLeadData.last_name}
                                            onChange={e => setEditLeadData({ ...editLeadData, last_name: e.target.value })}
                                            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Telefon</label>
                                    <input
                                        type="tel"
                                        value={editLeadData.phone}
                                        onChange={e => setEditLeadData({ ...editLeadData, phone: e.target.value })}
                                        className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Izohlar</label>
                                    <textarea
                                        value={editLeadData.notes}
                                        onChange={e => setEditLeadData({ ...editLeadData, notes: e.target.value })}
                                        className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                        placeholder="Qo'shimcha ma'lumot..."
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowEditLeadModal(false); setEditingLead(null); }}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                    >
                                        Saqlash
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <div className={`rounded-xl p-4 md:p-6 ${colorClasses[color]} transition-transform hover:-translate-y-1`}>
            <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 bg-white/50 rounded-lg">{icon}</div>
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider opacity-70">Statistika</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold mb-1">{value}</div>
            <div className="text-xs md:text-sm font-medium opacity-80">{label}</div>
        </div>
    );
};

export default OrganizationDashboard;
