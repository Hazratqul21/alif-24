import { useEffect, useState } from 'react';
import { Users, GraduationCap, UserCheck, TrendingUp, Clock, Globe, MapPin, Smartphone, Monitor, Tablet, CreditCard, AlertTriangle, Activity, Bell, RefreshCw, Zap, Crown, Star, BarChart3, Eye } from 'lucide-react';
import adminService from '../../services/adminService';

const StatCard = ({ icon: Icon, label, value, color, subtext, trend }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-400 text-sm">{label}</span>
            </div>
            {trend && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{trend > 0 ? '+' : ''}{trend}</span>}
        </div>
        <p className="text-3xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}</p>
        {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
    </div>
);

const MiniBar = ({ label, value, max, color = 'bg-emerald-500' }) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs w-24 truncate">{label}</span>
            <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-gray-300 text-xs font-medium w-8 text-right">{value}</span>
        </div>
    );
};

const deviceIcons = { mobile: Smartphone, desktop: Monitor, tablet: Tablet };

export default function AdminDashboard() {
    const [overview, setOverview] = useState(null);
    const [geo, setGeo] = useState(null);
    const [segments, setSegments] = useState(null);
    const [subHealth, setSubHealth] = useState(null);
    const [recentLogins, setRecentLogins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview'); // overview | geo | logins | health

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [ovRes, geoRes, segRes, subRes, loginRes] = await Promise.allSettled([
                adminService.getAnalyticsOverview(),
                adminService.getAnalyticsGeo('30d'),
                adminService.getUserSegments(),
                adminService.getSubscriptionHealth(),
                adminService.getRecentLogins(15),
            ]);
            if (ovRes.status === 'fulfilled') setOverview(ovRes.value?.data || ovRes.value);
            if (geoRes.status === 'fulfilled') setGeo(geoRes.value?.data || geoRes.value);
            if (segRes.status === 'fulfilled') setSegments(segRes.value?.data || segRes.value);
            if (subRes.status === 'fulfilled') setSubHealth(subRes.value?.data || subRes.value);
            if (loginRes.status === 'fulfilled') setRecentLogins((loginRes.value?.data || loginRes.value)?.logins || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    const maxRegionUsers = geo?.regions?.length > 0 ? Math.max(1, ...geo.regions.map(r => Number(r.unique_users) || 0)) : 1;
    const maxDeviceVal = geo?.devices ? Math.max(1, ...Object.values(geo.devices).map(v => Number(v) || 0)) : 1;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-emerald-400" /> Smart Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm">Alif24 Platform — real-time analytics</p>
                </div>
                <button onClick={loadAll} className="flex items-center gap-2 bg-gray-800 text-gray-300 px-4 py-2 rounded-xl text-sm hover:bg-gray-700 transition">
                    <RefreshCw size={14} /> Yangilash
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl w-fit overflow-x-auto">
                {[
                    { key: 'overview', label: 'Umumiy', icon: Activity },
                    { key: 'geo', label: 'Geolokatsiya', icon: Globe },
                    { key: 'logins', label: "So'nggi loginlar", icon: Eye },
                    { key: 'health', label: 'Obuna salomati', icon: CreditCard },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === t.key ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* OVERVIEW TAB */}
            {tab === 'overview' && overview && (
                <div className="space-y-6">
                    {/* Main stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={Users} label="Jami foydalanuvchilar" value={overview.total_users} color="bg-blue-600" />
                        <StatCard icon={GraduationCap} label="O'quvchilar" value={overview.total_students} color="bg-emerald-600" />
                        <StatCard icon={UserCheck} label="O'qituvchilar" value={overview.total_teachers} color="bg-purple-600" />
                        <StatCard icon={Users} label="Ota-onalar" value={overview.total_parents} color="bg-amber-600" />
                    </div>

                    {/* Secondary stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={TrendingUp} label="Bugungi loginlar" value={overview.logins?.today_unique} color="bg-green-600"
                            subtext={`Jami: ${overview.logins?.today_total || 0} ta login`} />
                        <StatCard icon={Zap} label="Yangi bugun" value={overview.new_users?.today} color="bg-cyan-600"
                            subtext={`Hafta: ${overview.new_users?.this_week || 0} | Oy: ${overview.new_users?.this_month || 0}`} />
                        <StatCard icon={CreditCard} label="Faol obunalar" value={overview.active_subscriptions} color="bg-violet-600"
                            subtext={`Konversiya: ${overview.conversion_rate}%`} />
                        <StatCard icon={Crown} label="Jami daromad" value={`${(overview.total_revenue || 0).toLocaleString()}`} color="bg-yellow-600"
                            subtext="UZS" />
                    </div>

                    {/* Segments */}
                    {segments?.segments && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Star size={16} className="text-amber-400" /> Foydalanuvchi segmentlari</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                {segments.segments.map(seg => (
                                    <div key={seg.slug} className="bg-gray-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-white">{seg.count.toLocaleString()}</p>
                                        <p className="text-sm font-medium mt-1" style={{ color: seg.color }}>{seg.name}</p>
                                        <p className="text-gray-500 text-[10px] mt-1">{seg.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Conversion bar */}
                    {overview.total_users > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-3">Obuna konversiyasi</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-4 rounded-full transition-all"
                                        style={{ width: `${Math.min(100, overview.conversion_rate)}%` }} />
                                </div>
                                <span className="text-emerald-400 font-bold text-lg">{overview.conversion_rate}%</span>
                            </div>
                            <p className="text-gray-500 text-xs mt-2">{overview.active_subscriptions} obunador / {overview.total_users} jami foydalanuvchi</p>
                        </div>
                    )}
                </div>
            )}

            {/* GEO TAB */}
            {tab === 'geo' && geo && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Regions */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><MapPin size={16} className="text-red-400" /> Viloyat / Shahar</h3>
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                {(geo.regions || []).map((r, i) => (
                                    <MiniBar key={i} label={`${r.region || '?'} - ${r.city || '?'}`} value={r.unique_users} max={maxRegionUsers} color="bg-blue-500" />
                                ))}
                                {(!geo.regions || geo.regions.length === 0) && <p className="text-gray-500 text-sm text-center py-4">Ma'lumot hali yig'ilmagan</p>}
                            </div>
                        </div>

                        {/* Devices */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Smartphone size={16} className="text-blue-400" /> Qurilma turlari</h3>
                            <div className="space-y-3">
                                {Object.entries(geo.devices || {}).map(([type, count]) => {
                                    const DevIcon = deviceIcons[type] || Monitor;
                                    return (
                                        <div key={type} className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-3">
                                            <DevIcon size={20} className="text-gray-400" />
                                            <div className="flex-1">
                                                <span className="text-white text-sm capitalize">{type}</span>
                                                <div className="bg-gray-700 rounded-full h-1.5 mt-1">
                                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(count / maxDeviceVal) * 100}%` }} />
                                                </div>
                                            </div>
                                            <span className="text-gray-300 text-sm font-bold">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <h3 className="text-white font-bold mt-6 mb-3 flex items-center gap-2"><Globe size={16} className="text-emerald-400" /> Brauzerlar</h3>
                            <div className="space-y-2">
                                {Object.entries(geo.browsers || {}).map(([name, count]) => (
                                    <MiniBar key={name} label={name} value={count} max={Math.max(...Object.values(geo.browsers || {}), 1)} color="bg-emerald-500" />
                                ))}
                            </div>

                            <h3 className="text-white font-bold mt-6 mb-3">🖥️ OS</h3>
                            <div className="space-y-2">
                                {Object.entries(geo.os || {}).map(([name, count]) => (
                                    <MiniBar key={name} label={name} value={count} max={Math.max(...Object.values(geo.os || {}), 1)} color="bg-purple-500" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ISPs */}
                    {Object.keys(geo.isps || {}).length > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-4">📡 Internet Provayderlar (Top 10)</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                {Object.entries(geo.isps || {}).map(([name, count]) => (
                                    <div key={name} className="bg-gray-800/50 rounded-xl p-3 text-center">
                                        <p className="text-white font-bold text-lg">{count}</p>
                                        <p className="text-gray-500 text-[10px] truncate" title={name}>{name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-gray-600 text-xs text-center">Jami {geo.total_geo_records?.toLocaleString()} ta geolokatsiya yozuvi (oxirgi 30 kun)</p>
                </div>
            )}

            {/* LOGINS TAB */}
            {tab === 'logins' && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800">
                        <h3 className="text-white font-bold flex items-center gap-2"><Clock size={16} className="text-blue-400" /> So'nggi loginlar</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 text-left border-b border-gray-800">
                                    <th className="px-4 py-2">Foydalanuvchi</th>
                                    <th className="px-4 py-2">Rol</th>
                                    <th className="px-4 py-2">Joylashuv</th>
                                    <th className="px-4 py-2">Qurilma</th>
                                    <th className="px-4 py-2">Vaqt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLogins.map((l, i) => (
                                    <tr key={i} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                                        <td className="px-4 py-2.5">
                                            <span className="text-white font-medium">{l.name}</span>
                                            {l.phone && <span className="text-gray-500 text-xs ml-2">{l.phone}</span>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${l.role === 'student' ? 'bg-emerald-500/10 text-emerald-400' : l.role === 'parent' ? 'bg-amber-500/10 text-amber-400' : l.role === 'teacher' ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                                {l.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-400 text-xs">
                                            {l.region && l.city ? `${l.region}, ${l.city}` : l.ip || '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-400 text-xs">
                                            {l.device && <span className="capitalize">{l.device}</span>}
                                            {l.browser && <span className="text-gray-600 ml-1">/ {l.browser}</span>}
                                            {l.os && <span className="text-gray-600 ml-1">/ {l.os}</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                                            {l.time ? new Date(l.time).toLocaleString('uz') : '—'}
                                        </td>
                                    </tr>
                                ))}
                                {recentLogins.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">Hali login ma'lumotlari yig'ilmagan</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* HEALTH TAB */}
            {tab === 'health' && subHealth && (
                <div className="space-y-6">
                    {/* Warning cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`bg-gray-900 border rounded-2xl p-5 ${subHealth.expiring_3d > 0 ? 'border-red-500/30' : 'border-gray-800'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={16} className={subHealth.expiring_3d > 0 ? 'text-red-400' : 'text-gray-500'} />
                                <span className="text-gray-400 text-sm">3 kun ichida tugaydi</span>
                            </div>
                            <p className={`text-3xl font-bold ${subHealth.expiring_3d > 0 ? 'text-red-400' : 'text-gray-300'}`}>{subHealth.expiring_3d}</p>
                        </div>
                        <div className={`bg-gray-900 border rounded-2xl p-5 ${subHealth.expiring_7d > 0 ? 'border-amber-500/30' : 'border-gray-800'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={16} className={subHealth.expiring_7d > 0 ? 'text-amber-400' : 'text-gray-500'} />
                                <span className="text-gray-400 text-sm">7 kun ichida tugaydi</span>
                            </div>
                            <p className={`text-3xl font-bold ${subHealth.expiring_7d > 0 ? 'text-amber-400' : 'text-gray-300'}`}>{subHealth.expiring_7d}</p>
                        </div>
                        <div className={`bg-gray-900 border rounded-2xl p-5 ${subHealth.stale_expired > 0 ? 'border-orange-500/30' : 'border-gray-800'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={16} className={subHealth.stale_expired > 0 ? 'text-orange-400' : 'text-gray-500'} />
                                <span className="text-gray-400 text-sm">Muddati o'tgan (active)</span>
                            </div>
                            <p className={`text-3xl font-bold ${subHealth.stale_expired > 0 ? 'text-orange-400' : 'text-gray-300'}`}>{subHealth.stale_expired}</p>
                            {subHealth.stale_expired > 0 && (
                                <button onClick={async () => {
                                    if (!confirm(`${subHealth.stale_expired} ta obunani expired qilish?`)) return;
                                    try {
                                        await adminService.autoExpireSubscriptions();
                                        loadAll();
                                    } catch (e) { alert('Xatolik'); }
                                }} className="mt-3 bg-orange-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-orange-700 transition">
                                    Avtomatik expired qilish
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Plans breakdown */}
                    {subHealth.plans?.length > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-4">Planlar bo'yicha</h3>
                            <div className="space-y-3">
                                {subHealth.plans.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-4">
                                        <div>
                                            <span className="text-white font-medium">{p.name}</span>
                                            <span className="text-gray-500 text-sm ml-2">{p.price?.toLocaleString()} UZS</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-emerald-400 font-bold">{p.active_count} ta faol</span>
                                            <span className="text-gray-400">{p.revenue?.toLocaleString()} UZS</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Expiring users */}
                    {subHealth.expiring_users?.length > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Bell size={16} className="text-amber-400" /> Tez tugaydigan obunalar
                            </h3>
                            <div className="space-y-2">
                                {subHealth.expiring_users.map((u, i) => (
                                    <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-3 text-sm">
                                        <div>
                                            <span className="text-white font-medium">{u.name}</span>
                                            {u.phone && <span className="text-gray-500 text-xs ml-2">{u.phone}</span>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg text-xs">{u.plan_name}</span>
                                            <span className="text-amber-400 text-xs">
                                                {u.expires_at ? new Date(u.expires_at).toLocaleDateString('uz') : '—'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
