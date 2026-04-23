import { useEffect, useState } from 'react';
import {
    Mail, Send, Users, Eye, CheckCircle, AlertCircle, Loader2,
    RefreshCw, TestTube2, Megaphone, History, Sparkles,
} from 'lucide-react';
import adminService from '../../services/adminService';

const ROLE_OPTIONS = [
    { value: 'all', label: 'Hammasi' },
    { value: 'student', label: "O'quvchilar" },
    { value: 'teacher', label: "O'qituvchilar" },
    { value: 'parent', label: 'Ota-onalar' },
    { value: 'organization', label: 'Tashkilotlar' },
    { value: 'moderator', label: 'Moderatorlar' },
];

const TEMPLATES = [
    {
        id: 'news',
        label: 'Yangilik',
        title: 'Alif24 yangiliklari',
        body: "<p>Hurmatli foydalanuvchilar,</p><p>[Yangilik matni].</p><p>Hurmat bilan, Alif24 jamoasi</p>",
    },
    {
        id: 'olympiad',
        label: "Olimpiada e'loni",
        title: "Yangi olimpiada e'lon qilindi",
        body: "<p>Salom!</p><p>Yangi olimpiada boshlanmoqda. Siz ham qatnashing va g'olib bo'ling!</p>",
        cta_label: "Olimpiadaga kirish",
        cta_url: "https://olimp.alif24.uz/olympiads",
    },
    {
        id: 'discount',
        label: 'Chegirma',
        title: 'Maxsus chegirma',
        body: "<p>Hurmatli foydalanuvchi!</p><p>Siz uchun <strong>maxsus chegirma</strong> mavjud.</p>",
        cta_label: "Chegirmadan foydalanish",
        cta_url: "https://alif24.uz/",
    },
    {
        id: 'maintenance',
        label: 'Texnik xizmat',
        title: "Texnik xizmat haqida ogohlantirish",
        body: "<p>Hurmatli foydalanuvchilar,</p><p>Platformada texnik ishlar olib boriladi: <strong>[sana] soat [vaqt]</strong>.</p><p>Noqulaylik uchun uzr so'raymiz.</p>",
    },
];

