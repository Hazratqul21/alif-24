import { useEffect, useState } from 'react';
import { Users, GraduationCap, UserCheck, Coins, TrendingUp, Clock } from 'lucide-react';
import adminService from '../../services/adminService';

const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-400 text-sm">{label}</span>
        </div>
        <p className="text-3xl font-bold text-white">{value?.toLocaleString() ?? '—'}</p>
        {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
    </div>
);

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const { data } = await adminService.getDashboard();
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-500 text-sm">Alif24 Platform statistikasi</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Jami foydalanuvchilar" value={stats?.total_users} color="bg-blue-600" />
                <StatCard icon={GraduationCap} label="O'quvchilar" value={stats?.total_students} color="bg-emerald-600" />
                <StatCard icon={UserCheck} label="O'qituvchilar" value={stats?.total_teachers} color="bg-purple-600" />
                <StatCard icon={Users} label="Ota-onalar" value={stats?.total_parents} color="bg-amber-600" />
                <StatCard icon={TrendingUp} label="Faol foydalanuvchilar" value={stats?.active_users} color="bg-green-600" />
                <StatCard icon={Coins} label="Tanga (coins)" value={stats?.coins_in_circulation} color="bg-yellow-600" />
                <StatCard
                    icon={Clock}
                    label="Kutayotgan o'qituvchilar"
                    value={stats?.pending_teachers}
                    color="bg-red-600"
                    subtext={stats?.pending_teachers > 0 ? 'Tasdiqlash kerak!' : 'Hammasi tasdiqlangan'}
                />
            </div>
        </div>
    );
}
