import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Plus, Trash2, Save, Globe, Pencil, X, Check, AlertCircle, Eye
} from 'lucide-react';
import apiService from '../services/apiService';

const EMPTY_QUESTION = () => ({
    question_text: '',
    options: ['', '', '', ''],
    correct_option_index: 0,
    points: 5,
    order_index: 0,
});

export default function OlympiadDraftEdit() {
    const { olympiadId } = useParams();
    const navigate = useNavigate();
    const adminKey = localStorage.getItem('adminKey');

    const [olympiad, setOlympiad] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Add/Edit question modal
    const [modal, setModal] = useState(null); // null | 'add' | { question }
    const [form, setForm] = useState(EMPTY_QUESTION());
    const [saving, setSaving] = useState(false);

    const [publishing, setPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);

    useEffect(() => { loadOlympiad(); }, [olympiadId]);

    const loadOlympiad = async () => {
        try {
            setLoading(true);
            const res = await apiService.get(`/olympiad/admin/olympiads/${olympiadId}`, {}, {
                headers: { 'X-Admin-Key': adminKey }
            });
            const data = res.data || res;
            setOlympiad(data);
            setQuestions(data.questions || []);
        } catch (err) {
            setError(err.message || 'Olimpiada yuklanmadi');
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setForm({ ...EMPTY_QUESTION(), order_index: questions.length });
        setModal('add');
    };

    const openEdit = (q) => {
        setForm({
            question_text: q.question_text,
            options: [...q.options],
            correct_option_index: q.correct_option_index ?? q.correct_answer ?? 0,
            points: q.points,
            order_index: q.order_index ?? 0,
        });
        setModal({ question: q });
    };

    const handleSaveQuestion = async () => {
        if (!form.question_text.trim()) { setError('Savol matni kiritilmagan'); return; }
        if (form.options.some(o => !o.trim())) { setError('Barcha variantlarni to\'ldiring'); return; }
        try {
            setSaving(true);
            setError('');
            const payload = {
                question_text: form.question_text,
                options: form.options,
                correct_option_index: parseInt(form.correct_option_index),
                points: parseInt(form.points),
                order_index: parseInt(form.order_index),
            };

            if (modal === 'add') {
                await apiService.post(
                    `/olympiad/admin/olympiads/${olympiadId}/questions`,
                    payload,
                    { headers: { 'X-Admin-Key': adminKey } }
                );
            } else {
                await apiService.put(
                    `/olympiad/admin/olympiads/${olympiadId}/questions/${modal.question.id}`,
                    payload,
                    { headers: { 'X-Admin-Key': adminKey } }
                );
            }

            setModal(null);
            await loadOlympiad();
        } catch (err) {
            setError(err.message || 'Saqlashda xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (questionId) => {
        if (!confirm('Bu savolni o\'chirmoqchimisiz?')) return;
        try {
            await apiService.delete(
                `/olympiad/admin/olympiads/${olympiadId}/questions/${questionId}`,
                { headers: { 'X-Admin-Key': adminKey } }
            );
            await loadOlympiad();
        } catch (err) {
            setError(err.message || 'O\'chirishda xatolik');
        }
    };

    const handlePublish = async () => {
        if (questions.length === 0) {
            setError('Nashr qilish uchun kamida 1 savol kerak');
            return;
        }
        if (!confirm(`"${olympiad?.title}" olympiadasini nashr qilmoqchimisiz? Studentlar ko'ra boshlaydi.`)) return;
        try {
            setPublishing(true);
            setError('');
            const now = new Date();
            const start = olympiad.start_time ? new Date(olympiad.start_time) : now;
            const newStatus = start <= now ? 'active' : 'upcoming';
            await apiService.put(
                `/olympiad/admin/olympiads/${olympiadId}`,
                { status: newStatus },
                { headers: { 'X-Admin-Key': adminKey } }
            );
            setPublishSuccess(true);
            setTimeout(() => navigate('/admin/analytics'), 2000);
        } catch (err) {
            setError(err.message || 'Nashr qilishda xatolik');
        } finally {
            setPublishing(false);
        }
    };

    const updateOption = (idx, val) => {
        const opts = [...form.options];
        opts[idx] = val;
        setForm({ ...form, options: opts });
    };

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 md:p-6">
            <div className="max-w-4xl mx-auto pb-20 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <Link to="/admin/analytics" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-indigo-400" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold">{olympiad?.title || 'Olimpiada'}</h1>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    DRAFT
                                </span>
                            </div>
                            <p className="text-indigo-400 text-xs">{questions.length} ta savol</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Savol qo'shish
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={publishing || publishSuccess}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60"
                        >
                            {publishSuccess ? (
                                <><Check className="w-4 h-4" /> Nashr qilindi!</>
                            ) : publishing ? (
                                'Nashr qilinmoqda...'
                            ) : (
                                <><Globe className="w-4 h-4" /> Nashr qilish</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{error}</span>
                        <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
                    </div>
                )}

                {/* Olympiad Info Card */}
                {olympiad && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white/60 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-white/30 text-xs mb-1">Boshlanish</p>
                            <p className="text-white font-medium">
                                {olympiad.start_time ? new Date(olympiad.start_time).toLocaleString('uz-UZ') : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-white/30 text-xs mb-1">Tugash</p>
                            <p className="text-white font-medium">
                                {olympiad.end_time ? new Date(olympiad.end_time).toLocaleString('uz-UZ') : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-white/30 text-xs mb-1">Vaqt</p>
                            <p className="text-white font-medium">{olympiad.duration_minutes} daqiqa</p>
                        </div>
                        <div>
                            <p className="text-white/30 text-xs mb-1">Holat</p>
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                                DRAFT — Studentlar ko'rmaydi
                            </span>
                        </div>
                    </div>
                )}

                {/* Questions List */}
                <div className="space-y-3">
                    {questions.length === 0 ? (
                        <div className="text-center py-16 text-white/30">
                            <div className="text-5xl mb-4">📝</div>
                            <p>Hali savollar yo'q. "Savol qo'shish" tugmasini bosing.</p>
                        </div>
                    ) : (
                        questions.map((q, idx) => (
                            <motion.div
                                key={q.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-5"
                            >
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 bg-indigo-600/30 border border-indigo-500/40 rounded-lg flex items-center justify-center text-sm font-bold text-indigo-300">
                                            {idx + 1}
                                        </span>
                                        <p className="text-white font-medium">{q.question_text}</p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button
                                            onClick={() => openEdit(q)}
                                            className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(q.id)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 ml-11">
                                    {q.options.map((opt, oi) => (
                                        <div
                                            key={oi}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${
                                                (q.correct_option_index ?? q.correct_answer) === oi
                                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                                    : 'bg-slate-900/50 border-white/5 text-white/60'
                                            }`}
                                        >
                                            <span className="font-bold w-5">{String.fromCharCode(65 + oi)})</span>
                                            {opt}
                                            {(q.correct_option_index ?? q.correct_answer) === oi && <Check className="w-3 h-3 ml-auto" />}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3 mt-2 ml-11 text-xs text-white/30">
                                    <span>{q.points} ball</span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Bottom Add Button */}
                {questions.length > 0 && (
                    <button
                        onClick={openAdd}
                        className="w-full py-4 border-2 border-dashed border-white/10 hover:border-indigo-500/40 rounded-2xl text-white/40 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Yangi savol qo'shish
                    </button>
                )}
            </div>

            {/* Add/Edit Question Modal */}
            <AnimatePresence>
                {modal !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={() => setModal(null)}
                    >
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-bold text-white">
                                    {modal === 'add' ? 'Yangi savol qo\'shish' : 'Savolni tahrirlash'}
                                </h3>
                                <button onClick={() => setModal(null)} className="text-white/40 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Question text */}
                                <div>
                                    <label className="text-xs text-indigo-400 font-medium mb-1 block">Savol matni *</label>
                                    <textarea
                                        value={form.question_text}
                                        onChange={e => setForm({ ...form, question_text: e.target.value })}
                                        rows={3}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 resize-none text-sm"
                                        placeholder="Savolni kiriting..."
                                    />
                                </div>

                                {/* Options */}
                                <div>
                                    <label className="text-xs text-indigo-400 font-medium mb-2 block">Variantlar (to'g'risini radio tugma bilan belgilang)</label>
                                    <div className="space-y-2">
                                        {form.options.map((opt, oi) => (
                                            <div
                                                key={oi}
                                                className={`flex items-center gap-3 p-2 rounded-xl border transition-colors ${
                                                    form.correct_option_index === oi
                                                        ? 'bg-indigo-600/20 border-indigo-500'
                                                        : 'bg-slate-900/50 border-white/10'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="correct"
                                                    checked={form.correct_option_index === oi}
                                                    onChange={() => setForm({ ...form, correct_option_index: oi })}
                                                    className="w-4 h-4 text-indigo-600 cursor-pointer"
                                                />
                                                <span className="font-bold text-indigo-400 w-6 shrink-0">{String.fromCharCode(65 + oi)})</span>
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={e => updateOption(oi, e.target.value)}
                                                    className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                                                    placeholder={`${oi + 1}-variant`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Points */}
                                <div className="flex items-center gap-3">
                                    <label className="text-xs text-indigo-400 font-medium">Ball:</label>
                                    <input
                                        type="number"
                                        value={form.points}
                                        onChange={e => setForm({ ...form, points: e.target.value })}
                                        className="w-20 bg-slate-900 border border-white/10 rounded-lg text-center py-1 focus:outline-none focus:border-indigo-500 text-sm"
                                        min="1"
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-400 text-sm">{error}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setModal(null)} className="px-4 py-2 text-white/50 hover:text-white text-sm">
                                    Bekor
                                </button>
                                <button
                                    onClick={handleSaveQuestion}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
