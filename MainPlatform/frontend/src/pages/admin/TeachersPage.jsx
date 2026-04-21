import { useEffect, useState } from 'react';
import { Check, X as XIcon, Clock, CheckCircle, GraduationCap, FileText, Users } from 'lucide-react';
import adminService from '../../services/adminService';
import TestManager from '../../components/Admin/TestManager';

export default function TeachersPage() {
    const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' or 'tests'
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        if (activeTab === 'approvals') {
            loadTeachers();
        }
    }, [activeTab]);

    const loadTeachers = async () => {
        setLoading(true);
        try {
            const { data } = await adminService.getPendingTeachers();
            setTeachers(data.teachers || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (teacherId, status) => {
        try {
            setActionLoading(teacherId);
            await adminService.approveTeacher({ teacher_id: teacherId, status });
            loadTeachers();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        } finally {
            setActionLoading(null);
        }
    };

    const renderApprovals = () => {
        if (loading) {
            return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
        }

        return (
            <div>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">O'qituvchilar</h1>
                    <p className="text-gray-500 text-sm">{teachers.length} ta kutayotgan o'qituvchi</p>
                </div>

                {teachers.length === 0 ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                        <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
                        <p className="text-gray-400">Kutayotgan o'qituvchilar yo'q</p>
                        <p className="text-gray-600 text-sm mt-1">Barcha arizalar ko'rib chiqilgan</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {teachers.map(t => (
                            <div key={t.user_id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                            <GraduationCap size={20} className="text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium">{t.first_name} {t.last_name}</h3>
                                            <p className="text-gray-500 text-xs">{t.email || t.phone || 'ID: ' + t.user_id}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Clock className="w-3 h-3 text-yellow-500" />
                                                <span className="text-yellow-500 text-xs">{t.created_at?.split('T')[0]}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApproval(t.user_id, 'approved')}
                                            disabled={actionLoading === t.user_id}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-green-600/10 border border-green-600/20 text-green-400 rounded-xl text-sm font-medium hover:bg-green-600/20 transition-colors disabled:opacity-50"
                                        >
                                            <Check className="w-4 h-4" />
                                            Tasdiqlash
                                        </button>
                                        <button
                                            onClick={() => handleApproval(t.user_id, 'rejected')}
                                            disabled={actionLoading === t.user_id}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-red-600/10 border border-red-600/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-600/20 transition-colors disabled:opacity-50"
                                        >
                                            <XIcon className="w-4 h-4" />
                                            Rad etish
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

    return (
        <div className="h-full pt-2">
            <div className="flex items-center gap-2 mb-8 bg-gray-900/50 p-1 rounded-2xl border border-gray-800 w-fit">
                <button
                    onClick={() => setActiveTab('approvals')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'approvals' 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                >
                    <Users size={18} />
                    O'qituvchilar
                </button>
                <button
                    onClick={() => setActiveTab('tests')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'tests' 
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                >
                    <FileText size={18} />
                    Testlar
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'approvals' ? renderApprovals() : <TestManager />}
            </div>
        </div>
    );
}

