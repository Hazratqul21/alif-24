import { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, Plus, Trash2, X, Eye, Users, Clock, BookOpen, Mic, CheckCircle, Play, Pause, ChevronRight, BarChart3, FileText, AlertCircle, PenLine, RefreshCw, Target, AudioLines, Waves, Book, Globe, Pencil, Video, Paperclip, HelpCircle, ToggleLeft, Image, AlignLeft, Upload, Sparkles, AlignJustify, Loader2 } from 'lucide-react';
import olympiadService from '../../services/olympiadService';
import adminService from '../../services/adminService';
import testAiService from '../../services/testAiService';

export default function OlympiadsPage() {
    const [activeView, setActiveView] = useState('list');
    const [olympiads, setOlympiads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOlympiad, setSelectedOlympiad] = useState(null);
    const [stats, setStats] = useState(null);
    const [notification, setNotification] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Questions
    const [questions, setQuestions] = useState([]);
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [qForm, setQForm] = useState({ question_text: '', options: ['', '', '', ''], correct_answer: 0, points: 5 });

    // Test Builder Modal
    const [showTestBuilder, setShowTestBuilder] = useState(false);
    const [testBuilderTab, setTestBuilderTab] = useState('file'); // 'file' | 'text' | 'ai' | 'manual'
    const [pasteText, setPasteText] = useState('');
    const [aiText, setAiText] = useState('');
    const [aiCount, setAiCount] = useState(10);
    const [parsedQuestions, setParsedQuestions] = useState([]); // preview qatori
    const [parsePending, setParsePending] = useState(false);
    const [parseErrMsg, setParseErrMsg] = useState('');
    const [bulkSaving, setBulkSaving] = useState(false);
    const fileInputRef = useRef(null);

    // Test sets (named collections stored in TestAI)
    const [testSets, setTestSets] = useState([]);
    const [testSetTitle, setTestSetTitle] = useState('');
    const [testSetsLoading, setTestSetsLoading] = useState(false);

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

    // Content (Darslar / Ertaklar)
    const [contentTab, setContentTab] = useState('ertaklar');
    const [contentLessons, setContentLessons] = useState([]);
    const [contentErtaklar, setContentErtaklar] = useState([]);
    const [contentLoading, setContentLoading] = useState(false);
    const [contentModal, setContentModal] = useState(null);
    const [lessonForm, setLessonForm] = useState({ title: '', subject: '', content: '', grade_level: '', language: 'uz', video_url: '' });
    const [ertakForm, setErtakForm] = useState({ title: '', content: '', language: 'uz', age_group: '6-8' });
    const [ertakQuestions, setErtakQuestions] = useState([]);
    const [contentUploadFile, setContentUploadFile] = useState(null);
    const [contentUploadImage, setContentUploadImage] = useState(null);
    const [editLesson, setEditLesson] = useState(null);
    const [editLessonForm, setEditLessonForm] = useState({ title: '', subject: '', content: '', grade_level: '', language: 'uz', video_url: '' });
    const [editErtak, setEditErtak] = useState(null);
    const [editErtakForm, setEditErtakForm] = useState({ title: '', content: '', language: 'uz', age_group: '6-8' });
    const [editErtakQuestions, setEditErtakQuestions] = useState([]);

    // ── Lesson quiz questions ─────────────────────────────────────────────────
    const [lessonQuestions, setLessonQuestions] = useState([]);
    const [editLessonQuestions, setEditLessonQuestions] = useState([]);

    const emptyLessonQ = () => ({
        type: 'multiple_choice', // multiple_choice | true_false | open_text | image_choice
        question: '',
        options: ['', '', '', ''],
        correct: 0,
        correct_text: '',       // for open_text
        image_options: ['', '', '', ''], // URLs for image_choice
        points: 5,
    });

    const addLessonQ = (setter) => setter(prev => [...prev, emptyLessonQ()]);
    const removeLessonQ = (setter, i) => setter(prev => prev.filter((_, idx) => idx !== i));
    const updateLessonQ = (setter, i, field, val) =>
        setter(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
    const updateLessonQOption = (setter, qi, oi, val) =>
        setter(prev => prev.map((q, idx) => idx === qi
            ? { ...q, options: q.options.map((o, j) => j === oi ? val : o) }
            : q));
    const updateLessonQImageOption = (setter, qi, oi, val) =>
        setter(prev => prev.map((q, idx) => idx === qi
            ? { ...q, image_options: (q.image_options || ['','','','']).map((o, j) => j === oi ? val : o) }
            : q));

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
            console.log('[OlympiadsPage] listOlympiads response:', res);
            setOlympiads(res.olympiads || []);
            if (!res.success) {
                console.warn('[OlympiadsPage] listOlympiads returned success=false:', res);
            }
        } catch (e) {
            console.error('[OlympiadsPage] listOlympiads error:', e.response?.status, e.response?.data || e.message);
            notify('error', `Olimpiadalarni olishda xatolik: ${e.response?.data?.error?.message || e.message}`);
        } finally { setLoading(false); }
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

   // handleCreate funksiyasini shu ko'rinishga o'zgartiring:

const handleCreate = async () => {
    if (!createForm.title || !createForm.registration_start || !createForm.start_time) {
        return notify('error', 'Sarlavha, ro\'yxatdan o\'tish va boshlanish sanasi kerak');
    }
    try {
        // datetime-local inputlar timezone o'z ichiga olmaydi — ISO 8601 formatga o'tkazamiz
        const toISO = (v) => {
            if (!v) return v;
            // Agar allaqachon 'Z' yoki '+' bo'lsa, o'zgartirmaymiz
            if (v.includes('Z') || v.includes('+')) return v;
            // Local timezone offset qo'shamiz
            const d = new Date(v);
            return d.toISOString();
        };

        const payload = {
            ...createForm,
            registration_start: toISO(createForm.registration_start),
            registration_end: toISO(createForm.registration_end || createForm.registration_start),
            start_time: toISO(createForm.start_time),
            end_time: toISO(createForm.end_time || createForm.start_time),
        };
        console.log('[OlympiadsPage] create payload:', payload);
        const res = await olympiadService.createOlympiad(payload);
        console.log('[OlympiadsPage] create response:', res);

        // Validate response — backend returns { success: true, olympiad: {...} }
        if (!res || !res.success) {
            const errMsg = res?.error?.message || res?.detail || 'Server javob bermadi';
            notify('error', `Yaratishda xatolik: ${errMsg}`);
            console.error('[OlympiadsPage] create returned non-success:', res);
            return;
        }

        notify('success', 'Olimpiada yaratildi!');

        // 1) Avval listni serverdan yangilash
        await fetchOlympiads();

        // 2) Keyin formni tozalab listga o'tish
        setCreateForm({
            title: '', description: '', subject: 'general', type: 'test',
            min_age: 4, max_age: 18, grade_level: '',
            registration_start: '', registration_end: '',
            start_time: '', end_time: '',
            duration_minutes: 30, max_participants: 500,
            questions_count: 20, results_public: true,
        });
        setActiveView('list');

    } catch (e) {
        const msg = parseError(e) || e.message || 'Xatolik';
        notify('error', msg);
        console.error('[OlympiadsPage] create error:', e.response?.status, e.response?.data || e.message);
    }
};

    const handleAddQuestion = async () => {
        if (!qForm.question_text || qForm.options.some(o => !o.trim())) {
            return notify('error', 'Savol va barcha variantlarni to\'ldiring');
        }
        if (qForm.question_text.length < 3) {
            return notify('error', 'Savol matni kamida 3 ta belgi bo\'lishi kerak');
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
        } catch (e) {
            const msg = parseError(e);
            notify('error', msg || 'Xatolik');
        }
    };

    // ---- Test Builder handlers ----
    const openTestBuilder = (tab = 'file') => {
        setTestBuilderTab(tab);
        setParsedQuestions([]);
        setPasteText('');
        setAiText('');
        setParseErrMsg('');
        setTestSetTitle('');
        setShowTestBuilder(true);
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setParsePending(true);
        setParseErrMsg('');
        setParsedQuestions([]);
        try {
            const res = await testAiService.parseFileQuestions(file);
            if (!res.questions?.length) { setParseErrMsg('Fayldan savollar topilmadi. Format to\'g\'riligini tekshiring.'); return; }
            setParsedQuestions(res.questions);
            if (!testSetTitle) setTestSetTitle(file.name.replace(/\.[^.]+$/, ''));
        } catch (e) {
            setParseErrMsg(e?.response?.data?.detail || 'Faylni qayta ishlashda xatolik');
        } finally {
            setParsePending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleParseText = async () => {
        if (!pasteText.trim()) { setParseErrMsg('Matn kiriting'); return; }
        setParsePending(true);
        setParseErrMsg('');
        setParsedQuestions([]);
        try {
            const res = await testAiService.parseTextQuestions(pasteText);
            if (!res.questions?.length) { setParseErrMsg('Savollar topilmadi. Format to\'g\'riligini tekshiring.'); return; }
            setParsedQuestions(res.questions);
        } catch (e) {
            setParseErrMsg(e?.response?.data?.detail || 'Xatolik');
        } finally {
            setParsePending(false);
        }
    };

    const handleAiGenerate = async () => {
        if (!aiText.trim()) { setParseErrMsg('Matn kiriting'); return; }
        setParsePending(true);
        setParseErrMsg('');
        setParsedQuestions([]);
        try {
            const res = await testAiService.aiGenerateQuestions(selectedOlympiad.id, aiText, aiCount);
            const qs = res.data?.questions || [];
            if (!qs.length) { setParseErrMsg('AI savollar yarata olmadi'); return; }
            setParsedQuestions(qs);
        } catch (e) {
            setParseErrMsg(e?.response?.data?.detail || 'AI xatolik');
        } finally {
            setParsePending(false);
        }
    };

    const removeParsedQuestion = (idx) => setParsedQuestions(pq => pq.filter((_, i) => i !== idx));

    const updateParsedQuestion = (idx, field, value) => {
        setParsedQuestions(pq => pq.map((q, i) => i === idx ? { ...q, [field]: value } : q));
    };

    const updateParsedOption = (qIdx, oIdx, value) => {
        setParsedQuestions(pq => pq.map((q, i) => {
            if (i !== qIdx) return q;
            const opts = [...q.options];
            opts[oIdx] = value;
            return { ...q, options: opts };
        }));
    };

    const handleBulkSave = async () => {
        if (!parsedQuestions.length) return;
        if (!testSetTitle.trim()) { setParseErrMsg('Test nomini kiriting'); return; }
        setBulkSaving(true);
        setParseErrMsg('');
        try {
            // Normalize question format for TestAI (field name may be question_text or question)
            const normalizedQs = parsedQuestions.map(q => ({
                question: q.question || q.question_text || '',
                options: q.options || [],
                correct: q.correct ?? q.correct_answer ?? 0,
            }));
            await testAiService.createOlympiadTestSet(selectedOlympiad.id, testSetTitle.trim(), normalizedQs);
            await loadTestSets(selectedOlympiad.id);
            setShowTestBuilder(false);
            setParsedQuestions([]);
            setTestSetTitle('');
            notify('success', `Test to'plami "${testSetTitle}" saqlandi!`);
        } catch (e) {
            setParseErrMsg(e?.response?.data?.detail || 'Saqlashda xatolik');
        } finally {
            setBulkSaving(false);
        }
    };

    const handleAddReadingTask = async () => {
        if (!rtForm.title || !rtForm.text_content) return notify('error', 'Sarlavha va matn kerak');
        if (rtForm.title.length < 3) return notify('error', 'Sarlavha kamida 3 ta belgi bo\'lishi kerak');
        if (rtForm.text_content.length < 10) return notify('error', 'Matn kamida 10 ta belgi bo\'lishi kerak');
        try {
            await olympiadService.addReadingTask(selectedOlympiad.id, rtForm);
            notify('success', 'O\'qish vazifasi qo\'shildi');
            setShowAddReading(false);
            setRtForm({ title: '', text_content: '', difficulty: 'medium', time_limit_seconds: 300, comprehension_questions: [] });
            const res = await olympiadService.listReadingTasks(selectedOlympiad.id);
            setReadingTasks(res.reading_tasks || []);
        } catch (e) {
            notify('error', parseError(e) || 'Xatolik');
        }
    };

    const handleGrade = async () => {
        if (!gradingSubmission) return;
        try {
            await olympiadService.gradeReading(gradingSubmission.submission_id, gradeForm);
            notify('success', 'Baholandi!');
            setGradingSubmission(null);
            const res = await olympiadService.getReadingSubmissions(selectedOlympiad.id);
            setReadingSubmissions(res.submissions || []);
        } catch (e) { notify('error', e.message || 'Xatolik'); }
    };

    const handleStatusChange = async (id, action) => {
        try {
            // action: 'publish' yoki 'unpublish'
            const isPublish = action === 'publish';
            const res = await olympiadService.publishOlympiad(id, isPublish);
            notify('success', res.message || `Status: ${res.status}`);
            fetchOlympiads();
            if (selectedOlympiad?.id === id) fetchDetail(id);
        } catch (e) {
            const msg = e.response?.data?.detail || e.message || 'Xatolik';
            notify('error', msg);
        }
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

    const typeLabels = { test: 'Test', reading: "O'qish", mixed: 'Aralash' };

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
                        <div key={o.id || Math.random()} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 hover:bg-gray-800/70 transition cursor-pointer" onClick={() => {
                            if (!o?.id) {
                                notify('error', 'Olimpiada ID topilmadi');
                                return;
                            }
                            setSelectedOlympiad(o);
                            fetchDetail(o.id);
                            setActiveView('detail');
                        }}>
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
                    <input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Matematika Olimpiadasi 2026" />
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Tavsif</label>
                    <textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Turi</label>
                        <select value={createForm.type} onChange={e => setCreateForm({ ...createForm, type: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                            <option value="test">Test</option>
                            <option value="reading">O'qish</option>
                            <option value="mixed">Aralash</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Fan</label>
                        <select value={createForm.subject} onChange={e => setCreateForm({ ...createForm, subject: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                            <option value="general">O'qish</option>
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
                        <input value={createForm.grade_level} onChange={e => setCreateForm({ ...createForm, grade_level: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" placeholder="2-sinf" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Davomiyligi (min)</label>
                        <input type="number" value={createForm.duration_minutes} onChange={e => setCreateForm({ ...createForm, duration_minutes: parseInt(e.target.value) || 30 })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Max ishtirokchilar</label>
                        <input type="number" value={createForm.max_participants} onChange={e => setCreateForm({ ...createForm, max_participants: parseInt(e.target.value) || 500 })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Ro'yxatdan o'tish boshlanishi *</label>
                        <input type="datetime-local" value={createForm.registration_start} onChange={e => setCreateForm({ ...createForm, registration_start: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Ro'yxatdan o'tish tugashi</label>
                        <input type="datetime-local" value={createForm.registration_end} onChange={e => setCreateForm({ ...createForm, registration_end: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Olimpiada boshlanishi *</label>
                        <input type="datetime-local" value={createForm.start_time} onChange={e => setCreateForm({ ...createForm, start_time: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Olimpiada tugashi</label>
                        <input type="datetime-local" value={createForm.end_time} onChange={e => setCreateForm({ ...createForm, end_time: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
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
                        {o.status === 'draft' && <button onClick={() => handleStatusChange(o.id, 'publish')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">E'lon qilish</button>}
                        {o.status === 'upcoming' && <button onClick={() => handleStatusChange(o.id, 'publish')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm">Boshlash</button>}
                        {o.status === 'active' && <button onClick={() => handleStatusChange(o.id, 'publish')} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm">Tugatish</button>}
                        <button onClick={() => handleDelete(o.id)} className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm"><Trash2 size={16} /></button>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button onClick={() => { setActiveView('content'); loadContentData(); }} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition shadow-lg shadow-indigo-500/20">
                        <BookOpen size={20} /> Kontent yasash
                    </button>
                </div>

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

                {(o.type === 'test' || o.type === 'mixed') && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2"><FileText size={18} /> Test Savollari ({questions.length})</h3>
                            <div className="flex gap-2">
                                <button onClick={() => openTestBuilder('file')} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"><Upload size={14} /> Test tuzish</button>
                                <button onClick={() => setShowAddQuestion(true)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/30 text-indigo-400 rounded-lg text-sm border border-indigo-600/30 hover:bg-indigo-600 hover:text-white"><Plus size={14} /> Savol</button>
                            </div>
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

    // ======================== CONTENT FUNCTIONS ========================
    const loadTestSets = async (olympiadId) => {
        if (!olympiadId) return;
        try {
            setTestSetsLoading(true);
            const res = await testAiService.listOlympiadTestSets(olympiadId);
            setTestSets(Array.isArray(res.data) ? res.data : []);
        } catch (e) { console.error('loadTestSets', e); }
        finally { setTestSetsLoading(false); }
    };

    const loadContentData = async () => {
        if (!selectedOlympiad) return;
        try {
            setContentLoading(true);
            const [lessRes, ertRes] = await Promise.allSettled([
                olympiadService.getOlympiadLessons(selectedOlympiad.id),
                olympiadService.getOlympiadStories(selectedOlympiad.id),
            ]);
            if (lessRes.status === 'fulfilled') {
                const ld = lessRes.value.data || [];
                setContentLessons(Array.isArray(ld) ? ld : []);
            }
            if (ertRes.status === 'fulfilled') {
                const ed = ertRes.value.data?.ertaklar || ertRes.value.data || [];
                setContentErtaklar(Array.isArray(ed) ? ed : []);
            }
            await loadTestSets(selectedOlympiad.id);
        } catch (e) { console.error(e); }
        finally { setContentLoading(false); }
    };

    const parseError = (e) => {
        if (!e.response?.data) return 'Xatolik yuz berdi';
        const d = e.response.data.detail;
        if (Array.isArray(d)) return d.map(err => `${err.loc.join('.')} - ${err.msg}`).join('\n');
        return d || 'Xatolik yuz berdi';
    };

    const handleCreateContentLesson = async () => {
        if (!selectedOlympiad) return;
        if (lessonForm.title.length < 3) {
            const msg = 'Sarlavha kamida 3 ta belgi bo\'lishi kerak';
            setError(msg); notify('error', msg); return;
        }
        try {
            setSaving(true); setError('');
            const payload = {
                ...lessonForm,
                quiz_questions: lessonQuestions.filter(q => q.question.trim()),
            };
            if (contentUploadFile) {
                const upRes = await adminService.uploadFile(contentUploadFile);
                if (upRes.data?.url) payload.attachments = [{ name: contentUploadFile.name, url: upRes.data.url, size: upRes.data.size || contentUploadFile.size }];
            }
            await olympiadService.createOlympiadLesson(selectedOlympiad.id, payload);
            notify('success', 'Dars yaratildi!');
            setContentModal(null);
            setLessonForm({ title: '', subject: '', content: '', grade_level: '', language: 'uz', video_url: '' });
            setLessonQuestions([]);
            setContentUploadFile(null);
            loadContentData();
        } catch (e) {
            const msg = parseError(e);
            setError(msg); notify('error', msg);
        } finally { setSaving(false); }
    };

    const handleCreateContentErtak = async () => {
        if (!selectedOlympiad) return;
        if (ertakForm.title.length < 3) {
            const msg = 'Sarlavha kamida 3 ta belgi bo\'lishi kerak';
            setError(msg); notify('error', msg); return;
        }
        if (ertakForm.content.length < 10) {
            const msg = 'Ertak matni kamida 10 ta belgi bo\'lishi kerak';
            setError(msg); notify('error', msg); return;
        }
        try {
            setSaving(true); setError('');
            const payload = { ...ertakForm, questions: ertakQuestions.filter(q => q.question.trim() && q.answer.trim()) };
            if (contentUploadFile) {
                const upRes = await adminService.uploadFile(contentUploadFile);
                if (upRes.data?.url) payload.audio_url = upRes.data.url;
            }
            if (contentUploadImage) {
                const imgRes = await adminService.uploadFile(contentUploadImage);
                if (imgRes.data?.url) payload.image_url = imgRes.data.url;
            }
            await olympiadService.createOlympiadStory(selectedOlympiad.id, payload);
            notify('success', 'Ertak yaratildi!');
            setContentModal(null);
            setErtakForm({ title: '', content: '', language: 'uz', age_group: '6-8' });
            setErtakQuestions([]);
            setContentUploadFile(null);
            setContentUploadImage(null);
            loadContentData();
        } catch (e) {
            const msg = parseError(e);
            setError(msg); notify('error', msg);
        } finally { setSaving(false); }
    };

    const handleEditContentLesson = (lesson) => {
        setEditLesson(lesson);
        setEditLessonForm({ title: lesson.title || '', subject: lesson.subject || '', content: lesson.content || '', grade_level: lesson.grade_level || '', language: lesson.language || 'uz', video_url: lesson.video_url || '' });
        setEditLessonQuestions((lesson.quiz_questions || []).map(q => ({
            type: q.type || 'multiple_choice',
            question: q.question || '',
            options: q.options || ['', '', '', ''],
            correct: q.correct ?? 0,
            correct_text: q.correct_text || '',
            image_options: q.image_options || ['', '', '', ''],
            points: q.points || 5,
        })));
    };

    const handleUpdateContentLesson = async () => {
        if (!editLesson || !selectedOlympiad) return;
        if (editLessonForm.title.length < 3) {
            const msg = 'Sarlavha kamida 3 ta belgi bo\'lishi kerak';
            setError(msg); notify('error', msg); return;
        }
        try {
            setSaving(true); setError('');
            const payload = {
                ...editLessonForm,
                quiz_questions: editLessonQuestions.filter(q => q.question.trim()),
            };
            if (contentUploadFile) {
                const upRes = await adminService.uploadFile(contentUploadFile);
                if (upRes.data?.url) payload.attachments = [...(editLesson.attachments || []), { name: contentUploadFile.name, url: upRes.data.url, size: upRes.data.size || contentUploadFile.size }];
            }
            await olympiadService.updateOlympiadLesson(selectedOlympiad.id, editLesson.id, payload);
            notify('success', 'Dars yangilandi!');
            setEditLesson(null);
            setEditLessonQuestions([]);
            setContentUploadFile(null);
            loadContentData();
        } catch (e) {
            const msg = parseError(e);
            setError(msg); notify('error', msg);
        } finally { setSaving(false); }
    };

    const handleDeleteContentLesson = async (id) => {
        if (!confirm("Darsni o'chirmoqchimisiz?") || !selectedOlympiad) return;
        try { await olympiadService.deleteOlympiadLesson(selectedOlympiad.id, id); loadContentData(); notify('success', "O'chirildi"); } catch (e) { notify('error', 'Xatolik'); }
    };

    const handleDeleteContentErtak = async (id) => {
        if (!confirm("Ertakni o'chirmoqchimisiz?") || !selectedOlympiad) return;
        try { await olympiadService.deleteOlympiadStory(selectedOlympiad.id, id); loadContentData(); notify('success', "O'chirildi"); } catch (e) { notify('error', 'Xatolik'); }
    };

    const handleEditContentErtak = (ertak) => {
        setEditErtak(ertak);
        setEditErtakForm({ title: ertak.title || '', content: ertak.content || '', language: ertak.language || 'uz', age_group: ertak.age_group || '6-8' });
        setEditErtakQuestions((ertak.questions || []).map(q => ({ question: q.question || '', answer: q.answer || '' })));
    };

    const handleUpdateContentErtak = async () => {
        if (!editErtak || !selectedOlympiad) return;
        if (editErtakForm.title.length < 3) { notify('error', 'Sarlavha kamida 3 ta belgi'); return; }
        try {
            setSaving(true); setError('');
            const payload = { ...editErtakForm, questions: editErtakQuestions.filter(q => q.question.trim()) };
            if (contentUploadFile) {
                const upRes = await adminService.uploadFile(contentUploadFile);
                if (upRes.data?.url) payload.audio_url = upRes.data.url;
            }
            if (contentUploadImage) {
                const upRes = await adminService.uploadFile(contentUploadImage);
                if (upRes.data?.url) payload.image_url = upRes.data.url;
            }
            await olympiadService.updateOlympiadStory(selectedOlympiad.id, editErtak.id, payload);
            notify('success', 'Ertak yangilandi!');
            setEditErtak(null);
            setEditErtakQuestions([]);
            setContentUploadFile(null);
            setContentUploadImage(null);
            loadContentData();
        } catch (e) {
            const msg = parseError(e);
            setError(msg); notify('error', msg);
        } finally { setSaving(false); }
    };

    const handlePublishLesson = async (id, currentStatus) => {
        if (!selectedOlympiad) return;
        try {
            const res = await olympiadService.publishOlympiadLesson(selectedOlympiad.id, id);
            setContentLessons(prev => prev.map(l => l.id === id ? { ...l, is_published: res.is_published } : l));
            notify('success', res.message || (currentStatus ? 'Yashirildi' : 'Nashr qilindi'));
        } catch (e) { notify('error', 'Xatolik'); }
    };

    const handlePublishErtak = async (id, currentStatus) => {
        if (!selectedOlympiad) return;
        try {
            const res = await olympiadService.publishOlympiadStory(selectedOlympiad.id, id);
            setContentErtaklar(prev => prev.map(e => e.id === id ? { ...e, is_published: res.is_published } : e));
            notify('success', res.message || (currentStatus ? 'Yashirildi' : 'Nashr qilindi'));
        } catch (e) { notify('error', 'Xatolik'); }
    };

    const addContentQuestion = () => setErtakQuestions(prev => [...prev, { question: '', answer: '' }]);
    const removeContentQuestion = (i) => setErtakQuestions(prev => prev.filter((_, idx) => idx !== i));
    const updateContentQuestion = (i, field, val) => setErtakQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));

    // ======================== LESSON QUIZ EDITOR ========================
    const questionTypeConfig = {
        multiple_choice: { label: 'Ko\'p tanlovli', icon: HelpCircle, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        true_false:      { label: 'To\'g\'ri / Noto\'g\'ri', icon: ToggleLeft, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        open_text:       { label: 'Ochiq javob', icon: AlignLeft, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        image_choice:    { label: 'Rasm tanlash', icon: Image, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    };

    const renderLessonQuizEditor = (qs, setter) => (
        <div className="border border-dashed border-gray-600 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-white text-sm font-semibold">🧠 Test savollari ({qs.length})</p>
                <div className="flex flex-wrap gap-1.5">
                    {Object.entries(questionTypeConfig).map(([type, cfg]) => (
                        <button
                            key={type}
                            onClick={() => addLessonQ(setter)}
                            title={cfg.label}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color} hover:opacity-80 transition-opacity`}
                            // Override type on add by wrapping:
                            onClickCapture={(e) => {
                                e.stopPropagation();
                                setter(prev => [...prev, { ...emptyLessonQ(), type }]);
                            }}
                        >
                            <cfg.icon size={12} /> {cfg.label}
                        </button>
                    ))}
                </div>
            </div>

            {qs.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-3">Hali savol qo'shilmagan. Yuqoridagi tugmalardan birini bosing.</p>
            )}

            {qs.map((q, qi) => {
                const cfg = questionTypeConfig[q.type] || questionTypeConfig.multiple_choice;
                return (
                    <div key={qi} className="bg-gray-800/60 rounded-xl p-3 space-y-2.5">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color} ${cfg.bg} px-2 py-1 rounded-lg`}>
                                <cfg.icon size={12} /> {cfg.label}
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={q.type}
                                    onChange={e => updateLessonQ(setter, qi, 'type', e.target.value)}
                                    className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-gray-300 text-xs outline-none"
                                >
                                    {Object.entries(questionTypeConfig).map(([t, c]) => (
                                        <option key={t} value={t}>{c.label}</option>
                                    ))}
                                </select>
                                <button onClick={() => removeLessonQ(setter, qi)} className="text-gray-500 hover:text-red-400"><X size={14} /></button>
                            </div>
                        </div>

                        {/* Question text */}
                        <input
                            value={q.question}
                            onChange={e => updateLessonQ(setter, qi, 'question', e.target.value)}
                            placeholder="Savol matni..."
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                        />

                        {/* Type-specific inputs */}
                        {q.type === 'multiple_choice' && (
                            <div className="space-y-1.5">
                                {q.options.map((opt, oi) => (
                                    <div key={oi} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name={`lq_correct_${qi}`}
                                            checked={q.correct === oi}
                                            onChange={() => updateLessonQ(setter, qi, 'correct', oi)}
                                            className="accent-emerald-500 shrink-0"
                                        />
                                        <input
                                            value={opt}
                                            onChange={e => updateLessonQOption(setter, qi, oi, e.target.value)}
                                            placeholder={`${String.fromCharCode(65 + oi)} variant`}
                                            className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                        />
                                    </div>
                                ))}
                                <p className="text-gray-500 text-xs">● = To'g'ri javob</p>
                            </div>
                        )}

                        {q.type === 'true_false' && (
                            <div className="flex gap-3">
                                {['To\'g\'ri', 'Noto\'g\'ri'].map((label, oi) => (
                                    <button
                                        key={oi}
                                        onClick={() => updateLessonQ(setter, qi, 'correct', oi)}
                                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${q.correct === oi ? (oi === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50') : 'bg-gray-700 text-gray-400 border border-gray-600'}`}
                                    >
                                        {oi === 0 ? '✓' : '✗'} {label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {q.type === 'open_text' && (
                            <input
                                value={q.correct_text}
                                onChange={e => updateLessonQ(setter, qi, 'correct_text', e.target.value)}
                                placeholder="To'g'ri javob (tekshiruv uchun)..."
                                className="w-full px-3 py-2 bg-emerald-900/20 border border-emerald-700/40 rounded-lg text-emerald-300 text-sm focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                            />
                        )}

                        {q.type === 'image_choice' && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    {(q.image_options || ['', '', '', '']).map((url, oi) => (
                                        <div key={oi} className={`relative rounded-xl border-2 overflow-hidden transition-all ${q.correct === oi ? 'border-emerald-500' : 'border-gray-600'}`}>
                                            <button
                                                onClick={() => updateLessonQ(setter, qi, 'correct', oi)}
                                                className="absolute top-1 left-1 z-10 w-5 h-5 rounded-full border-2 border-white/40 flex items-center justify-center"
                                                style={{ background: q.correct === oi ? '#10b981' : 'transparent' }}
                                            >
                                                {q.correct === oi && <span className="text-white text-xs">✓</span>}
                                            </button>
                                            {url ? (
                                                <img src={url} alt={`Option ${oi + 1}`} className="w-full h-20 object-cover" />
                                            ) : (
                                                <div className="w-full h-20 bg-gray-700 flex items-center justify-center">
                                                    <Image size={20} className="text-gray-500" />
                                                </div>
                                            )}
                                            <input
                                                value={url}
                                                onChange={e => updateLessonQImageOption(setter, qi, oi, e.target.value)}
                                                placeholder={`Rasm URL ${oi + 1}`}
                                                className="w-full px-2 py-1 bg-gray-800 text-white text-xs outline-none border-t border-gray-600 placeholder-gray-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-gray-500 text-xs">Yashil = To'g'ri javob rasm</p>
                            </div>
                        )}

                        {/* Points */}
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs">Ball:</span>
                            <input
                                type="number"
                                min={1} max={100}
                                value={q.points}
                                onChange={e => updateLessonQ(setter, qi, 'points', parseInt(e.target.value) || 5)}
                                className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs outline-none"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // ======================== RENDER: CONTENT ========================
    const renderContent = () => {
        if (contentLoading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

        return (
            <div>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveView('detail')} className="text-gray-400 hover:text-white">← Ortga</button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Kontentlar</h1>
                            <p className="text-gray-500 text-sm">Darslar va ertaklar boshqaruvi {selectedOlympiad ? `— ${selectedOlympiad.title}` : ''}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (contentTab === 'ertaklar') setContentModal('ertak');
                            else openTestBuilder('file');
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> {contentTab === 'ertaklar' ? 'Yangi ertak' : 'Test tuzish'}
                    </button>
                </div>

                <div className="flex gap-2 mb-6">
                    {[
                        { key: 'ertaklar', label: 'Ertaklar', icon: Book, count: contentErtaklar.length },
                        { key: 'tests', label: 'Test', icon: FileText, count: testSets.length },
                    ].map(t => (
                        <button key={t.key} onClick={() => setContentTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${contentTab === t.key ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-gray-400 bg-gray-900 border border-gray-800 hover:text-white'}`}>
                            <t.icon className="w-4 h-4" /> {t.label} <span className="text-xs opacity-50">({t.count})</span>
                        </button>
                    ))}
                </div>

                {/* Test to'plamlari */}
                {contentTab === 'tests' && (
                    <div className="space-y-3">
                        {testSetsLoading ? (
                            <div className="flex items-center justify-center py-8 text-gray-500">
                                <Loader2 size={20} className="animate-spin mr-2" /> Yuklanmoqda...
                            </div>
                        ) : testSets.length === 0 ? (
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">
                                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                                <p>Test to'plamlari yo'q</p>
                                <button onClick={() => openTestBuilder('file')}
                                    className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700">
                                    + Birinchi testni yaratish
                                </button>
                            </div>
                        ) : testSets.map(ts => (
                            <div key={ts.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                                        <FileText className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-medium truncate">{ts.title}</h3>
                                            {ts.status === 'published'
                                                ? <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Nashr</span>
                                                : <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 border border-gray-600">Draft</span>
                                            }
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">{ts.questions_count} ta savol{ts.ai_generated && ts.ai_generated !== 'no' ? ' · AI' : ''}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={async () => {
                                            try {
                                                if (ts.status === 'published') {
                                                    await testAiService.hideOlympiadTestSet(ts.id);
                                                } else {
                                                    await testAiService.publishOlympiadTestSet(ts.id);
                                                }
                                                await loadTestSets(selectedOlympiad.id);
                                            } catch (_) { notify('error', 'Xatolik'); }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${ts.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400' : 'bg-blue-500/10 text-blue-400 hover:bg-emerald-500/10 hover:text-emerald-400'}`}>
                                        {ts.status === 'published' ? 'Yashirish' : 'Share'}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!confirm(`"${ts.title}" test to'plamini o'chirasizmi?`)) return;
                                            try {
                                                await testAiService.deleteOlympiadTestSet(ts.id);
                                                await loadTestSets(selectedOlympiad.id);
                                                notify('success', "O'chirildi");
                                            } catch (_) { notify('error', 'Xatolik'); }
                                        }}
                                        className="p-2 text-gray-500 hover:text-red-400">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Ertaklar */}
                {contentTab === 'ertaklar' && (
                    <div className="space-y-3">
                        {contentErtaklar.length === 0 ? (
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">Ertaklar yo'q</div>
                        ) : contentErtaklar.map(e => (
                            <div key={e.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0"><Book className="w-5 h-5 text-purple-400" /></div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-medium truncate">{e.title}</h3>
                                            {e.is_published
                                                ? <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Nashr qilindi</span>
                                                : <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 border border-gray-600">Draft</span>
                                            }
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{e.language}</span><span>• {e.age_group}</span>
                                            {e.has_audio && <span>• 🔊 Audio</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => handlePublishErtak(e.id, e.is_published)}
                                        title={e.is_published ? "Yashirish" : "Studentlarga ko'rsatish"}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${e.is_published ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400' : 'bg-blue-500/10 text-blue-400 hover:bg-emerald-500/10 hover:text-emerald-400'}`}>
                                        {e.is_published ? 'Yashirish' : 'Share'}
                                    </button>
                                    <button onClick={() => handleEditContentErtak(e)} className="p-2 text-gray-500 hover:text-blue-400"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteContentErtak(e.id)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Lesson Modal */}
                {contentModal === 'lesson' && (
                    <ContentModal title="Yangi dars yaratish" onClose={() => { setContentModal(null); setLessonQuestions([]); }}>
                        <div className="space-y-3">
                            <ContentInput label="Nomi *" value={lessonForm.title} onChange={(v) => setLessonForm({ ...lessonForm, title: v })} />
                            <ContentInput label="Fan *" value={lessonForm.subject} onChange={(v) => setLessonForm({ ...lessonForm, subject: v })} placeholder="Matematika, Ingliz tili..." />
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Mazmuni *</label>
                                <textarea value={lessonForm.content} onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })} rows={5} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" placeholder="Dars mazmunini yozing..." />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <ContentInput label="Sinf" value={lessonForm.grade_level} onChange={(v) => setLessonForm({ ...lessonForm, grade_level: v })} placeholder="5-sinf" />
                                <ContentSelect label="Til" value={lessonForm.language} options={['uz', 'ru', 'en']} onChange={(v) => setLessonForm({ ...lessonForm, language: v })} />
                            </div>
                            <ContentInput label="Video URL (ixtiyoriy)" value={lessonForm.video_url} onChange={(v) => setLessonForm({ ...lessonForm, video_url: v })} placeholder="YouTube havola" />
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Fayl yuklash (Ixtiyoriy)</label>
                                <input type="file" onChange={(e) => setContentUploadFile(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white" />
                            </div>
                            {/* Quiz section */}
                            {renderLessonQuizEditor(lessonQuestions, setLessonQuestions)}
                        </div>
                        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => { setContentModal(null); setLessonQuestions([]); }} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                            <button onClick={handleCreateContentLesson} disabled={saving || !lessonForm.title || !lessonForm.subject || !lessonForm.content} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                                {saving ? 'Yaratilmoqda...' : 'Yaratish'}
                            </button>
                        </div>
                    </ContentModal>
                )}

                {/* Edit Lesson Modal */}
                {editLesson && (
                    <ContentModal title={`Darsni tahrirlash: ${editLesson.title}`} onClose={() => { setEditLesson(null); setContentUploadFile(null); setEditLessonQuestions([]); }}>
                        <div className="space-y-3">
                            <ContentInput label="Nomi *" value={editLessonForm.title} onChange={(v) => setEditLessonForm({ ...editLessonForm, title: v })} />
                            <ContentInput label="Fan" value={editLessonForm.subject} onChange={(v) => setEditLessonForm({ ...editLessonForm, subject: v })} />
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Mazmuni</label>
                                <textarea value={editLessonForm.content} onChange={(e) => setEditLessonForm({ ...editLessonForm, content: e.target.value })} rows={6} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <ContentInput label="Sinf" value={editLessonForm.grade_level} onChange={(v) => setEditLessonForm({ ...editLessonForm, grade_level: v })} />
                                <ContentSelect label="Til" value={editLessonForm.language} options={['uz', 'ru', 'en']} onChange={(v) => setEditLessonForm({ ...editLessonForm, language: v })} />
                            </div>
                            <ContentInput label="Video URL" value={editLessonForm.video_url} onChange={(v) => setEditLessonForm({ ...editLessonForm, video_url: v })} />
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
                                <label className="text-gray-400 text-xs mb-1 block">Yangi fayl qo'shish</label>
                                <input type="file" onChange={(e) => setContentUploadFile(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white" />
                            </div>
                            {/* Quiz section */}
                            {renderLessonQuizEditor(editLessonQuestions, setEditLessonQuestions)}
                        </div>
                        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => { setEditLesson(null); setContentUploadFile(null); setEditLessonQuestions([]); }} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                            <button onClick={handleUpdateContentLesson} disabled={saving || !editLessonForm.title} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                        </div>
                    </ContentModal>
                )}

                {/* Edit Ertak Modal */}
                {editErtak && (
                    <ContentModal title={`Ertakni tahrirlash: ${editErtak.title}`} onClose={() => { setEditErtak(null); setContentUploadFile(null); setContentUploadImage(null); setEditErtakQuestions([]); }}>
                        <div className="space-y-3">
                            <ContentInput label="Nomi *" value={editErtakForm.title} onChange={(v) => setEditErtakForm({ ...editErtakForm, title: v })} />
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Mazmuni *</label>
                                <textarea value={editErtakForm.content} onChange={(e) => setEditErtakForm({ ...editErtakForm, content: e.target.value })} rows={6} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <ContentSelect label="Til" value={editErtakForm.language} options={['uz', 'ru', 'en']} onChange={(v) => setEditErtakForm({ ...editErtakForm, language: v })} />
                                <ContentSelect label="Yosh guruhi" value={editErtakForm.age_group} options={['4-6', '6-8', '8-10', '10-12']} onChange={(v) => setEditErtakForm({ ...editErtakForm, age_group: v })} />
                            </div>
                            <div className="border border-dashed border-gray-600 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-white text-sm font-semibold">❓ Savollar (Quiz)</p>
                                    <button onClick={() => setEditErtakQuestions(prev => [...prev, { question: '', answer: '' }])} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
                                        <Plus className="w-3.5 h-3.5" /> Savol qo'shish
                                    </button>
                                </div>
                                {editErtakQuestions.length === 0 ? (
                                    <p className="text-gray-500 text-xs text-center py-2">Hali savol qo'shilmagan</p>
                                ) : (
                                    <div className="space-y-3">
                                        {editErtakQuestions.map((q, i) => (
                                            <div key={i} className="bg-gray-800/60 rounded-xl p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-xs font-medium">{i + 1}-savol</span>
                                                    <button onClick={() => setEditErtakQuestions(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                                <input value={q.question} onChange={e => setEditErtakQuestions(prev => prev.map((qq, idx) => idx === i ? { ...qq, question: e.target.value } : qq))} placeholder="Savol matni..." className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500" />
                                                <input value={q.answer} onChange={e => setEditErtakQuestions(prev => prev.map((qq, idx) => idx === i ? { ...qq, answer: e.target.value } : qq))} placeholder="To'g'ri javob..." className="w-full px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/40 rounded-lg text-emerald-300 text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Audio fayl (yangilash)</label>
                                <input type="file" accept="audio/*" onChange={(e) => setContentUploadFile(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Muqova rasmi (yangilash)</label>
                                <input type="file" accept="image/*" onChange={(e) => setContentUploadImage(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white" />
                            </div>
                        </div>
                        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => { setEditErtak(null); setContentUploadFile(null); setContentUploadImage(null); setEditErtakQuestions([]); }} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                            <button onClick={handleUpdateContentErtak} disabled={saving || !editErtakForm.title || !editErtakForm.content} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                        </div>
                    </ContentModal>
                )}

                {/* Create Ertak Modal */}
                {contentModal === 'ertak' && (
                    <ContentModal title="Yangi ertak yaratish" onClose={() => setContentModal(null)}>
                        <div className="space-y-3">
                            <ContentInput label="Nomi *" value={ertakForm.title} onChange={(v) => setErtakForm({ ...ertakForm, title: v })} />
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Mazmuni *</label>
                                <textarea value={ertakForm.content} onChange={(e) => setErtakForm({ ...ertakForm, content: e.target.value })} rows={6} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" placeholder="Ertak mazmunini yozing..." />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <ContentSelect label="Til" value={ertakForm.language} options={['uz', 'ru', 'en']} onChange={(v) => setErtakForm({ ...ertakForm, language: v })} />
                                <ContentSelect label="Yosh guruhi" value={ertakForm.age_group} options={['4-6', '6-8', '8-10', '10-12']} onChange={(v) => setErtakForm({ ...ertakForm, age_group: v })} />
                            </div>
                            <div className="border border-dashed border-gray-600 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-white text-sm font-semibold">❓ Savollar (Quiz)</p>
                                    <button onClick={addContentQuestion} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                                        <Plus className="w-3.5 h-3.5" /> Savol qo'shish
                                    </button>
                                </div>
                                {ertakQuestions.length === 0 ? (
                                    <p className="text-gray-500 text-xs text-center py-2">Hali savol qo'shilmagan</p>
                                ) : (
                                    <div className="space-y-3">
                                        {ertakQuestions.map((q, i) => (
                                            <div key={i} className="bg-gray-800/60 rounded-xl p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-xs font-medium">{i + 1}-savol</span>
                                                    <button onClick={() => removeContentQuestion(i)} className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                                <input value={q.question} onChange={e => updateContentQuestion(i, 'question', e.target.value)} placeholder="Savol matni..." className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500" />
                                                <input value={q.answer} onChange={e => updateContentQuestion(i, 'answer', e.target.value)} placeholder="To'g'ri javob..." className="w-full px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/40 rounded-lg text-emerald-300 text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Audio / Fayl yuklash (Ixtiyoriy)</label>
                                <input type="file" accept="audio/*" onChange={(e) => setContentUploadFile(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Muqova rasmi (Ixtiyoriy)</label>
                                <input type="file" accept="image/*" onChange={(e) => setContentUploadImage(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white" />
                            </div>
                        </div>
                        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => { setContentModal(null); setContentUploadFile(null); setContentUploadImage(null); }} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                            <button onClick={handleCreateContentErtak} disabled={saving || !ertakForm.title || !ertakForm.content} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                                {saving ? 'Yaratilmoqda...' : 'Yaratish'}
                            </button>
                        </div>
                    </ContentModal>
                )}
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
            {activeView === 'content' && renderContent()}

            {/* ===== TEST BUILDER MODAL ===== */}
            {showTestBuilder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowTestBuilder(false)}>
                    <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText size={18} className="text-emerald-400" /> Test tuzish</h3>
                            <button onClick={() => setShowTestBuilder(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>

                        {/* Test nomi */}
                        <div className="px-6 pt-4">
                            <input
                                value={testSetTitle}
                                onChange={e => setTestSetTitle(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                placeholder="Test nomi (mas: Amir Temur haqida) *"
                            />
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 px-6 pt-3 pb-0">
                            {[
                                { key: 'file', label: 'Fayl yuklash', icon: Upload },
                                { key: 'text', label: 'Matn', icon: AlignJustify },
                                { key: 'ai', label: 'AI bilan', icon: Sparkles },
                                { key: 'manual', label: '+ Yangi savol', icon: Plus },
                            ].map(t => (
                                <button key={t.key} onClick={() => { setTestBuilderTab(t.key); setParsedQuestions([]); setParseErrMsg(''); }}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors ${testBuilderTab === t.key ? 'bg-gray-800 text-emerald-400 border border-b-0 border-gray-700' : 'text-gray-500 hover:text-white'}`}>
                                    <t.icon size={14} /> {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="bg-gray-800 mx-6 rounded-b-xl rounded-tr-xl border border-gray-700 p-5 mb-4">

                            {/* FILE TAB */}
                            {testBuilderTab === 'file' && (
                                <div className="space-y-4">
                                    <p className="text-gray-400 text-sm">PDF, DOCX yoki TXT faylni yuklang. Test savollari avtomatik ajratib olinadi.</p>
                                    <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${parsePending ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-600 hover:border-emerald-500 hover:bg-gray-700/50'}`}>
                                        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.doc" className="hidden" onChange={handleFileSelect} disabled={parsePending} />
                                        {parsePending ? <Loader2 size={32} className="text-emerald-400 animate-spin mb-2" /> : <Upload size={32} className="text-gray-500 mb-2" />}
                                        <span className="text-sm text-gray-400">{parsePending ? 'Qayta ishlanmoqda...' : 'Faylni bosing yoki suring'}</span>
                                        <span className="text-xs text-gray-600 mt-1">.pdf .docx .txt</span>
                                    </label>
                                    <div className="text-xs text-gray-500 bg-gray-900 rounded-lg p-3">
                                        <p className="font-medium text-gray-400 mb-1">Tavsiya etilgan format:</p>
                                        <pre className="text-gray-500">{`1. Savol matni\nA) variant\nB) variant\nC) variant\nD) variant`}</pre>
                                    </div>
                                </div>
                            )}

                            {/* TEXT TAB */}
                            {testBuilderTab === 'text' && (
                                <div className="space-y-3">
                                    <p className="text-gray-400 text-sm">Test savollarini quyidagi formatda kiriting:</p>
                                    <div className="text-xs text-gray-600 bg-gray-900 rounded-lg p-2 font-mono">
                                        {`1. Savol matni\nA) variant\nB) variant\nC) variant\nD) variant`}
                                    </div>
                                    <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={10}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none font-mono"
                                        placeholder={"1. Savol matni\nA) variant\nB) variant\nC) variant\nD) variant\n\n2. Ikkinchi savol..."}
                                    />
                                    <button onClick={handleParseText} disabled={parsePending || !pasteText.trim()}
                                        className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {parsePending ? <><Loader2 size={16} className="animate-spin" /> Qayta ishlanmoqda...</> : 'OK — Savollarni ajratib olish'}
                                    </button>
                                </div>
                            )}

                            {/* AI TAB */}
                            {testBuilderTab === 'ai' && (
                                <div className="space-y-3">
                                    <p className="text-gray-400 text-sm">Mavzu yoki matn kiriting — AI test savollarini yaratadi.</p>
                                    <textarea value={aiText} onChange={e => setAiText(e.target.value)} rows={8}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                                        placeholder="Mavzu yoki matn yozing... (mas: Amir Temur haqida, Pitagor teoremasi, ...)"/>
                                    <div className="flex items-center gap-3">
                                        <label className="text-gray-400 text-sm">Savollar soni:</label>
                                        <input type="number" value={aiCount} onChange={e => setAiCount(Math.min(30, Math.max(1, parseInt(e.target.value) || 10)))}
                                            min={1} max={30} className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                                    </div>
                                    <button onClick={handleAiGenerate} disabled={parsePending || !aiText.trim()}
                                        className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {parsePending ? <><Loader2 size={16} className="animate-spin" /> AI ishlayapti...</> : <><Sparkles size={16} /> AI bilan test yaratish</>}
                                    </button>
                                </div>
                            )}

                            {/* MANUAL TAB */}
                            {testBuilderTab === 'manual' && (
                                <div className="space-y-4">
                                    <textarea value={qForm.question_text} onChange={e => setQForm({ ...qForm, question_text: e.target.value })}
                                        placeholder="Savol matni..." rows={2}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none resize-none text-sm" />
                                    {qForm.options.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <input type="radio" name="correct_manual" checked={qForm.correct_answer === i} onChange={() => setQForm({ ...qForm, correct_answer: i })} className="accent-emerald-500" />
                                            <span className="text-gray-400 font-bold w-6">{String.fromCharCode(65 + i)})</span>
                                            <input value={opt} onChange={e => { const opts = [...qForm.options]; opts[i] = e.target.value; setQForm({ ...qForm, options: opts }); }}
                                                placeholder={`${String.fromCharCode(65 + i)} variant`}
                                                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                                        </div>
                                    ))}
                                    <div className="flex gap-3">
                                        <input type="number" value={qForm.points} onChange={e => setQForm({ ...qForm, points: parseInt(e.target.value) || 5 })}
                                            className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                                        <span className="text-gray-500 text-sm self-center">ball</span>
                                    </div>
                                    <button onClick={() => {
                                        if (!qForm.question_text.trim()) return setParseErrMsg('Savol matnini kiriting');
                                        if (qForm.options.some(o => !o.trim())) return setParseErrMsg("Barcha variantlarni to'ldiring");
                                        setParsedQuestions(pq => [...pq, {
                                            question: qForm.question_text,
                                            question_text: qForm.question_text,
                                            options: [...qForm.options],
                                            correct: qForm.correct_answer,
                                            correct_answer: qForm.correct_answer,
                                        }]);
                                        setQForm({ question_text: '', options: ['', '', '', ''], correct_answer: 0, points: 5 });
                                        setParseErrMsg('');
                                        setTestBuilderTab('file');
                                    }} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">Savolni qo'shish</button>
                                </div>
                            )}
                        </div>

                        {/* Parse Error */}
                        {parseErrMsg && (
                            <div className="mx-6 mb-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                                <AlertCircle size={16} /> {parseErrMsg}
                            </div>
                        )}

                        {/* Parsed Questions Preview */}
                        {parsedQuestions.length > 0 && (
                            <div className="px-6 pb-6 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-white font-semibold">{parsedQuestions.length} ta savol topildi — ko'rib chiqing:</p>
                                    <button onClick={handleBulkSave} disabled={bulkSaving || !testSetTitle.trim()}
                                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shrink-0"
                                        title={!testSetTitle.trim() ? 'Avval test nomini kiriting' : ''}>
                                        {bulkSaving ? <><Loader2 size={14} className="animate-spin" /> Saqlanmoqda...</> : <><CheckCircle size={14} /> Saqlash</>}
                                    </button>
                                </div>
                                {parsedQuestions.map((q, qi) => {
                                    const qText = q.question || q.question_text || '';
                                    const correctIdx = q.correct ?? q.correct_answer ?? 0;
                                    return (
                                    <div key={qi} className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
                                        <div className="flex items-start gap-2">
                                            <span className="text-emerald-400 font-bold text-sm shrink-0 mt-1">{qi + 1}.</span>
                                            <textarea value={qText} onChange={e => {
                                                updateParsedQuestion(qi, 'question', e.target.value);
                                                updateParsedQuestion(qi, 'question_text', e.target.value);
                                            }}
                                                rows={2} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
                                            <button onClick={() => removeParsedQuestion(qi)} className="text-gray-600 hover:text-red-400 mt-1"><Trash2 size={16} /></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 ml-5">
                                            {(q.options || []).map((opt, oi) => (
                                                <div key={oi} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${correctIdx === oi ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 bg-gray-800'}`}>
                                                    <input type="radio" name={`pq_correct_${qi}`} checked={correctIdx === oi} onChange={() => {
                                                        updateParsedQuestion(qi, 'correct', oi);
                                                        updateParsedQuestion(qi, 'correct_answer', oi);
                                                    }} className="accent-emerald-500 shrink-0" />
                                                    <input value={opt} onChange={e => updateParsedOption(qi, oi, e.target.value)}
                                                        className="flex-1 bg-transparent text-white text-xs focus:outline-none min-w-0"
                                                        placeholder={`${String.fromCharCode(65 + oi)} variant`} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Question Modal */}
            {renderModal(showAddQuestion, () => setShowAddQuestion(false), 'Savol qo\'shish', (
                <div className="space-y-4">
                    <textarea value={qForm.question_text} onChange={e => setQForm({ ...qForm, question_text: e.target.value })} placeholder="Savol matni..." rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none resize-none" />
                    {qForm.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input type="radio" name="correct" checked={qForm.correct_answer === i} onChange={() => setQForm({ ...qForm, correct_answer: i })} className="accent-emerald-500" />
                            <input value={opt} onChange={e => { const opts = [...qForm.options]; opts[i] = e.target.value; setQForm({ ...qForm, options: opts }); }} placeholder={`${String.fromCharCode(65 + i)} variant`} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                        </div>
                    ))}
                    <div className="flex gap-3">
                        <input type="number" value={qForm.points} onChange={e => setQForm({ ...qForm, points: parseInt(e.target.value) || 5 })} className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                        <span className="text-gray-500 text-sm self-center">ball</span>
                    </div>
                    <button onClick={handleAddQuestion} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium">Qo'shish</button>
                </div>
            ))}

            {/* Add Reading Task Modal */}
            {renderModal(showAddReading, () => setShowAddReading(false), 'O\'qish vazifasi qo\'shish', (
                <div className="space-y-4">
                    <input value={rtForm.title} onChange={e => setRtForm({ ...rtForm, title: e.target.value })} placeholder="Sarlavha: Hikoya nomi" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none" />
                    <textarea value={rtForm.text_content} onChange={e => setRtForm({ ...rtForm, text_content: e.target.value })} placeholder="O'qiladigan matn..." rows={6} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none resize-none" />
                    <div className="flex gap-3">
                        <select value={rtForm.difficulty} onChange={e => setRtForm({ ...rtForm, difficulty: e.target.value })} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none">
                            <option value="easy">Oson</option>
                            <option value="medium">O'rta</option>
                            <option value="hard">Qiyin</option>
                        </select>
                        <input type="number" value={rtForm.time_limit_seconds} onChange={e => setRtForm({ ...rtForm, time_limit_seconds: parseInt(e.target.value) || 300 })} className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                        <span className="text-gray-500 text-sm self-center">soniya</span>
                    </div>
                    <div className="border-t border-gray-700 pt-3">
                        <p className="text-gray-400 text-sm mb-2">Tushunish savollari ({rtForm.comprehension_questions.length})</p>
                        {rtForm.comprehension_questions.map((cq, i) => (
                            <div key={i} className="bg-gray-800/50 rounded-lg p-2 mb-2 text-xs text-gray-300">
                                {i + 1}. {cq.question} (To'g'ri: {String.fromCharCode(65 + cq.correct)})
                            </div>
                        ))}
                        <div className="space-y-2 bg-gray-800/30 rounded-xl p-3">
                            <input value={compQ.question} onChange={e => setCompQ({ ...compQ, question: e.target.value })} placeholder="Savol..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                            <div className="grid grid-cols-2 gap-2">
                                {compQ.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        <input type="radio" name="comp_correct" checked={compQ.correct === i} onChange={() => setCompQ({ ...compQ, correct: i })} className="accent-emerald-500" />
                                        <input value={opt} onChange={e => { const o = [...compQ.options]; o[i] = e.target.value; setCompQ({ ...compQ, options: o }); }} placeholder={`${String.fromCharCode(65 + i)}`} className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs outline-none" />
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => {
                                if (!compQ.question) return;
                                setRtForm({ ...rtForm, comprehension_questions: [...rtForm.comprehension_questions, { ...compQ, options: compQ.options.filter(o => o) }] });
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
                        { key: 'pronunciation_score', label: 'Talaffuz (0-10)', Icon: AudioLines },
                        { key: 'fluency_score', label: 'Ravonlik (0-10)', Icon: Waves },
                        { key: 'accuracy_score', label: 'Aniqlik (0-10)', Icon: Target },
                    ].map(item => (
                        <div key={item.key}>
                            <label className="text-sm text-gray-400 mb-1 block flex items-center gap-1.5"><item.Icon size={14} /> {item.label}</label>
                            <input type="range" min={0} max={10} value={gradeForm[item.key]} onChange={e => setGradeForm({ ...gradeForm, [item.key]: parseInt(e.target.value) })} className="w-full accent-emerald-500" />
                            <div className="text-right text-emerald-400 font-bold text-sm">{gradeForm[item.key]}/10</div>
                        </div>
                    ))}
                    <div className="text-center py-2">
                        <span className="text-2xl font-bold text-white">{gradeForm.pronunciation_score + gradeForm.fluency_score + gradeForm.accuracy_score}/30</span>
                    </div>
                    <textarea value={gradeForm.notes} onChange={e => setGradeForm({ ...gradeForm, notes: e.target.value })} placeholder="Izoh (ixtiyoriy)..." rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none resize-none" />
                    <button onClick={handleGrade} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold">Baholash</button>
                </div>
            ))}
        </div>
    );
}

const ContentModal = ({ title, onClose, children }) => (
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

const ContentInput = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div>
        <label className="text-gray-400 text-xs mb-1 block">{label}</label>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-gray-600" />
    </div>
);

const ContentSelect = ({ label, value, options, onChange }) => (
    <div>
        <label className="text-gray-400 text-xs mb-1 block">{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);