import { useState } from 'react';
import { Plus, Trash2, Save, X, Layers, Clock, Target, FileText } from 'lucide-react';
import olympiadService from '../services/olympiadService';

const SCOPE_TYPES = [
    { value: 'school', label: "Maktab", emoji: "🏫" },
    { value: 'district', label: "Tuman", emoji: "🏘️" },
    { value: 'region', label: "Viloyat", emoji: "🗺️" },
    { value: 'republic', label: "Respublika", emoji: "🇺🇿" },
];

const CONTENT_TYPES = [
    { value: 'test', label: "Test", icon: "📝" },
    { value: 'reading', label: "O'qish", icon: "📖" },
    { value: 'mixed', label: "Aralash", icon: "📚" },
];

const defaultStage = (num) => ({
    id: Date.now() + num,
    stage_number: num,
    title: `${num}-bosqich`,
    scope_type: SCOPE_TYPES[Math.min(num - 1, 3)]?.value || 'school',
    content_type: 'test',
    start_time: '',
    end_time: '',
    requirements: '',
    passing_percent: 30,
    passing_min_count: 1,
});

export default function MultiStageOlympiadModal({ onClose, onCreated }) {
    const [step, setStep] = useState(1); // 1=asosiy, 2=bosqichlar, 3=tasdiqlash
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Step 1: Asosiy
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [regStart, setRegStart] = useState('');
    const [regEnd, setRegEnd] = useState('');
    const [minAge, setMinAge] = useState(6);
    const [maxAge, setMaxAge] = useState(18);
    const [allowedClasses, setAllowedClasses] = useState([]);

    // Step 2: Bosqichlar
    const [stages, setStages] = useState([defaultStage(1), defaultStage(2)]);

    const addStage = () => {
        if (stages.length >= 5) return;
        setStages([...stages, defaultStage(stages.length + 1)]);
    };

    const removeStage = (idx) => {
        if (stages.length <= 2) return;
        const updated = stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stage_number: i + 1 }));
        setStages(updated);
    };

    const updateStage = (idx, field, value) => {
        setStages(stages.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    };

    const toggleClass = (c) => {
        setAllowedClasses(prev =>
            prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c].sort((a, b) => a - b)
        );
    };

    const handleSave = async () => {
        setError('');
        if (!title) return setError("Olimpiada nomini kiriting");
        if (!regStart || !regEnd) return setError("Ro'yxat vaqtlarini kiriting");
        for (let i = 0; i < stages.length; i++) {
            if (!stages[i].start_time || !stages[i].end_time) {
                return setError(`${i + 1}-bosqich vaqtlarini kiriting`);
            }
        }

        setSaving(true);
        try {
            const adminKey = localStorage.getItem('adminKey');
            if (!adminKey) throw new Error("Admin autentifikatsiya topilmadi");

            const payload = {
                title,
                description,
                registration_start: new Date(regStart).toISOString(),
                registration_end: new Date(regEnd).toISOString(),
                min_age: parseInt(minAge),
                max_age: parseInt(maxAge),
                allowed_classes: allowedClasses.length > 0 ? allowedClasses : null,
                stages: stages.map(s => ({
                    stage_number: s.stage_number,
                    title: s.title,
                    scope_type: s.scope_type,
                    content_type: s.content_type,
                    start_time: new Date(s.start_time).toISOString(),
                    end_time: new Date(s.end_time).toISOString(),
                    requirements: s.requirements || null,
                    passing_percent: parseFloat(s.passing_percent) || 30,
                    passing_min_count: parseInt(s.passing_min_count) || 1,
                })),
            };

            const res = await olympiadService.createMultiStageOlympiad(payload);

            onCreated?.(res);
            onClose();
        } catch (err) {
            setError(err.message || "Saqlashda xatolik");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <Layers className="w-6 h-6 text-indigo-400" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Ko'p bosqichli olimpiada yaratish</h2>
                            <p className="text-sm text-white/50">
                                {step === 1 && "Asosiy ma'lumotlar"}
                                {step === 2 && "Bosqichlar sozlamalari"}
                                {step === 3 && "Tasdiqlash"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition">
                        <X className="w-5 h-5 text-white/50" />
                    </button>
                </div>

                {/* Steps indicator */}
                <div className="flex items-center gap-2 px-6 py-3 bg-white/5">
                    {["Ma'lumotlar", "Bosqichlar", "Tasdiqlash"].map((label, i) => (
                        <button
                            key={i}
                            onClick={() => i + 1 <= step && setStep(i + 1)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                                step === i + 1 ? 'bg-indigo-600 text-white' :
                                i + 1 < step ? 'bg-emerald-600/20 text-emerald-400' :
                                'bg-white/5 text-white/30'
                            }`}
                        >
                            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                                {i + 1 < step ? '✓' : i + 1}
                            </span>
                            {label}
                        </button>
                    ))}
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* STEP 1: Asosiy ma'lumotlar */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">Olimpiada nomi</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Masalan: Respublika Matematika Olimpiadasi 2026" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">Tavsif</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
                                    placeholder="Olimpiada haqida..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/70">Ro'yxat boshlanishi</label>
                                    <input type="datetime-local" value={regStart} onChange={e => setRegStart(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/70">Ro'yxat tugashi</label>
                                    <input type="datetime-local" value={regEnd} onChange={e => setRegEnd(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/70">Min yosh</label>
                                    <input type="number" value={minAge} onChange={e => setMinAge(e.target.value)} min={1}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/70">Max yosh</label>
                                    <input type="number" value={maxAge} onChange={e => setMaxAge(e.target.value)} min={1}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">Sinf kategoriyasi (ixtiyoriy)</label>
                                <div className="flex flex-wrap gap-2">
                                    {[1,2,3,4,5,6,7,8,9,10,11].map(c => (
                                        <button key={c} onClick={() => toggleClass(c)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                                                allowedClasses.includes(c)
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
                                            }`}
                                        >{c}-sinf</button>
                                    ))}
                                </div>
                                <p className="text-xs text-white/30">Tanlanmasa — barcha sinflar uchun ochiq</p>
                            </div>

                            <button onClick={() => setStep(2)}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition">
                                Keyingi: Bosqichlar →
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Bosqichlar */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {stages.map((s, idx) => (
                                <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-white flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm">{s.stage_number}</span>
                                            {s.title}
                                        </h3>
                                        {stages.length > 2 && (
                                            <button onClick={() => removeStage(idx)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/50">Bosqich nomi</label>
                                            <input type="text" value={s.title} onChange={e => updateStage(idx, 'title', e.target.value)}
                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/50">Qamrov</label>
                                            <div className="flex gap-1">
                                                {SCOPE_TYPES.map(st => (
                                                    <button key={st.value} onClick={() => updateStage(idx, 'scope_type', st.value)}
                                                        className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition ${
                                                            s.scope_type === st.value ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                                                        }`}
                                                    >{st.emoji} {st.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/50 flex items-center gap-1"><FileText className="w-3 h-3" /> Kontent turi</label>
                                            <div className="flex gap-1">
                                                {CONTENT_TYPES.map(ct => (
                                                    <button key={ct.value} onClick={() => updateStage(idx, 'content_type', ct.value)}
                                                        className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition ${
                                                            s.content_type === ct.value ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                                                        }`}
                                                    >{ct.icon} {ct.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/50 flex items-center gap-1"><Target className="w-3 h-3" /> O'tish %</label>
                                            <input type="number" value={s.passing_percent} onChange={e => updateStage(idx, 'passing_percent', e.target.value)}
                                                min={1} max={100}
                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/50">Min o'tuvchi</label>
                                            <input type="number" value={s.passing_min_count} onChange={e => updateStage(idx, 'passing_min_count', e.target.value)}
                                                min={1}
                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/50 flex items-center gap-1"><Clock className="w-3 h-3" /> Boshlanishi</label>
                                            <input type="datetime-local" value={s.start_time} onChange={e => updateStage(idx, 'start_time', e.target.value)}
                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-white/50 flex items-center gap-1"><Clock className="w-3 h-3" /> Tugashi</label>
                                            <input type="datetime-local" value={s.end_time} onChange={e => updateStage(idx, 'end_time', e.target.value)}
                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-white/50">Shartlar va talablar</label>
                                        <textarea value={s.requirements} onChange={e => updateStage(idx, 'requirements', e.target.value)} rows={2}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                                            placeholder="Bu bosqich shartlari..." />
                                    </div>
                                </div>
                            ))}

                            {stages.length < 5 && (
                                <button onClick={addStage}
                                    className="w-full py-3 border-2 border-dashed border-white/20 hover:border-indigo-500 rounded-2xl text-white/50 hover:text-indigo-400 transition flex items-center justify-center gap-2">
                                    <Plus className="w-5 h-5" /> Bosqich qo'shish ({stages.length}/5)
                                </button>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => setStep(1)}
                                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition">
                                    ← Orqaga
                                </button>
                                <button onClick={() => setStep(3)}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition">
                                    Tasdiqlash →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Tasdiqlash */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-white/5 rounded-2xl p-5 space-y-3 border border-white/10">
                                <h3 className="font-bold text-white text-lg">{title || "Nomsiz"}</h3>
                                {description && <p className="text-white/50 text-sm">{description}</p>}
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-white/50">Ro'yxat: <span className="text-white">{regStart ? new Date(regStart).toLocaleString('uz') : '—'}</span></div>
                                    <div className="text-white/50">Tugash: <span className="text-white">{regEnd ? new Date(regEnd).toLocaleString('uz') : '—'}</span></div>
                                    <div className="text-white/50">Yosh: <span className="text-white">{minAge}-{maxAge}</span></div>
                                    <div className="text-white/50">Sinflar: <span className="text-white">{allowedClasses.length ? allowedClasses.join(', ') : 'Barchasi'}</span></div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-white font-bold">Bosqichlar ({stages.length})</h4>
                                {stages.map(s => (
                                    <div key={s.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                        <span className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">{s.stage_number}</span>
                                        <div className="flex-1">
                                            <p className="text-white font-medium text-sm">{s.title}</p>
                                            <p className="text-white/40 text-xs">
                                                {SCOPE_TYPES.find(x => x.value === s.scope_type)?.label} •{' '}
                                                {CONTENT_TYPES.find(x => x.value === s.content_type)?.label} •{' '}
                                                Top {s.passing_percent}%
                                            </p>
                                        </div>
                                        <span className="text-xs text-white/30">
                                            {s.start_time ? new Date(s.start_time).toLocaleDateString('uz') : '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep(2)}
                                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition">
                                    ← Orqaga
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50">
                                    <Save className="w-5 h-5" />
                                    {saving ? "Saqlanmoqda..." : "Yaratish"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