export default function EmailBroadcastPage() {
    const [form, setForm] = useState({
        subject: '',
        title: '',
        body_html: '',
        cta_label: '',
        cta_url: '',
    });
    const [audience, setAudience] = useState({
        role: 'all',
        only_active: true,
        only_marketing_opted_in: true,
        include_unverified_email: false,
    });
    const [audienceCount, setAudienceCount] = useState(null);
    const [audienceLoading, setAudienceLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [testTo, setTestTo] = useState('');
    const [sending, setSending] = useState(false);
    const [testing, setTesting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const refreshAudience = async () => {
        setAudienceLoading(true);
        try {
            const { data } = await adminService.getEmailAudience(audience);
            setAudienceCount(data.audience_count ?? 0);
        } catch (e) {
            setAudienceCount(null);
        } finally {
            setAudienceLoading(false);
        }
    };

    useEffect(() => {
        refreshAudience();
    }, [audience.role, audience.only_active, audience.only_marketing_opted_in, audience.include_unverified_email]);

    const applyTemplate = (tpl) => {
        setForm((f) => ({
            ...f,
            subject: tpl.title,
            title: tpl.title,
            body_html: tpl.body,
            cta_label: tpl.cta_label || '',
            cta_url: tpl.cta_url || '',
        }));
        setPreview(null);
    };

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const { data } = await adminService.getEmailHistory(100);
            setHistory(data.data || []);
        } catch (e) {
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handlePreview = async () => {
        setError(null);
        setPreviewLoading(true);
        try {
            const { data } = await adminService.previewEmailBroadcast({
                subject: form.subject,
                title: form.title,
                body_html: form.body_html || null,
                cta_label: form.cta_label || null,
                cta_url: form.cta_url || null,
                audience,
            });
            setPreview(data);
        } catch (e) {
            setError(e.response?.data?.detail || "Preview xatolik");
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleSendTest = async () => {
        if (!testTo) { setError('Test uchun email kiriting'); return; }
        setError(null); setTesting(true); setResult(null);
        try {
            const { data } = await adminService.sendEmailTest({
                to: testTo,
                subject: form.subject,
                title: form.title,
                body_html: form.body_html || null,
            });
            setResult({ success: true, message: data.message });
        } catch (e) {
            setError(e.response?.data?.detail || 'Test yuborish xatolik');
        } finally {
            setTesting(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!confirm(`${audienceCount ?? '?'} ta foydalanuvchiga xabar yuborishni tasdiqlaysizmi?`)) return;
        setError(null); setSending(true); setResult(null);
        try {
            const { data } = await adminService.sendEmailBroadcast({
                subject: form.subject,
                title: form.title,
                body_html: form.body_html || null,
                cta_label: form.cta_label || null,
                cta_url: form.cta_url || null,
                audience,
            });
            setResult({
                success: true,
                message: `Xabarnoma navbatga qo'yildi. ${data.queued} ta foydalanuvchiga yuborilmoqda.`,
            });
        } catch (e) {
            setError(e.response?.data?.detail || "Yuborish xatolik");
        } finally {
            setSending(false);
        }
    };

    const isFormValid = form.subject.trim().length >= 2 && form.title.trim().length >= 2 && form.body_html.trim().length > 0;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Mail className="w-6 h-6 text-emerald-400" />
                        Email Xabarnomalar
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Foydalanuvchilarga ommaviy HTML email yuborish.
                    </p>
                </div>
                <button
                    onClick={() => { setShowHistory(v => !v); if (!showHistory) loadHistory(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
                >
                    <History className="w-4 h-4" />
                    Tarix
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {error}
                </div>
            )}
            {result?.success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {result.message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Composer */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Templates */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <h3 className="font-semibold text-white text-sm">Shablonlar</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {TEMPLATES.map(t => (
                                <button key={t.id} onClick={() => applyTemplate(t)}
                                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-xs">
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Subject (inbox'da chiqadigan sarlavha)</label>
                            <input
                                type="text"
                                value={form.subject}
                                onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                                placeholder="Alif24 yangiliklari — may 2026"
                                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Title (email ichidagi katta sarlavha)</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Yangi olimpiada boshlanmoqda"
                                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Body (HTML qo'llab-quvvatlanadi)</label>
                            <textarea
                                rows={10}
                                value={form.body_html}
                                onChange={(e) => setForm(f => ({ ...f, body_html: e.target.value }))}
                                placeholder="<p>Salom! Yangi xabarimiz bor...</p>"
                                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                            />
                            <p className="text-gray-500 text-xs mt-1">
                                HTML teglardan foydalaning: <code>&lt;p&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;a href=&quot;&quot;&gt;</code>, <code>&lt;ul&gt;</code>.
                                Hech qanday HTML bilmasangiz oddiy matn yozing — avtomatik formatlanadi.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">CTA tugma yozuvi (optional)</label>
                                <input
                                    type="text"
                                    value={form.cta_label}
                                    onChange={(e) => setForm(f => ({ ...f, cta_label: e.target.value }))}
                                    placeholder="Batafsil o'qish"
                                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">CTA havola (optional)</label>
                                <input
                                    type="url"
                                    value={form.cta_url}
                                    onChange={(e) => setForm(f => ({ ...f, cta_url: e.target.value }))}
                                    placeholder="https://alif24.uz/..."
                                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                            <button onClick={handlePreview} disabled={!isFormValid || previewLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg text-sm">
                                {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                Preview
                            </button>
                            <div className="flex-1 flex gap-2">
                                <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)}
                                    placeholder="test@email.com"
                                    className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 text-sm" />
                                <button onClick={handleSendTest} disabled={!isFormValid || testing || !testTo}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 text-white rounded-lg text-sm">
                                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                                    Test
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    {preview && (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                            <h3 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
                                <Eye className="w-4 h-4 text-blue-400" />
                                Email Preview — <span className="text-gray-400">{preview.subject}</span>
                            </h3>
                            <div className="bg-white rounded-lg overflow-hidden">
                                <iframe
                                    title="email preview"
                                    srcDoc={preview.html}
                                    className="w-full"
                                    style={{ height: '600px', border: 0 }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Audience + Send */}
                <div className="space-y-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-400" />
                            Qabul qiluvchilar
                        </h3>

                        <label className="block text-xs text-gray-400 mb-1">Rol</label>
                        <select
                            value={audience.role}
                            onChange={(e) => setAudience(a => ({ ...a, role: e.target.value }))}
                            className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 mb-3"
                        >
                            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>

                        <label className="flex items-center gap-2 text-sm text-gray-300 mb-1 cursor-pointer">
                            <input type="checkbox" checked={audience.only_active} onChange={(e) => setAudience(a => ({ ...a, only_active: e.target.checked }))} />
                            Faqat faol akkauntlar
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300 mb-1 cursor-pointer">
                            <input type="checkbox" checked={audience.only_marketing_opted_in} onChange={(e) => setAudience(a => ({ ...a, only_marketing_opted_in: e.target.checked }))} />
                            Marketing email'ga rozi bo'lganlar
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300 mb-3 cursor-pointer">
                            <input type="checkbox" checked={audience.include_unverified_email} onChange={(e) => setAudience(a => ({ ...a, include_unverified_email: e.target.checked }))} />
                            Tasdiqlanmagan email'larni ham kiritish
                        </label>

                        <div className="flex items-center justify-between py-3 border-t border-gray-800">
                            <div>
                                <div className="text-xs text-gray-500">Yuboriladi:</div>
                                <div className="text-2xl font-bold text-emerald-400">
                                    {audienceLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (audienceCount ?? '—')}
                                </div>
                                <div className="text-xs text-gray-500">foydalanuvchi</div>
                            </div>
                            <button onClick={refreshAudience} className="p-2 text-gray-400 hover:text-white">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleSendBroadcast}
                        disabled={!isFormValid || sending || !audienceCount}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 text-white rounded-lg font-semibold"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />}
                        Ommaga yuborish
                    </button>
                </div>
            </div>

            {/* History */}
            {showHistory && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                            <History className="w-4 h-4 text-blue-400" />
                            Yuborilgan email'lar
                        </h3>
                        <button onClick={loadHistory} className="text-gray-400 hover:text-white p-1">
                            <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-400 border-b border-gray-800">
                                <tr>
                                    <th className="text-left py-2 pr-3">Vaqt</th>
                                    <th className="text-left py-2 pr-3">Qabul qiluvchi</th>
                                    <th className="text-left py-2 pr-3">Subject</th>
                                    <th className="text-left py-2 pr-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 && !historyLoading && (
                                    <tr><td colSpan={4} className="text-gray-500 text-center py-4">Log bo'sh</td></tr>
                                )}
                                {history.map((h) => (
                                    <tr key={h.id} className="border-b border-gray-800/50 text-gray-300">
                                        <td className="py-2 pr-3 text-xs text-gray-400">
                                            {h.created_at ? new Date(h.created_at).toLocaleString('uz-UZ') : '—'}
                                        </td>
                                        <td className="py-2 pr-3">{h.recipient}</td>
                                        <td className="py-2 pr-3 text-gray-400 text-xs">{h.subject || '—'}</td>
                                        <td className="py-2 pr-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${h.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' :
                                                h.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-gray-500/20 text-gray-400'}`}>
                                                {h.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
