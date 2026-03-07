import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, X, Book, Pencil, Image, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import readingService from '../services/readingService';

export default function ReadingAdmin() {
    const [tab, setTab] = useState('competitions');
    const [competitions, setCompetitions] = useState([]);
    const [tasks, setTasks] = useState({}); // compId -> tasks[]
    const [selectedCompId, setSelectedCompId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Modal states
    const [createModal, setCreateModal] = useState(null); // 'competition' | 'task' | 'edit_comp' | 'edit_task'
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadImage, setUploadImage] = useState(null);

    const [compForm, setCompForm] = useState({
        title: '', description: '', week_number: 1, year: 2024, grade_level: '', language: 'uz',
        start_date: '', end_date: '', status: 'draft'
    });

    const [taskForm, setTaskForm] = useState({
        title: '', story_text: '', day_of_week: 'monday', time_limit_seconds: 120, order_index: 0
    });
    const [taskQuestions, setTaskQuestions] = useState([]); // [{question:'',answer:''}]

    const [editComp, setEditComp] = useState(null);
    const [editTask, setEditTask] = useState(null);

    useEffect(() => { loadCompetitions(); }, []);

    const loadCompetitions = async () => {
        try {
            setLoading(true);
            const res = await readingService.getAdminCompetitions();
            setCompetitions(res.competitions || []);
            if (res.competitions?.length > 0 && !selectedCompId) {
                setSelectedCompId(res.competitions[0].id);
                loadTasks(res.competitions[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadTasks = async (compId) => {
        try {
            // Frontend reads comp detail to get tasks
            const res = await readingService.getCompetition(compId);
            setTasks(prev => ({ ...prev, [compId]: res.tasks || [] }));
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateCompetition = async () => {
        try {
            setSaving(true); setError('');
            await readingService.createCompetition(compForm);
            setCreateModal(null);
            setCompForm({ title: '', description: '', week_number: 1, year: 2024, grade_level: '', language: 'uz', start_date: '', end_date: '', status: 'draft' });
            loadCompetitions();
        } catch (err) {
            setError(err.message || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateCompetition = async () => {
        if (!editComp) return;
        try {
            setSaving(true); setError('');
            await readingService.updateCompetition(editComp.id, compForm);
            setCreateModal(null);
            setEditComp(null);
            loadCompetitions();
        } catch (err) {
            setError(err.message || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCompetition = async (id) => {
        if (!confirm("Musobaqani o'chirmoqchimisiz? Barcha ma'lumotlar o'chadi.")) return;
        try {
            await readingService.deleteCompetition(id);
            if (selectedCompId === id) setSelectedCompId(null);
            loadCompetitions();
        } catch (err) {
            alert(err.message || 'Xatolik');
        }
    };

    const handleCreateTask = async () => {
        if (!selectedCompId) return;
        try {
            setSaving(true); setError('');

            const payload = {
                ...taskForm,
                time_limit_seconds: parseInt(taskForm.time_limit_seconds || 120),
                order_index: parseInt(taskForm.order_index || 0),
                questions: taskQuestions.filter(q => q.question.trim() && q.answer.trim())
            };

            if (uploadImage) {
                const imgRes = await readingService.uploadFile(uploadImage);
                if (imgRes.url) payload.image_url = imgRes.url;
            }

            // Not using audio upload payload as Azure TTS generates audio dynamically
            // but left structured similar to ertaklar if custom audio is needed

            await readingService.createTask(selectedCompId, payload);
            setCreateModal(null);
            resetTaskForm();
            loadTasks(selectedCompId);
        } catch (err) {
            setError(err.message || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const resetTaskForm = () => {
        setTaskForm({ title: '', story_text: '', day_of_week: 'monday', time_limit_seconds: 120, order_index: 0 });
        setTaskQuestions([]);
        setUploadImage(null);
        setUploadFile(null);
        setEditTask(null);
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm("Vazifani o'chirmoqchimisiz?")) return;
        try {
            await readingService.deleteTask(taskId);
            if (selectedCompId) loadTasks(selectedCompId);
        } catch (err) {
            alert(err.message || 'Xatolik');
        }
    };

    const addQuestion = () => setTaskQuestions(prev => [...prev, { question: '', answer: '' }]);
    const removeQuestion = (i) => setTaskQuestions(prev => prev.filter((_, idx) => idx !== i));
    const updateQuestion = (i, field, val) => setTaskQuestions(prev =>
        prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q)
    );

    const openEditComp = (comp) => {
        setEditComp(comp);
        setCompForm({
            title: comp.title || '',
            description: comp.description || '',
            week_number: comp.week_number || 1,
            year: comp.year || 2024,
            grade_level: comp.grade_level || '',
            language: comp.language || 'uz',
            start_date: comp.start_date ? comp.start_date.substring(0, 10) : '',
            end_date: comp.end_date ? comp.end_date.substring(0, 10) : '',
            status: comp.status || 'draft'
        });
        setCreateModal('edit_comp');
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">O'qish Musobaqalari (Admin)</h1>
                        <p className="text-slate-400 text-sm">Haftalik o'qish musobaqalari va hikoyalarni boshqarish</p>
                    </div>
                    <button
                        onClick={() => { setEditComp(null); setCompForm({ title: '', description: '', week_number: 1, year: 2024, grade_level: '', language: 'uz', start_date: '', end_date: '', status: 'draft' }); setCreateModal('competition'); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Yangi musobaqa
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Competitions List */}
                    <div className="lg:col-span-1 border border-white/10 rounded-2xl bg-white/5 overflow-hidden flex flex-col h-[75vh]">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <h2 className="text-white font-semibold">Musobaqalar ({competitions.length})</h2>
                        </div>
                        <div className="p-2 overflow-y-auto flex-1 space-y-1">
                            {competitions.map((c) => (
                                <div
                                    key={c.id}
                                    onClick={() => { setSelectedCompId(c.id); loadTasks(c.id); }}
                                    className={`p-3 rounded-xl cursor-pointer transition-colors ${selectedCompId === c.id ? 'bg-indigo-600 border border-indigo-500 shadow-md shadow-indigo-600/20' : 'hover:bg-white/5 border border-transparent'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-white font-medium text-sm line-clamp-1">{c.title}</h3>
                                            <p className={`text-xs ${selectedCompId === c.id ? 'text-indigo-200' : 'text-slate-400'} mt-1`}>
                                                Hafta: {c.week_number}/{c.year} • {c.tasks_count} vazifa
                                            </p>
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                            <button onClick={(e) => { e.stopPropagation(); openEditComp(c); }} className={`p-1.5 rounded-lg ${selectedCompId === c.id ? 'hover:bg-indigo-500' : 'text-slate-500 hover:bg-white/10 hover:text-white'}`}><Pencil className="w-3.5 h-3.5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteCompetition(c.id); }} className={`p-1.5 rounded-lg ${selectedCompId === c.id ? 'hover:bg-indigo-500' : 'text-slate-500 hover:bg-white/10 hover:text-red-400'}`}><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>{c.status}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full bg-black/20 ${selectedCompId === c.id ? 'text-white' : 'text-slate-400'}`}>{c.language}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tasks List */}
                    <div className="lg:col-span-2 border border-white/10 rounded-2xl bg-white/5 flex flex-col h-[75vh]">
                        {selectedCompId ? (
                            <>
                                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                                    <h2 className="text-white font-semibold">Vazifalar / Hikoyalar ({(tasks[selectedCompId] || []).length})</h2>
                                    <button
                                        onClick={() => { resetTaskForm(); setCreateModal('task'); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Hikoya qo'shish
                                    </button>
                                </div>
                                <div className="p-4 overflow-y-auto flex-1 space-y-3">
                                    {(tasks[selectedCompId] || []).length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                            <BookOpen className="w-12 h-12 mb-3 opacity-20" />
                                            <p>Vazifalar yozilmagan</p>
                                        </div>
                                    ) : (
                                        (tasks[selectedCompId] || []).map((t, idx) => (
                                            <div key={t.id} className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 flex gap-4 items-start hover:border-indigo-500/30 transition-colors">
                                                {t.image_url ? (
                                                    <img src={t.image_url} className="w-16 h-16 rounded-lg object-cover bg-slate-800" />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                                        <Book className="w-6 h-6 text-indigo-400" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h3 className="text-white font-medium truncate">{t.title}</h3>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button onClick={() => handleDeleteTask(t.id)} className="p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400 rounded"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-400 text-xs mt-1 bg-slate-800 w-fit px-2 py-0.5 rounded">{t.day_of_week}</p>
                                                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                                        <span>{t.total_words} so'z</span>
                                                        <span>{t.time_limit_seconds} sek</span>
                                                        <span className="text-emerald-400">{t.questions_count} savol</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">Chap ustundan musobaqa tanlang</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {(createModal === 'competition' || createModal === 'edit_comp') && (
                <Modal title={createModal === 'competition' ? "Yangi musobaqa yaratish" : "Musobaqani tahrirlash"} onClose={() => setCreateModal(null)}>
                    <div className="space-y-3">
                        <Input label="Nomi *" value={compForm.title} onChange={v => setCompForm({ ...compForm, title: v })} />
                        <Input label="Ta'rif" value={compForm.description} onChange={v => setCompForm({ ...compForm, description: v })} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Hafta raqami" type="number" value={compForm.week_number} onChange={v => setCompForm({ ...compForm, week_number: parseInt(v) })} />
                            <Input label="Yil" type="number" value={compForm.year} onChange={v => setCompForm({ ...compForm, year: parseInt(v) })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Select label="Til" value={compForm.language} options={['uz', 'ru', 'en']} onChange={v => setCompForm({ ...compForm, language: v })} />
                            <Input label="Sinf (ixtiyoriy)" value={compForm.grade_level} onChange={v => setCompForm({ ...compForm, grade_level: v })} placeholder="M-n: 1-sinf" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Boshlanish" type="date" value={compForm.start_date} onChange={v => setCompForm({ ...compForm, start_date: v })} />
                            <Input label="Tugash" type="date" value={compForm.end_date} onChange={v => setCompForm({ ...compForm, end_date: v })} />
                        </div>
                        <Select label="Holat" value={compForm.status} options={['draft', 'active', 'scoring', 'completed']} onChange={v => setCompForm({ ...compForm, status: v })} />
                    </div>
                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setCreateModal(null)} className="px-4 py-2 text-slate-400 text-sm">Bekor</button>
                        <button onClick={createModal === 'competition' ? handleCreateCompetition : handleUpdateCompetition} disabled={saving || !compForm.title} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                    </div>
                </Modal>
            )}

            {createModal === 'task' && (
                <Modal title="Yangi hikoya / vazifa qo'shish" onClose={() => setCreateModal(null)}>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Select label="Hafta kuni" value={taskForm.day_of_week} options={['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']} onChange={v => setTaskForm({ ...taskForm, day_of_week: v })} />
                            <Input label="Tartib (Index)" type="number" value={taskForm.order_index} onChange={v => setTaskForm({ ...taskForm, order_index: v })} />
                        </div>
                        <Input label="Hikoya nomi *" value={taskForm.title} onChange={v => setTaskForm({ ...taskForm, title: v })} />
                        <div>
                            <label className="text-slate-400 text-xs mb-1 block">Matni (Ertak) *</label>
                            <textarea
                                value={taskForm.story_text}
                                onChange={(e) => setTaskForm({ ...taskForm, story_text: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                                placeholder="Hikoya matnini yozing..."
                            />
                        </div>
                        <Input label="Vaqt chegarasi (soniya)" type="number" value={taskForm.time_limit_seconds} onChange={v => setTaskForm({ ...taskForm, time_limit_seconds: v })} />

                        {/* ── Savollar bo'limi ── */}
                        <div className="border border-dashed border-slate-700 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-white text-sm font-semibold">❓ Savollar (Voice Quiz)</p>
                                <button
                                    onClick={addQuestion}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-medium transition-colors border border-indigo-500/30"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Savol qo'shish
                                </button>
                            </div>

                            {taskQuestions.length === 0 ? (
                                <p className="text-slate-500 text-xs text-center py-2">O'qib bo'lingach, STT orqali javob beriladigan savollar.</p>
                            ) : (
                                <div className="space-y-3">
                                    {taskQuestions.map((q, i) => (
                                        <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 space-y-2 relative">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 text-xs font-medium">{i + 1}-savol</span>
                                                <button onClick={() => removeQuestion(i)} className="text-slate-500 hover:text-red-400 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={q.question}
                                                onChange={e => updateQuestion(i, 'question', e.target.value)}
                                                placeholder="Savol matni (Ovoz qilib o'qib eshittiriladi)..."
                                                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                                            />
                                            <input
                                                type="text"
                                                value={q.answer}
                                                onChange={e => updateQuestion(i, 'answer', e.target.value)}
                                                placeholder="To'g'ri javob matni (Solishtirish uchun)..."
                                                className="w-full px-3 py-1.5 bg-emerald-900/10 border border-emerald-900 rounded-lg text-emerald-300 text-xs focus:outline-none focus:border-emerald-500 placeholder-emerald-900/50"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-slate-400 text-xs mb-1 block">Muqova rasmi (Cover Image - Ixtiyoriy)</label>
                            <input type="file" accept="image/*" onChange={(e) => setUploadImage(e.target.files[0] || null)} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700" />
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => { setCreateModal(null); resetTaskForm(); }} className="px-4 py-2 text-slate-400 text-sm">Bekor</button>
                        <button onClick={handleCreateTask} disabled={saving || !taskForm.title || !taskForm.story_text} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                            {saving ? 'Yaratilmoqda...' : 'Yaratish'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// Reusable components
const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {children}
        </div>
    </div>
);

const Input = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div>
        <label className="text-slate-400 text-xs mb-1 block">{label}</label>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600" />
    </div>
);

const Select = ({ label, value, options, onChange }) => (
    <div>
        <label className="text-slate-400 text-xs mb-1 block">{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);
