import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import adminService from '../../services/adminService';

const roles = [
    { id: 'hazratqul', label: 'Hazratqul', desc: 'Super Admin', icon: '👑', color: 'from-amber-500 to-orange-600' },
    { id: 'nurali', label: 'Nurali', desc: 'Super Admin', icon: '⚡', color: 'from-blue-500 to-indigo-600' },
    { id: 'pedagog', label: 'Pedagog', desc: 'Kontent boshqaruvchi', icon: '📚', color: 'from-green-500 to-emerald-600' },
];

export default function AdminLogin({ defaultRole = null }) {
    const [selectedRole, setSelectedRole] = useState(defaultRole);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!selectedRole || !password) return;

        try {
            setLoading(true);
            setError('');
            const { data } = await adminService.login(selectedRole, password);

            localStorage.setItem('adminRole', data.role);
            localStorage.setItem('adminKey', data.key);
            localStorage.setItem('adminPermissions', JSON.stringify(data.permissions));

            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Parol noto\'g\'ri');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-4">
                        <Shield className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-1">Admin Panel</h1>
                    <p className="text-gray-500 text-sm">Alif24 Platform boshqaruvi</p>
                </div>

                <form onSubmit={handleLogin}>
                    {/* Role Selection */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {roles.map(r => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => { setSelectedRole(r.id); setError(''); }}
                                className={`p-4 rounded-2xl border-2 transition-all text-center ${selectedRole === r.id
                                        ? `border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10`
                                        : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                                    }`}
                            >
                                <div className="text-2xl mb-1">{r.icon}</div>
                                <div className="text-white text-sm font-medium">{r.label}</div>
                                <div className="text-gray-500 text-xs">{r.desc}</div>
                            </button>
                        ))}
                    </div>

                    {/* Password */}
                    {selectedRole && (
                        <div className="mb-6 animate-in">
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Parolni kiriting..."
                                    autoFocus
                                    className="w-full px-4 py-4 bg-gray-900/80 border-2 border-gray-800 rounded-2xl text-white text-center text-lg tracking-wider placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                            ❌ {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={!selectedRole || !password || loading}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-2xl hover:from-emerald-700 hover:to-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Kirish...
                            </span>
                        ) : 'Kirish'}
                    </button>
                </form>

                <p className="text-center text-gray-700 text-xs mt-8">
                    Bu sahifa faqat adminlar uchun
                </p>
            </div>
        </div>
    );
}
