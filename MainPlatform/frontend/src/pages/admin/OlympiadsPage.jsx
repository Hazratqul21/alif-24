import { useState, useEffect, useCallback } from 'react';
import { Trophy, Plus, Trash2, X, Eye, Users, Clock, BookOpen, Mic, CheckCircle, Play, Pause, ChevronRight, BarChart3, FileText, AlertCircle } from 'lucide-react';
import olympiadService from '../../services/olympiadService';

export default function OlympiadsPage() {
    const [activeView, setActiveView] = useState('list'); // list, detail, create, grading
    const [olympiads, setOlympiads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOlympiad, setSelectedOlympiad] = useState(null);
    const [stats, setStats] = useState(null);
    const [notification, setNotification] = useState(null);

    // Questions
    const [questions, setQuestions] = useState([]);
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [qForm, setQForm] = useState({ question_text: '', options: ['', '', '', ''], correct_answer: 0, points: 5 });

    // Reading tasks
    const [readingTasks, setReadingTasks] = useState([]);
    const [showAddReading, setShowAddReading] = useState(false);
    const [rtForm, setRtForm] = useState({ title: '', text_content: '', difficulty: 'medium', time_limit_seconds: 300, comprehension_questions: [] });
    const [compQ, setCompQ] = useState({ question: '', options: ['', '', '', ''], correct: 0 });

    // Participants & grading
    const [participants, setParticipants] = useState([]);
    const [readingSubmissions, setReadingSubmissions] = useState([]);
    const [gradeForm, setGradeForm] = useState({ pronunciation_score: 5, fluency_score: 5, accuracy_score: 5, notes: '' });
    const [gradingSubmission, setGradingSubmission] = useState(null);
    const [audioPlaying, setAudioPlaying] = useState(null);

    // Create form
    const [createForm, setCreateForm] = useState({
        title: '', description: '', subject: 'general', type: 'test',
        min_age: 4, max_age: 18, grade_level: '',
        registration_start: '', registration_end: '', start_time: '', end_time: '',
        duration_minutes: 30, max_participants: 500, questions_count: 20, results_public: true,
    });

    const notify = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchOlympiads = useCallback(async () => {
        try {
            setLoading(true);
            const res = await olympiadService.listOlympiads();
            setOlympiads(res.olympiads || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchOlympiads(); }, [fetchOlympiads]);

    const fetchDetail = async (id) => {
        try {
            const [oRes, qRes, rtRes, pRes, sRes] = await Promise.allSettled([
                olympiadService.getOlympiad(id),
                olympiadService.listQuestions(id),
                olympiadService.listReadingTasks(id),
                olympiadService.getParticipants(id),
                olympiadService.getOlympiadStats(id),
            ]);
            if (oRes.status === 'fulfilled') setSelectedOlympiad(oRes.value.olympiad || oRes.value);
            if (qRes.status === 'fulfilled') setQuestions(qRes.value.questions || []);
            if (rtRes.status === 'fulfilled') setReadingTasks(rtRes.value.reading_tasks || []);
            if (pRes.status === 'fulfilled') setParticipants(pRes.value.participants || []);
            if (sRes.status === 'fulfilled') setStats(sRes.value.stats || null);
        } catch (e) { console.error(e); }
    };

    const handleCreate = async () => {
        if (!createForm.title || !createForm.registration_start || !createForm.start_time) {
            return notify('error', 'Sarlavha, ro\'yxatdan o\'tish va boshlanish sanasi kerak');
        }
        try {
            await olympiadService.createOlympiad(createForm);
            notify('success', 'Olimpiada yaratildi!');
            setActiveView('list');
            fetchOlympiads();
            setCreateForm({ title: '', description: '', subject: 'general', type: 'test', min_age: 4, max_age: 18, grade_level: '', registration_start: '', registration_end: '', start_time: '', end_time: '', duration_minutes: 30, max_participants: 500, questions_count: 20, results_public: true });
        } catch (e) { notify('error', e.message || 'Xatolik'); }
    };

    const handleAddQuestion = async () => {
        if (!qForm.question_text || qForm.options.some(o => !o.trim())) {
            return notify('error', 'Savol va barcha variantlarni to\'ldiring');
        }
        try {
            await olympiadService.addQuestion(selectedOlympiad.id, {
                ...qForm, options: qForm.options.filter(o => o.trim()),
            });
            notify('success', 'Savol qo\'shildi');
            setShowAddQuestion(false);
            setQForm({ question_text: '', options: ['', '', '', ''], correct_answer: 0, points: 5 });
            const res = await olympiadService.listQuestions(selectedOlympiad.id);
            setQuestions(res.questions || []);
        } catch (e) { notify('error', e.message || 'Xatolik'); }
    };

    const handleAddReadingTask = async () => {
        if (!rtForm.title || !rtForm.text_content) {
            return notify('error', 'Sarlavha va matn kerak');
        }
        try {
            await olympiadService.addReadingTask(selectedOlympiad.id, rtForm);
            notify('success', 'O\'qish vazifasi qo\'shildi');
            setShowAddReading(false);
            setRtForm({ title: '', text_content: '', difficulty: 'medium', time_limit_seconds: 300, comprehension_questions: [] });
            const res = await olympiadService.listReadingTasks(selectedOlympiad.id);
            setReadingTasks(res.reading_tasks || []);
        } catch (e) { notify('error', e.message || 'Xatolik'); }
    };

    const handleGrade = async () => {
        if (!gradingSubmission) return;
        try {
            await olympiadService.gradeReading(gradingSubmission.submission_id, gradeForm);
            notify('success', 'Baholandi!');
            setGradingSubmission(null);
            // Refresh submissions
            const res = await olympiadService.getReadingSubmissions(selectedOlympiad.id);
            setReadingSubmissions(res.submissions || []);
        } catch (e) { notify('error', e.message || 'Xatolik'); }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await olympiadService.updateOlympiad(id, { status: newStatus });
            notify('success', `Status: ${newStatus}`);
            fetchOlympiads();
            if (selectedOlympiad?.id === id) fetchDetail(id);
        } catch (e) { notify('error', e.message || 'Xatolik'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Olimpiadani o\'chirmoqchimisiz?')) return;
        try {
            await olympiadService.deleteOlympiad(id);
            notify('success', 'O\'chirildi');
            setActiveView('list');
            fetchOlympiads();
        } catch (e) { notify('error', e.message || 'Xatolik'); }
    };

    const fetchReadingSubs = async (id) => {
        try {
            const res = await olympiadService.getReadingSubmissions(id);
            setReadingSubmissions(res.submissions || []);
        } catch (e) { console.error(e); }
    };

    const statusColors = {
        draft: 'bg-gray-500/20 text-gray-400',
        upcoming: 'bg-blue-500/20 text-blue-400',
        active: 'bg-green-500/20 text-green-400',
        finished: 'bg-purple-500/20 text-purple-400',
        cancelled: 'bg-red-500/20 text-red-400',
    };

    const typeLabels = { test: '📝 Test', reading: '📖 O\'qish', mixed: '🔄 Aralash' };

    // ======================== RENDER: LIST ========================
    const renderList = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Trophy className="text-amber-400" /> Olimpiadalar</h1>
                <button onClick={() => setActiveView('create')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium text-sm">
                    <Plus size={18} /> Yangi olimpiada
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>
            ) : olympiads.length === 0 ? (
                <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-12 text-center">
                    <Trophy size={48} className="mx-auto mb-3 text-gray-600" />
                    <p className="text-gray-500">Hozircha olimpiadalar yo'q</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {olympiads.map(o => (
                        <div key={o.id} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 hover:bg-gray-800/70 transition cursor-pointer" onClick={() => { setSelectedOlympiad(o); fetchDetail(o.id); setActiveView('detail'); }}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-white font-bold text-lg">{o.title}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[o.status] || ''}`}>{o.status}</span>
                                        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-full">{typeLabels[o.type] || o.type}</span>
                                    </div>
                                    {o.description && <p className="text-gray-400 text-sm mb-2 line-clamp-1">{o.description}</p>}
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Users size={14} /> {o.participant_count || 0}/{o.max_participants}</span>
                                        <span className="flex items-center gap-1"><Clock size={14} /> {o.duration_minutes} min</span>
                                        {o.grade_level && <span>{o.grade_level}</span>}
                                        {o.start_time && <span>{new Date(o.start_time).toLocaleDateString('uz')}</span>}
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-600 mt-2" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ======================== RENDER: CREATE ========================
    const renderCreate = () => (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
                <button onClick={() => setActiveView('list')} className="text-gray-400 hover:text-white">← Ortga</button>
                <h1 className="text-xl font-bold text-white">Yangi Olimpiada</h1>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 space-y-4">
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Sarlavha *</label>
                    <input value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Matematika Olimpiadasi 2026" />
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Tavsif</label>
                    <textarea value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Turi</label>
                        <select value={createForm.type} onChange={e => setCreateForm({...createForm, type: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                            <option value="test">📝 Test</option>
                            <option value="reading">📖 O'qish tezligi</option>
                            <option value="mixed">🔄 Aralash</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Fan</label>
                        <select value={createForm.subject} onChange={e => setCreateForm({...createForm, subject: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                            <option value="general">Umumiy</option>
                            <option value="math">Matematika</option>
                            <option value="uzbek">O'zbek tili</option>
                            <option value="russian">Rus tili</option>
                            <option value="english">Ingliz tili</option>
                            <option value="logic">Mantiq</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Sinf</label>
                        <input value={createForm.grade_level} onChange={e => setCreateForm({...createForm, grade_level: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" placeholder="2-sinf" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Davomiyligi (min)</label>
                        <input type="number" value={createForm.duration_minutes} onChange={e => setCreateForm({...createForm, duration_minutes: parseInt(e.target.value) || 30})} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Max ishtirokchilar</label>
                        <input type="number" value={createForm.max_participants} onChange={e => setCreateForm({...createForm, max_participants: parseInt(e.target.value) || 500})} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Ro'yxatdan o'tish boshlanishi *</label>
                        <input type="datetime-local" value={createForm.registration_start} onChange={e => setCreateForm({...createForm, registration_start: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Ro'yxatdan o'tish tugashi</label>
                        <input type="datetime-local" value={createForm.registration_end} onChange={e => setCreateForm({...createForm, registration_end: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Olimpiada boshlanishi *</label>
                        <input type="datetime-local" value={createForm.start_time} onChange={e => setCreateForm({...createForm, start_time: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Olimpiada tugashi</label>
                        <input type="datetime-local" value={createForm.end_time} onChange={e => setCreateForm({...createForm, end_time: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                </div>

                <button onClick={handleCreate} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition">Yaratish</button>
            </div>
        </div>
    );

    // ======================== RENDER: DETAIL ========================
    const renderDetail = () => {
        if (!selectedOlympiad) return null;
        const o = selectedOlympiad;

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setActiveView('list'); setSelectedOlympiad(null); }} className="text-gray-400 hover:text-white">← Ortga</button>
                        <h1 className="text-xl font-bold text-white">{o.title}</h1>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[o.status] || ''}`}>{o.status}</span>
                        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-full">{typeLabels[o.type] || o.type}</span>
                    </div>
                    <div className="flex gap-2">
                        {o.status === 'draft' && <button onClick={() => handleStatusChange(o.id, 'upcoming')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">E'lon qilish</button>}
                        {o.status === 'upcoming' && <button onClick={() => handleStatusChange(o.id, 'active')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm">Boshlash</button>}
                        {o.status === 'active' && <button onClick={() => handleStatusChange(o.id, 'finished')} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm">Tugatish</button>}
                        <button onClick={() => handleDelete(o.id)} className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm"><Trash2 size={16} /></button>
                    </div>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { label: 'Ishtirokchilar', value: stats.total_participants, color: 'text-blue-400' },
                            { label: 'Tugatganlar', value: stats.completed, color: 'text-green-400' },
                            { label: 'Jarayonda', value: stats.in_progress, color: 'text-amber-400' },
                            { label: 'O\'rtacha ball', value: stats.avg_score, color: 'text-purple-400' },
                            { label: 'Baholanmagan', value: stats.ungraded_readings, color: 'text-red-400' },
                        ].map((s, i) => (
                            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 text-center">
                                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                                <div className="text-xs text-gray-500">{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Test Questions Section */}
                {(o.type === 'test' || o.type === 'mixed') && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2"><FileText size={18} /> Test Savollari ({questions.length})</h3>
                            <button onClick={() => setShowAddQuestion(true)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm"><Plus size={16} /> Savol</button>
                        </div>
                        {questions.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">Savollar qo'shilmagan</p>
                        ) : (
                            <div className="space-y-3">
                                {questions.map((q, i) => (
                                    <div key={q.id} className="bg-gray-900/50 rounded-xl p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="text-white text-sm"><span className="text-indigo-400 font-bold mr-2">{i + 1}.</span>{q.question_text} <span className="text-gray-500">({q.points} ball)</span></p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {(q.options || []).map((opt, oi) => (
                                                        <span key={oi} className={`text-xs px-2 py-1 rounded ${oi === q.correct_answer ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                                                            {String.fromCharCode(65 + oi)}. {opt}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <button onClick={async () => { await olympiadService.deleteQuestion(o.id, q.id); const r = await olympiadService.listQuestions(o.id); setQuestions(r.questions || []); }} className="text-gray-600 hover:text-red-400 ml-2"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Reading Tasks Section */}
                {(o.type === 'reading' || o.type === 'mixed') && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2"><BookOpen size={18} /> O'qish Vazifalari ({readingTasks.length})</h3>
                            <button onClick={() => setShowAddReading(true)} className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm"><Plus size={16} /> Vazifa</button>
                        </div>
                        {readingTasks.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">O'qish vazifalari qo'shilmagan</p>
                        ) : (
                            <div className="space-y-3">
                                {readingTasks.map((rt, i) => (
                                    <div key={rt.id} className="bg-gray-900/50 rounded-xl p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-white font-medium">{i + 1}. {rt.title}</p>
                                                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                                    <span>{rt.word_count} so'z</span>
                                                    <span>{rt.difficulty}</span>
                                                    <span>{rt.time_limit_seconds}s limit</span>
                                                    {rt.comprehension_questions && <span>{rt.comprehension_questions.length} savol</span>}
                                                </div>
                                                <p className="text-gray-400 text-xs mt-2 line-clamp-2">{rt.text_content}</p>
                                            </div>
                                            <button onClick={async () => { await olympiadService.deleteReadingTask(o.id, rt.id); const r = await olympiadService.listReadingTasks(o.id); setReadingTasks(r.reading_tasks || []); }} className="text-gray-600 hover:text-red-400 ml-2"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Grading Section */}
                {(o.type === 'reading' || o.type === 'mixed') && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2"><Mic size={18} /> O'qish Baholash</h3>
                            <button onClick={() => fetchReadingSubs(o.id)} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm">Yangilash</button>
                        </div>
                        {readingSubmissions.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-gray-500 text-sm">O'qish natijalari yo'q</p>
                                <button onClick={() => fetchReadingSubs(o.id)} className="text-indigo-400 text-sm mt-2 hover:underline">Yuklash</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {readingSubmissions.map(sub => (
                                    <div key={sub.submission_id} className="bg-gray-900/50 rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-medium">{sub.student_name}</p>
                                                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                                    <span>{sub.reading_task_title}</span>
                                                    <span className="text-amber-400">{sub.words_per_minute} so'z/min</span>
                                                    <span>{sub.reading_duration_seconds}s</span>
                                                    <span>Tushunish: {sub.comprehension_score}/{sub.comprehension_total}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {sub.audio_url && (
                                                    <button onClick={() => {
                                                        if (audioPlaying === sub.submission_id) { setAudioPlaying(null); } else {
                                                            const audio = new Audio(sub.audio_url);
                                                            audio.play();
                                                            setAudioPlaying(sub.submission_id);
                                                            audio.onended = () => setAudioPlaying(null);
                                                        }
                                                    }} className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                                                        {audioPlaying === sub.submission_id ? <Pause size={16} /> : <Play size={16} />}
                                                    </button>
                                                )}
                                                {sub.graded ? (
                                                    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-lg"><CheckCircle size={14} /> {sub.admin_total_score}/30</span>
                                                ) : (
                                                    <button onClick={() => { setGradingSubmission(sub); setGradeForm({ pronunciation_score: 5, fluency_score: 5, accuracy_score: 5, notes: '' }); }} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm">Baholash</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Participants */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Users size={18} /> Ishtirokchilar ({participants.length})</h3>
                    {participants.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">Ishtirokchilar yo'q</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="text-gray-500 text-xs border-b border-gray-700">
                                    <th className="text-left py-2 px-3">Ism</th>
                                    <th className="text-left py-2 px-3">Sinf</th>
                                    <th className="text-left py-2 px-3">Status</th>
                                    <th className="text-right py-2 px-3">Ball</th>
                                    <th className="text-right py-2 px-3">Vaqt</th>
                                </tr></thead>
                                <tbody>
                                    {participants.map(p => (
                                        <tr key={p.participant_id} className="border-b border-gray-800">
                                            <td className="py-2 px-3 text-white">{p.student_name}</td>
                                            <td className="py-2 px-3 text-gray-400">{p.grade || '-'}</td>
                                            <td className="py-2 px-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-green-500/20 text-green-400' : p.status === 'started' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>{p.status}</span></td>
                                            <td className="py-2 px-3 text-right text-white font-bold">{p.total_score}</td>
                                            <td className="py-2 px-3 text-right text-gray-400">{p.time_spent_seconds ? `${Math.round(p.time_spent_seconds / 60)}m` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ======================== MODALS ========================
    const renderModal = (show, onClose, title, children) => {
        if (!show) return null;
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold">{title}</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
                    </div>
                    {children}
                </div>
            </div>
        );
    };

    return (
        <div>
            {notification && (
                <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {notification.message}
                </div>
            )}

            {activeView === 'list' && renderList()}
            {activeView === 'create' && renderCreate()}
            {activeView === 'detail' && renderDetail()}

            {/* Add Question Modal */}
            {renderModal(showAddQuestion, () => setShowAddQuestion(false), 'Savol qo\'shish', (
                <div className="space-y-4">
                    <textarea value={qForm.question_text} onChange={e => setQForm({...qForm, question_text: e.target.value})} placeholder="Savol matni..." rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none resize-none" />
                    {qForm.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input type="radio" name="correct" checked={qForm.correct_answer === i} onChange={() => setQForm({...qForm, correct_answer: i})} className="accent-emerald-500" />
                            <input value={opt} onChange={e => { const opts = [...qForm.options]; opts[i] = e.target.value; setQForm({...qForm, options: opts}); }} placeholder={`${String.fromCharCode(65 + i)} variant`} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                        </div>
                    ))}
                    <div className="flex gap-3">
                        <input type="number" value={qForm.points} onChange={e => setQForm({...qForm, points: parseInt(e.target.value) || 5})} className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                        <span className="text-gray-500 text-sm self-center">ball</span>
                    </div>
                    <button onClick={handleAddQuestion} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium">Qo'shish</button>
                </div>
            ))}

            {/* Add Reading Task Modal */}
            {renderModal(showAddReading, () => setShowAddReading(false), 'O\'qish vazifasi qo\'shish', (
                <div className="space-y-4">
                    <input value={rtForm.title} onChange={e => setRtForm({...rtForm, title: e.target.value})} placeholder="Sarlavha: Hikoya nomi" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    <textarea value={rtForm.text_content} onChange={e => setRtForm({...rtForm, text_content: e.target.value})} placeholder="O'qiladigan matn..." rows={6} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none resize-none" />
                    <div className="flex gap-3">
                        <select value={rtForm.difficulty} onChange={e => setRtForm({...rtForm, difficulty: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none">
                            <option value="easy">Oson</option>
                            <option value="medium">O'rta</option>
                            <option value="hard">Qiyin</option>
                        </select>
                        <input type="number" value={rtForm.time_limit_seconds} onChange={e => setRtForm({...rtForm, time_limit_seconds: parseInt(e.target.value) || 300})} className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                        <span className="text-gray-500 text-sm self-center">soniya</span>
                    </div>

                    {/* Comprehension questions */}
                    <div className="border-t border-gray-700 pt-3">
                        <p className="text-gray-400 text-sm mb-2">Tushunish savollari ({rtForm.comprehension_questions.length})</p>
                        {rtForm.comprehension_questions.map((cq, i) => (
                            <div key={i} className="bg-gray-800/50 rounded-lg p-2 mb-2 text-xs text-gray-300">
                                {i + 1}. {cq.question} (To'g'ri: {String.fromCharCode(65 + cq.correct)})
                            </div>
                        ))}
                        <div className="space-y-2 bg-gray-800/30 rounded-xl p-3">
                            <input value={compQ.question} onChange={e => setCompQ({...compQ, question: e.target.value})} placeholder="Savol..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                            <div className="grid grid-cols-2 gap-2">
                                {compQ.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        <input type="radio" name="comp_correct" checked={compQ.correct === i} onChange={() => setCompQ({...compQ, correct: i})} className="accent-emerald-500" />
                                        <input value={opt} onChange={e => { const o = [...compQ.options]; o[i] = e.target.value; setCompQ({...compQ, options: o}); }} placeholder={`${String.fromCharCode(65+i)}`} className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs outline-none" />
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => {
                                if (!compQ.question) return;
                                setRtForm({...rtForm, comprehension_questions: [...rtForm.comprehension_questions, {...compQ, options: compQ.options.filter(o => o)}]});
                                setCompQ({ question: '', options: ['', '', '', ''], correct: 0 });
                            }} className="text-xs text-indigo-400 hover:underline">+ Savolni qo'shish</button>
                        </div>
                    </div>

                    <button onClick={handleAddReadingTask} className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-medium">Qo'shish</button>
                </div>
            ))}

            {/* Grade Reading Modal */}
            {renderModal(!!gradingSubmission, () => setGradingSubmission(null), 'O\'qishni baholash', gradingSubmission && (
                <div className="space-y-4">
                    <div className="bg-gray-800/50 rounded-xl p-3">
                        <p className="text-white font-medium">{gradingSubmission.student_name}</p>
                        <p className="text-gray-400 text-sm">{gradingSubmission.reading_task_title}</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                            <span className="text-amber-400 font-bold">{gradingSubmission.words_per_minute} so'z/min</span>
                            <span>{gradingSubmission.reading_duration_seconds}s</span>
                        </div>
                        {gradingSubmission.audio_url && (
                            <audio controls className="w-full mt-2" src={gradingSubmission.audio_url} />
                        )}
                    </div>
                    {[
                        { key: 'pronunciation_score', label: 'Talaffuz (0-10)', icon: '🗣️' },
                        { key: 'fluency_score', label: 'Ravonlik (0-10)', icon: '🌊' },
                        { key: 'accuracy_score', label: 'Aniqlik (0-10)', icon: '🎯' },
                    ].map(item => (
                        <div key={item.key}>
                            <label className="text-sm text-gray-400 mb-1 block">{item.icon} {item.label}</label>
                            <input type="range" min={0} max={10} value={gradeForm[item.key]} onChange={e => setGradeForm({...gradeForm, [item.key]: parseInt(e.target.value)})} className="w-full accent-emerald-500" />
                            <div className="text-right text-emerald-400 font-bold text-sm">{gradeForm[item.key]}/10</div>
                        </div>
                    ))}
                    <div className="text-center py-2">
                        <span className="text-2xl font-bold text-white">{gradeForm.pronunciation_score + gradeForm.fluency_score + gradeForm.accuracy_score}/30</span>
                    </div>
                    <textarea value={gradeForm.notes} onChange={e => setGradeForm({...gradeForm, notes: e.target.value})} placeholder="Izoh (ixtiyoriy)..." rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none resize-none" />
                    <button onClick={handleGrade} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold">Baholash</button>
                </div>
            ))}
        </div>
    );
}
