import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, X, Book, Globe, Pencil, Video, Paperclip } from 'lucide-react';
import adminService from '../../services/adminService';

export default function ContentPage() {
    const [tab, setTab] = useState('lessons');
    const [lessons, setLessons] = useState([]);
    const [ertaklar, setErtaklar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(null); // 'lesson' | 'ertak'
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [platformContent, setPlatformContent] = useState({});
    const [rawJsonText, setRawJsonText] = useState('{}');

    const [lessonForm, setLessonForm] = useState({ title: '', subject: '', content: '', grade_level: '', language: 'uz', video_url: '' });
    const [ertakForm, setErtakForm] = useState({ title: '', content: '', language: 'uz', age_group: '6-8' });
    const [ertakQuestions, setErtakQuestions] = useState([]); // [{question:'',answer:''}]
    const [uploadFile, setUploadFile] = useState(null);
    const [editLesson, setEditLesson] = useState(null); // lesson object to edit
    const [editForm, setEditForm] = useState({ title: '', subject: '', content: '', grade_level: '', language: 'uz', video_url: '' });

    useEffect(() => { loadContent(); }, []);

    const loadContent = async () => {
        try {
            setLoading(true);
            const [lessRes, ertRes, pcRes] = await Promise.allSettled([
                adminService.getLessons(),
                adminService.getErtaklar(),
                adminService.getPublicContent()
            ]);
            if (lessRes.status === 'fulfilled') {
                const ld = lessRes.value.data?.lessons || lessRes.value.data;
                setLessons(Array.isArray(ld) ? ld : []);
            }
            if (ertRes.status === 'fulfilled') {
                const ed = ertRes.value.data?.ertaklar || ertRes.value.data;
                setErtaklar(Array.isArray(ed) ? ed : []);
            }
            if (pcRes.status === 'fulfilled') {
                const data = pcRes.value.data?.data || {};
                setPlatformContent(data);
                setRawJsonText(JSON.stringify(data, null, 2));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLesson = async () => {
        try {
            setSaving(true);
            setError('');

            const payload = { ...lessonForm };
            if (uploadFile) {
                const upRes = await adminService.uploadFile(uploadFile);
                if (upRes.data?.url) {
                    payload.attachments = [{
                        name: uploadFile.name,
                        url: upRes.data.url,
                        size: upRes.data.size || uploadFile.size
                    }];
                }
            }

            await adminService.createLesson(payload);
            setCreateModal(null);
            setLessonForm({ title: '', subject: '', content: '', grade_level: '', language: 'uz', video_url: '' });
            setUploadFile(null);
            loadContent();
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateErtak = async () => {
        try {
            setSaving(true);
            setError('');

            const payload = {
                ...ertakForm,
                questions: ertakQuestions.filter(q => q.question.trim() && q.answer.trim())
            };
            if (uploadFile) {
                const upRes = await adminService.uploadFile(uploadFile);
                if (upRes.data?.url) {
                    payload.attachments = [{
                        name: uploadFile.name,
                        url: upRes.data.url,
                        size: upRes.data.size || uploadFile.size
                    }];
                }
            }

            await adminService.createErtak(payload);
            setCreateModal(null);
            setErtakForm({ title: '', content: '', language: 'uz', age_group: '6-8' });
            setErtakQuestions([]);
            setUploadFile(null);
            loadContent();
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const addQuestion = () => setErtakQuestions(prev => [...prev, { question: '', answer: '' }]);
    const removeQuestion = (i) => setErtakQuestions(prev => prev.filter((_, idx) => idx !== i));
    const updateQuestion = (i, field, val) => setErtakQuestions(prev =>
        prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q)
    );

    const handleEditLesson = (lesson) => {
        setEditLesson(lesson);
        setEditForm({
            title: lesson.title || '',
            subject: lesson.subject || '',
            content: lesson.content || '',
            grade_level: lesson.grade_level || '',
            language: lesson.language || 'uz',
            video_url: lesson.video_url || '',
        });
    };

    const handleUpdateLesson = async () => {
        if (!editLesson) return;
        try {
            setSaving(true);
            setError('');
            const payload = { ...editForm };
            if (uploadFile) {
                const upRes = await adminService.uploadFile(uploadFile);
                if (upRes.data?.url) {
                    payload.attachments = [
                        ...(editLesson.attachments || []),
                        { name: uploadFile.name, url: upRes.data.url, size: upRes.data.size || uploadFile.size }
                    ];
                }
            }
            await adminService.updateLesson(editLesson.id, payload);
            setEditLesson(null);
            setUploadFile(null);
            loadContent();
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLesson = async (id) => {
        if (!confirm("Darsni o'chirmoqchimisiz?")) return;
        try {
            await adminService.deleteLesson(id);
            loadContent();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        }
    };

    const handleDeleteErtak = async (id) => {
        if (!confirm("Ertakni o'chirmoqchimisiz?")) return;
        try {
            await adminService.deleteErtak(id);
            loadContent();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Kontentlar</h1>
                    <p className="text-gray-500 text-sm">Darslar va ertaklar boshqaruvi</p>
                </div>
                <button
                    onClick={() => setCreateModal(tab === 'lessons' ? 'lesson' : 'ertak')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Yangi {tab === 'lessons' ? 'dars' : 'ertak'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {[
                    { key: 'lessons', label: 'Darslar', icon: BookOpen, count: lessons.length },
                    { key: 'ertaklar', label: 'Ertaklar', icon: Book, count: ertaklar.length },
                    { key: 'platform', label: 'Sayt Kontenti', icon: Globe, count: Object.keys(platformContent).length },
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-gray-400 bg-gray-900 border border-gray-800 hover:text-white'
                            }`}
                    >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                        <span className="text-xs opacity-50">({t.count})</span>
                    </button>
                ))}
            </div>

            {/* Lessons List */}
            {tab === 'lessons' && (
                <div className="space-y-3">
                    {lessons.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">Darslar yo'q</div>
                    ) : lessons.map(l => (
                        <div key={l.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                                    <BookOpen className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-white font-medium truncate">{l.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{l.subject}</span>
                                        {l.grade_level && <span>• {l.grade_level}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {l.video_url && <a href={l.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"><Video size={12} /> Video</a>}
                                        {l.attachments && l.attachments.length > 0 && l.attachments.map((att, i) => (
                                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1"><Paperclip size={12} /> {att.name || `Fayl ${i + 1}`}</a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => handleEditLesson(l)} className="p-2 text-gray-500 hover:text-blue-400"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteLesson(l.id)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Ertaklar List */}
            {tab === 'ertaklar' && (
                <div className="space-y-3">
                    {ertaklar.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">Ertaklar yo'q</div>
                    ) : ertaklar.map(e => (
                        <div key={e.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
                                    <Book className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-white font-medium truncate">{e.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{e.language}</span>
                                        <span>• {e.age_group}</span>
                                        {e.has_audio && <span>• 🔊 Audio</span>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteErtak(e.id)} className="p-2 text-gray-500 hover:text-red-400 shrink-0"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            )}

            {/* Platform Content */}
            {tab === 'platform' && (
                <div className="space-y-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-white font-medium text-lg">Umumiy ma'lumotlar (JSON formati)</h3>
                                <p className="text-gray-500 text-sm mt-1">Bu yerdagi o'zgarishlar asosiy landing sahifasida ko'rinadi.</p>
                            </div>
                        </div>
                        <textarea
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-4 mb-4 min-h-[400px] font-mono text-sm leading-relaxed focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={rawJsonText}
                            onChange={(e) => setRawJsonText(e.target.value)}
                            spellCheck={false}
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={async () => {
                                    try {
                                        const parsed = JSON.parse(rawJsonText);
                                        setSaving(true);
                                        for (const [key, val] of Object.entries(parsed)) {
                                            await adminService.updatePlatformContent(key, { value: val });
                                        }
                                        alert("Kontent muvaffaqiyatli saqlandi!");
                                        loadContent();
                                    } catch (err) {
                                        alert("JSON formatida xatolik bor!");
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-emerald-700 transition-colors flex items-center gap-2">
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                {saving ? "Saqlanmoqda..." : "Saqlash"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Lesson Modal */}
            {createModal === 'lesson' && (
                <Modal title="Yangi dars yaratish" onClose={() => setCreateModal(null)}>
                    <div className="space-y-3">
                        <Input label="Nomi *" value={lessonForm.title} onChange={(v) => setLessonForm({ ...lessonForm, title: v })} />
                        <Input label="Fan *" value={lessonForm.subject} onChange={(v) => setLessonForm({ ...lessonForm, subject: v })} placeholder="Matematika, Ingliz tili..." />
                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Mazmuni *</label>
                            <textarea
                                value={lessonForm.content}
                                onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                                rows={5}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                                placeholder="Dars mazmunini yozing..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Sinf" value={lessonForm.grade_level} onChange={(v) => setLessonForm({ ...lessonForm, grade_level: v })} placeholder="5-sinf, 9-A, 11-B..." />
                            <Select label="Til" value={lessonForm.language} options={['uz', 'ru', 'en']} onChange={(v) => setLessonForm({ ...lessonForm, language: v })} />
                        </div>
                        <Input label="Video URL (ixtiyoriy)" value={lessonForm.video_url} onChange={(v) => setLessonForm({ ...lessonForm, video_url: v })} placeholder="YouTube yoki Vimeo havola" />
                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Fayl / Material yuklash (Ixtiyoriy)</label>
                            <input type="file" onChange={(e) => setUploadFile(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white" />
                            {uploadFile && <p className="text-gray-500 text-xs mt-1">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</p>}
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setCreateModal(null)} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                        <button onClick={handleCreateLesson} disabled={saving || !lessonForm.title || !lessonForm.subject || !lessonForm.content} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                            {saving ? 'Yaratilmoqda...' : 'Yaratish'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Edit Lesson Modal */}
            {editLesson && (
                <Modal title={`Darsni tahrirlash: ${editLesson.title}`} onClose={() => { setEditLesson(null); setUploadFile(null); }}>
                    <div className="space-y-3">
                        <Input label="Nomi *" value={editForm.title} onChange={(v) => setEditForm({ ...editForm, title: v })} />
                        <Input label="Fan" value={editForm.subject} onChange={(v) => setEditForm({ ...editForm, subject: v })} placeholder="Matematika, Ingliz tili..." />
                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Mazmuni</label>
                            <textarea
                                value={editForm.content}
                                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Sinf" value={editForm.grade_level} onChange={(v) => setEditForm({ ...editForm, grade_level: v })} />
                            <Select label="Til" value={editForm.language} options={['uz', 'ru', 'en']} onChange={(v) => setEditForm({ ...editForm, language: v })} />
                        </div>
                        <Input label="Video URL" value={editForm.video_url} onChange={(v) => setEditForm({ ...editForm, video_url: v })} />
                        {editLesson.attachments?.length > 0 && (
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Mavjud fayllar</label>
                                <div className="flex flex-wrap gap-2">
                                    {editLesson.attachments.map((att, i) => (
                                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1"><Paperclip size={12} /> {att.name}</a>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Yangi fayl qo'shish (Ixtiyoriy)</label>
                            <input type="file" onChange={(e) => setUploadFile(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white" />
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => { setEditLesson(null); setUploadFile(null); }} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                        <button onClick={handleUpdateLesson} disabled={saving || !editForm.title} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Create Ertak Modal */}
            {createModal === 'ertak' && (
                <Modal title="Yangi ertak yaratish" onClose={() => setCreateModal(null)}>
                    <div className="space-y-3">
                        <Input label="Nomi *" value={ertakForm.title} onChange={(v) => setErtakForm({ ...ertakForm, title: v })} />
                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Mazmuni *</label>
                            <textarea
                                value={ertakForm.content}
                                onChange={(e) => setErtakForm({ ...ertakForm, content: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                                placeholder="Ertak mazmunini yozing..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Select label="Til" value={ertakForm.language} options={['uz', 'ru', 'en']} onChange={(v) => setErtakForm({ ...ertakForm, language: v })} />
                            <Select label="Yosh guruhi" value={ertakForm.age_group} options={['4-6', '6-8', '8-10', '10-12']} onChange={(v) => setErtakForm({ ...ertakForm, age_group: v })} />
                        </div>

                        {/* ── Savollar bo'limi ── */}
                        <div className="border border-dashed border-gray-600 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-white text-sm font-semibold">❓ Savollar (Quiz)</p>
                                <button
                                    onClick={addQuestion}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Savol qo'shish
                                </button>
                            </div>

                            {ertakQuestions.length === 0 ? (
                                <p className="text-gray-500 text-xs text-center py-2">Hali savol qo'shilmagan. "Savol qo'shish" tugmasini bosing.</p>
                            ) : (
                                <div className="space-y-3">
                                    {ertakQuestions.map((q, i) => (
                                        <div key={i} className="bg-gray-800/60 rounded-xl p-3 space-y-2 relative">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-xs font-medium">{i + 1}-savol</span>
                                                <button onClick={() => removeQuestion(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={q.question}
                                                onChange={e => updateQuestion(i, 'question', e.target.value)}
                                                placeholder="Savol matni..."
                                                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                            />
                                            <input
                                                type="text"
                                                value={q.answer}
                                                onChange={e => updateQuestion(i, 'answer', e.target.value)}
                                                placeholder="To'g'ri javob..."
                                                className="w-full px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/40 rounded-lg text-emerald-300 text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Audio / Fayl yuklash (Ixtiyoriy)</label>
                            <input type="file" onChange={(e) => setUploadFile(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white" />
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setCreateModal(null)} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                        <button onClick={handleCreateErtak} disabled={saving || !ertakForm.title || !ertakForm.content} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {children}
        </div>
    </div>
);

const Input = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div>
        <label className="text-gray-400 text-xs mb-1 block">{label}</label>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-gray-600" />
    </div>
);

const Select = ({ label, value, options, onChange }) => (
    <div>
        <label className="text-gray-400 text-xs mb-1 block">{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);
