import { useState, useRef, useEffect } from 'react';
import { Reorder } from 'framer-motion';
import { GripVertical, Plus, Trash2, Save, ArrowLeft, Lightbulb, Upload, X, Loader2, Image } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

export default function OlympiadBuilder() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [timeLimit, setTimeLimit] = useState(30);
    const [difficulty, setDifficulty] = useState('medium');
    const [minAge, setMinAge] = useState(4);
    const [maxAge, setMaxAge] = useState(18);

    const [questions, setQuestions] = useState([
        { id: 'q1', text: '', options: ['', '', '', ''], correctOption: 0, points: 5 }
    ]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Banner upload
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerPreview, setBannerPreview] = useState(null);
    const [bannerUploading, setBannerUploading] = useState(false);
    const bannerInputRef = useRef(null);

    useEffect(() => {
        return () => {
            if (bannerPreview) URL.revokeObjectURL(bannerPreview);
        };
    }, [bannerPreview]);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            { id: `q${Date.now()}`, text: '', options: ['', '', '', ''], correctOption: 0, points: 5 }
        ]);
    };

    const removeQuestion = (id) => {
        if (questions.length === 1) return;
        setQuestions(questions.filter(q => q.id !== id));
    };

    const updateQuestion = (id, field, value) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const updateOption = (qId, optIdx, value) => {
        setQuestions(questions.map(q => {
            if (q.id === qId) {
                const newOpts = [...q.options];
                newOpts[optIdx] = value;
                return { ...q, options: newOpts };
            }
            return q;
        }));
    };

    const handleSave = async () => {
        try {
            setError('');
            setSaving(true);
            const adminKey = localStorage.getItem('adminKey');
            if (!adminKey) throw new Error("Admin autentifikatsiya topilmadi. Qaytadan kiring.");

            if (!title || !startDate || !endDate) throw new Error("Asosiy maydonlarni to'ldiring");
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (!q.text) throw new Error(`${i + 1}-savol matni kiritilmagan`);
                if (q.options.some(o => !o)) throw new Error(`${i + 1}-savol variantlari to'liq emas`);
            }

            let bannerUrl = '';
            if (bannerFile) {
                setBannerUploading(true);
                try {
                    const formData = new FormData();
                    formData.append('file', bannerFile);
                    const uploadRes = await apiService.postForm('/upload/admin-file', formData, {
                        headers: {
                            'X-Admin-Key': adminKey,
                            'X-Admin-Role': localStorage.getItem('adminRole') || '',
                        }
                    });
                    bannerUrl = uploadRes.url || '';
                } catch (uploadErr) {
                    throw new Error('Banner yuklashda xatolik: ' + (uploadErr.message || ''));
                } finally {
                    setBannerUploading(false);
                }
            }

            const payload = {
                title,
                description,
                start_date: new Date(startDate).toISOString(),
                end_date: new Date(endDate).toISOString(),
                time_limit_minutes: parseInt(timeLimit) || 30,
                difficulty,
                min_age: parseInt(minAge) || 4,
                max_age: parseInt(maxAge) || 18,
                total_point: questions.reduce((sum, q) => sum + (parseInt(q.points) || 0), 0),
                banner_image: bannerUrl || undefined,
                questions: questions.map((q, idx) => ({
                    question_text: q.text,
                    options: q.options,
                    correct_option_index: parseInt(q.correctOption) || 0,
                    points: parseInt(q.points) || 5,
                    order_index: idx
                }))
            };

            const res = await apiService.post('/olympiad/admin/build', payload, {
                headers: { 'X-Admin-Key': adminKey }
            });

            if (bannerPreview) URL.revokeObjectURL(bannerPreview);

            const olympiadId = res.data?.olympiad_id || res.olympiad_id;
            navigate(`/admin/olympiads/${olympiadId}/edit`);
        } catch (err) {
            setError(err.message || 'Saqlashda xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <Link to="/admin/analytics" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-indigo-400" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">Olimpiada Yaratish (Builder)</h1>
                            <p className="text-indigo-400 text-sm">Drag & Drop orqali savollarni joylashtiring</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || bannerUploading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        {saving || bannerUploading ? (bannerUploading ? 'Banner yuklanmoqda...' : 'Saqlanmoqda...') : <><Save className="w-5 h-5" /> Draft sifatida saqlash</>}
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl">
                        {error}
                    </div>
                )}

                {/* Main Config */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-4">
                        <Lightbulb className="w-5 h-5 text-amber-400" /> Asosiy ma'lumotlar
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-white/70">Olimpiada nomi</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Masalan: Matematika bo'yicha bahorgi turnir"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-white/70">To'liq tavsif</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                                placeholder="Olimpiada haqida batafsil ma'lumot..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Boshlanish vaqti</label>
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Tugash vaqti</label>
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Vaqt chegarasi (daqiqa)</label>
                            <input
                                type="number"
                                value={timeLimit}
                                onChange={e => setTimeLimit(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Kichik yosh (Min Age)</label>
                            <input
                                type="number"
                                value={minAge}
                                onChange={e => setMinAge(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                                min="4"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Katta yosh (Max Age)</label>
                            <input
                                type="number"
                                value={maxAge}
                                onChange={e => setMaxAge(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                                min="4"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Qiyinlik darajasi</label>
                            <select
                                value={difficulty}
                                onChange={e => setDifficulty(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                            >
                                <option value="easy">Oson</option>
                                <option value="medium">O'rtacha</option>
                                <option value="hard">Qiyin</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Banner Upload */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 border-b border-white/10 pb-4">
                        <Image className="w-5 h-5 text-emerald-400" /> Olimpiada banneri (ixtiyoriy)
                    </h2>
                    {bannerPreview ? (
                        <div className="relative">
                            <img src={bannerPreview} alt="Banner preview" className="w-full h-48 object-cover rounded-xl border border-white/10" />
                            <button
                                onClick={() => { if (bannerPreview) URL.revokeObjectURL(bannerPreview); setBannerFile(null); setBannerPreview(null); if (bannerInputRef.current) bannerInputRef.current.value = ''; }}
                                className="absolute top-2 right-2 p-1.5 bg-red-600 rounded-full hover:bg-red-700 transition"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-emerald-500 transition bg-slate-900/30">
                            <Upload className="w-8 h-8 text-white/30 mb-2" />
                            <span className="text-sm text-white/40">Banner rasmni yuklash uchun bosing</span>
                            <span className="text-xs text-white/20 mt-1">PNG, JPG, WEBP (max 5MB)</span>
                            <input
                                ref={bannerInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
                                        if (!allowedTypes.includes(file.type)) {
                                            setError('Faqat PNG, JPG, WEBP, GIF rasm formatlari ruxsat etilgan');
                                            e.target.value = '';
                                            return;
                                        }
                                        if (file.size > 5 * 1024 * 1024) {
                                            setError('Fayl hajmi 5MB dan oshmasligi kerak');
                                            e.target.value = '';
                                            return;
                                        }
                                        if (bannerPreview) URL.revokeObjectURL(bannerPreview);
                                        setBannerFile(file);
                                        setBannerPreview(URL.createObjectURL(file));
                                    }
                                }}
                            />
                        </label>
                    )}
                    {bannerUploading && <p className="text-sm text-emerald-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Banner yuklanmoqda...</p>}
                </div>

                {/* Questions Builder */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span>📝</span> Savollar ro'yxati ({questions.length} ta)
                        </h2>
                        <button
                            onClick={addQuestion}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Savol qo'shish
                        </button>
                    </div>

                    <Reorder.Group axis="y" values={questions} onReorder={setQuestions} className="space-y-4">
                        {questions.map((q, idx) => (
                            <Reorder.Item key={q.id} value={q} className="bg-white/5 border border-white/10 rounded-2xl p-5 relative">
                                <div className="absolute left-3 top-6 cursor-grab active:cursor-grabbing text-white/30 hover:text-white/70">
                                    <GripVertical className="w-6 h-6" />
                                </div>
                                <div className="ml-8 space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm text-indigo-400 font-bold">{idx + 1}-Savol matni</label>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-white/50">Ball:</label>
                                                    <input
                                                        type="number"
                                                        value={q.points}
                                                        onChange={e => updateQuestion(q.id, 'points', e.target.value)}
                                                        className="w-16 bg-slate-900 border border-white/10 rounded text-center py-1 focus:outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                            <textarea
                                                value={q.text}
                                                onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                                                rows={2}
                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                                                placeholder="Savolni kiriting..."
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeQuestion(q.id)}
                                            className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors mt-6"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                        {q.options.map((opt, optIdx) => (
                                            <div
                                                key={optIdx}
                                                className={`flex items-center gap-3 p-2 rounded-xl border ${q.correctOption === optIdx ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-900/50 border-white/10 focus-within:border-white/30'} transition-colors`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`correct-${q.id}`}
                                                    checked={q.correctOption === optIdx}
                                                    onChange={() => updateQuestion(q.id, 'correctOption', optIdx)}
                                                    className="w-4 h-4 text-indigo-600 bg-slate-900 border-white/20 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={e => updateOption(q.id, optIdx, e.target.value)}
                                                    className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                                                    placeholder={`${optIdx + 1}-variant`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                </div>
            </div>
        </div>
    );
}
