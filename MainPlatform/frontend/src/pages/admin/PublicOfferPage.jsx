import { useState, useEffect, useRef } from 'react';
import { FileText, Save, Eye, Edit3, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import adminService from '../../services/adminService';

const OFFER_KEY = 'public_offer';

export default function PublicOfferPage() {
    const [offerText, setOfferText] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(false);
    const [toast, setToast] = useState(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        loadOffer();
    }, []);

    const loadOffer = async () => {
        setLoading(true);
        try {
            const res = await adminService.getPlatformContent(OFFER_KEY);
            const data = res?.data || res;
            const val = data?.value;
            if (val && typeof val === 'object' && val.text) {
                setOfferText(val.text);
            } else if (typeof val === 'string') {
                setOfferText(val);
            } else {
                setOfferText('');
            }
        } catch (err) {
            // Not found yet — empty
            setOfferText('');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await adminService.updatePlatformContent(OFFER_KEY, {
                value: { text: offerText, updated_at: new Date().toISOString() }
            });
            setToast({ type: 'success', msg: "Ommaviy oferta muvaffaqiyatli saqlandi!" });
        } catch (err) {
            setToast({ type: 'error', msg: "Saqlashda xatolik: " + (err.message || 'Noma\'lum') });
        } finally {
            setSaving(false);
            setTimeout(() => setToast(null), 3000);
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
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-emerald-400" /> Ommaviy Oferta
                    </h1>
                    <p className="text-gray-500 text-sm">Foydalanuvchilar ro'yxatdan o'tishda shu matnni ko'radi</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPreview(!preview)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${preview
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                    >
                        {preview ? <Edit3 size={14} /> : <Eye size={14} />}
                        {preview ? "Tahrirlash" : "Ko'rib chiqish"}
                    </button>
                    <button
                        onClick={loadOffer}
                        className="flex items-center gap-2 bg-gray-800 text-gray-300 px-4 py-2 rounded-xl text-sm hover:bg-gray-700 transition"
                    >
                        <RefreshCw size={14} /> Yangilash
                    </button>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${toast.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Editor / Preview */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {preview ? (
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        <div className="prose prose-invert prose-sm max-w-none">
                            {offerText.split('\n').map((line, i) => (
                                <p key={i} className="text-gray-300 text-sm leading-relaxed mb-2">
                                    {line || '\u00A0'}
                                </p>
                            ))}
                        </div>
                    </div>
                ) : (
                    <textarea
                        ref={textareaRef}
                        value={offerText}
                        onChange={(e) => setOfferText(e.target.value)}
                        className="w-full min-h-[60vh] bg-transparent text-gray-200 p-6 resize-none focus:outline-none text-sm leading-relaxed font-mono"
                        placeholder={`Ommaviy oferta matnini shu yerga yozing...\n\nMasalan:\n\n1. UMUMIY QOIDALAR\n1.1 Ushbu ommaviy oferta Alif24 platformasi va uning xizmatlaridan foydalanish shartlarini belgilaydi.\n1.2 Platformaga ro'yxatdan o'tish bilan foydalanuvchi ushbu oferta shartlarini to'liq qabul qiladi.\n\n2. XIZMATLAR\n...`}
                    />
                )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{offerText.length.toLocaleString()} ta belgi</span>
                    <span>{offerText.split(/\s+/).filter(Boolean).length.toLocaleString()} ta so'z</span>
                    <span>{offerText.split('\n').length} qator</span>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                >
                    {saving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save size={16} />
                    )}
                    {saving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
            </div>
        </div>
    );
}
