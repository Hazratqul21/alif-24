import { useEffect, useState } from 'react';
import {
    BookOpen, Plus, Trash2, X, Edit, Eye, ChevronLeft, Trophy,
    Calendar, Users, Clock, CheckCircle, FileText, BarChart3,
    Image, Save, AlertCircle
} from 'lucide-react';
import adminService from '../../services/adminService';

const DAYS = [
    { key: 'monday', label: 'Dushanba', short: 'Du' },
    { key: 'tuesday', label: 'Seshanba', short: 'Se' },
    { key: 'wednesday', label: 'Chorshanba', short: 'Ch' },
    { key: 'thursday', label: 'Payshanba', short: 'Pa' },
    { key: 'friday', label: 'Juma', short: 'Ju' },
];

const STATUS_COLORS = {
    draft: 'bg-gray-500/20 text-gray-400',
    active: 'bg-emerald-500/20 text-emerald-400',
    scoring: 'bg-amber-500/20 text-amber-400',
    finished: 'bg-blue-500/20 text-blue-400',
    cancelled: 'bg-red-500/20 text-red-400',
};

const STATUS_LABELS = {
    draft: 'Qoralama',
    active: 'Faol',
    scoring: 'Baholanmoqda',
    finished: 'Tugagan',
    cancelled: 'Bekor',
};

export default function ReadingCompetitionPage() {
    // Views: 'list' | 'detail' | 'create'
    const [view, setView] = useState('list');
    const [competitions, setCompetitions] = useState([]);
    const [selectedComp, setSelectedComp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [total, setTotal] = useState(0);

    // Create competition form
    const [compForm, setCompForm] = useState({
        title: '', description: '', week_number: '', year: new Date().getFullYear(),
        grade_level: '', language: 'uz', start_date: '', end_date: ''
    });

    // Task (hikoya) form
    const [taskModal, setTaskModal] = useState(null); // null | 'create' | task object (edit)
    const [taskForm, setTaskForm] = useState({
        day_of_week: 'monday', title: '', image_url: '', story_text: '', questions: [], time_limit_seconds: ''
    });
    const [questionForm, setQuestionForm] = useState({ question: '', options: ['', '', '', ''], correct: 0 });

    // Test form
    const [testModal, setTestModal] = useState(false);
    const [testForm, setTestForm] = useState({ title: '', questions: [], time_limit_minutes: 30 });
    const [testQuestionForm, setTestQuestionForm] = useState({ question: '', options: ['', '', '', ''], correct: 0 });

    // Results tab
    const [activeTab, setActiveTab] = useState('tasks'); // tasks | test | results | stats

    useEffect(() => { loadCompetitions(); }, []);

    const loadCompetitions = async () => {
        try {
            setLoading(true);
            const { data } = await adminService.getCompetitions({ limit: 50 });
            setCompetitions(data.competitions || []);
            setTotal(data.total || 0);
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        } finally {
            setLoading(false);
        }
    };

    const loadCompetition = async (id) => {
        try {
            setLoading(true);
            const { data } = await adminService.getCompetition(id);
            setSelectedComp(data);
            setView('detail');
            setActiveTab('tasks');
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        } finally {
            setLoading(false);
        }
    };

    // ============ COMPETITION CRUD ============

    const handleCreateCompetition = async () => {
        if (!compForm.title || !compForm.week_number) return setError("Sarlavha va hafta raqami kerak");
        try {
            setSaving(true); setError('');
            const { data } = await adminService.createCompetition({
                ...compForm,
                week_number: parseInt(compForm.week_number),
                year: parseInt(compForm.year),
            });
            setView('list');
            setCompForm({ title: '', description: '', week_number: '', year: new Date().getFullYear(), grade_level: '', language: 'uz', start_date: '', end_date: '' });
            loadCompetitions();
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateStatus = async (status) => {
        if (!selectedComp) return;
        try {
            await adminService.updateCompetition(selectedComp.id, { status });
            loadCompetition(selectedComp.id);
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        }
    };

    const handleDeleteCompetition = async () => {
        if (!selectedComp || !confirm("Musobaqani o'chirmoqchimisiz? Barcha hikoyalar va natijalar ham o'chadi.")) return;
        try {
            await adminService.deleteCompetition(selectedComp.id);
            setView('list');
            setSelectedComp(null);
            loadCompetitions();
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        }
    };

    // ============ TASK CRUD ============

    const openTaskCreate = (day) => {
        setTaskForm({ day_of_week: day || 'monday', title: '', image_url: '', story_text: '', questions: [], time_limit_seconds: '' });
        setTaskModal('create');
        setError('');
    };

    const openTaskEdit = (task) => {
        setTaskForm({
            day_of_week: task.day_of_week,
            title: task.title,
            image_url: task.image_url || '',
            story_text: task.story_text || '',
            questions: task.questions || [],
            time_limit_seconds: task.time_limit_seconds || '',
        });
        setTaskModal(task);
        setError('');
    };

    const handleSaveTask = async () => {
        if (!taskForm.title || !taskForm.story_text) return setError("Sarlavha va hikoya matni kerak");
        try {
            setSaving(true); setError('');
            if (taskModal === 'create') {
                await adminService.createTask(selectedComp.id, {
                    ...taskForm,
                    time_limit_seconds: taskForm.time_limit_seconds ? parseInt(taskForm.time_limit_seconds) : null,
                });
            } else {
                await adminService.updateTask(selectedComp.id, taskModal.id, {
                    title: taskForm.title,
                    image_url: taskForm.image_url || null,
                    story_text: taskForm.story_text,
                    questions: taskForm.questions,
                    time_limit_seconds: taskForm.time_limit_seconds ? parseInt(taskForm.time_limit_seconds) : null,
                });
            }
            setTaskModal(null);
            loadCompetition(selectedComp.id);
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm("Hikoyani o'chirmoqchimisiz?")) return;
        try {
            await adminService.deleteTask(selectedComp.id, taskId);
            loadCompetition(selectedComp.id);
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        }
    };

    // ============ QUESTION HELPERS ============

    const addQuestion = () => {
        if (!questionForm.question || questionForm.options.some(o => !o.trim())) return setError("Savol va barcha variantlarni to'ldiring");
        setTaskForm(prev => ({ ...prev, questions: [...prev.questions, { ...questionForm }] }));
        setQuestionForm({ question: '', options: ['', '', '', ''], correct: 0 });
        setError('');
    };

    const removeQuestion = (idx) => {
        setTaskForm(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
    };

    // ============ TEST CRUD ============

    const openTestModal = () => {
        const existing = selectedComp?.test;
        if (existing) {
            setTestForm({ title: existing.title || '', questions: existing.questions || [], time_limit_minutes: existing.time_limit_minutes || 30 });
        } else {
            setTestForm({ title: '', questions: [], time_limit_minutes: 30 });
        }
        setTestModal(true);
        setError('');
    };

    const addTestQuestion = () => {
        if (!testQuestionForm.question || testQuestionForm.options.some(o => !o.trim())) return setError("Savol va variantlarni to'ldiring");
        setTestForm(prev => ({ ...prev, questions: [...prev.questions, { ...testQuestionForm }] }));
        setTestQuestionForm({ question: '', options: ['', '', '', ''], correct: 0 });
        setError('');
    };

    const removeTestQuestion = (idx) => {
        setTestForm(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
    };

    const handleSaveTest = async () => {
        if (!testForm.questions.length) return setError("Kamida 1 ta savol kerak");
        try {
            setSaving(true); setError('');
            await adminService.createOrUpdateTest(selectedComp.id, {
                ...testForm,
                time_limit_minutes: parseInt(testForm.time_limit_minutes),
            });
            setTestModal(false);
            loadCompetition(selectedComp.id);
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    // ============ IMAGE UPLOAD ============

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const res = await adminService.uploadFile(file);
            setTaskForm(prev => ({ ...prev, image_url: res.data?.url || '' }));
        } catch (err) {
            setError("Rasm yuklashda xatolik");
        }
    };

    // ============ RENDERS ============

    // Competition List
    const renderList = () => (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">O'qish Musobaqalari</h2>
                    <p className="text-gray-500 text-sm mt-1">Haftalik o'qish musobaqalarini boshqaring</p>
                </div>
                <button onClick={() => setView('create')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
                    <Plus className="w-4 h-4" /> Yangi musobaqa
                </button>
            </div>

            {competitions.length === 0 && !loading && (
                <div className="text-center py-16 text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Hali musobaqa yo'q</p>
                </div>
            )}

            <div className="grid gap-4">
                {competitions.map(c => (
                    <div key={c.id} onClick={() => loadCompetition(c.id)}
                        className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-emerald-500/30 cursor-pointer transition-all">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-white font-semibold text-lg">{c.title}</h3>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Hafta {c.week_number}/{c.year}</span>
                                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {c.tasks_count}/5 hikoya</span>
                                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c.participants} ishtirokchi</span>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>
                                {STATUS_LABELS[c.status] || c.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // Create Competition Form
    const renderCreate = () => (
        <div>
            <button onClick={() => setView('list')} className="flex items-center gap-1 text-gray-500 hover:text-white mb-4 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Orqaga
            </button>
            <h2 className="text-xl font-bold text-white mb-6">Yangi Musobaqa Yaratish</h2>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-4 max-w-2xl">
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Sarlavha *</label>
                    <input value={compForm.title} onChange={e => setCompForm(p => ({ ...p, title: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none" placeholder="Masalan: 9-hafta O'qish Musobaqasi" />
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-1 block">Tavsif</label>
                    <textarea value={compForm.description} onChange={e => setCompForm(p => ({ ...p, description: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Hafta raqami *</label>
                        <input type="number" value={compForm.week_number} onChange={e => setCompForm(p => ({ ...p, week_number: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none" placeholder="1-53" min={1} max={53} />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Yil</label>
                        <input type="number" value={compForm.year} onChange={e => setCompForm(p => ({ ...p, year: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Boshlanish sanasi</label>
                        <input type="date" value={compForm.start_date} onChange={e => setCompForm(p => ({ ...p, start_date: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Tugash sanasi</label>
                        <input type="date" value={compForm.end_date} onChange={e => setCompForm(p => ({ ...p, end_date: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Sinf darajasi</label>
                        <select value={compForm.grade_level} onChange={e => setCompForm(p => ({ ...p, grade_level: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none">
                            <option value="">Barchasi</option>
                            {[1,2,3,4,5,6,7,8,9,10,11].map(g => <option key={g} value={`${g}`}>{g}-sinf</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Til</label>
                        <select value={compForm.language} onChange={e => setCompForm(p => ({ ...p, language: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none">
                            <option value="uz">O'zbek</option>
                            <option value="ru">Русский</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                </div>

                <button onClick={handleCreateCompetition} disabled={saving}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium transition-colors">
                    {saving ? 'Saqlanmoqda...' : 'Musobaqa Yaratish'}
                </button>
            </div>
        </div>
    );

    // Competition Detail
    const renderDetail = () => {
        if (!selectedComp) return null;
        const tasks = selectedComp.tasks || [];
        const test = selectedComp.test;
        const tasksByDay = {};
        tasks.forEach(t => { tasksByDay[t.day_of_week] = t; });

        return (
            <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setView('list'); setSelectedComp(null); }} className="p-2 text-gray-500 hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedComp.title}</h2>
                            <p className="text-gray-500 text-sm">Hafta {selectedComp.week_number}/{selectedComp.year} · {selectedComp.participants} ishtirokchi</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[selectedComp.status]}`}>
                            {STATUS_LABELS[selectedComp.status]}
                        </span>
                        {selectedComp.status === 'draft' && (
                            <button onClick={() => handleUpdateStatus('active')} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">Faollashtirish</button>
                        )}
                        {selectedComp.status === 'active' && (
                            <button onClick={() => handleUpdateStatus('scoring')} className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700">Baholash</button>
                        )}
                        {selectedComp.status === 'scoring' && (
                            <button onClick={() => handleUpdateStatus('finished')} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Tugatish</button>
                        )}
                        <button onClick={handleDeleteCompetition} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-gray-900/50 p-1 rounded-xl w-fit">
                    {[
                        { key: 'tasks', label: 'Hikoyalar', icon: BookOpen },
                        { key: 'test', label: 'Test', icon: FileText },
                        { key: 'results', label: 'Natijalar', icon: Trophy },
                        { key: 'stats', label: 'Statistika', icon: BarChart3 },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                            <tab.icon className="w-4 h-4" /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'tasks' && renderTasks(tasksByDay)}
                {activeTab === 'test' && renderTest(test)}
                {activeTab === 'results' && <ResultsView compId={selectedComp.id} />}
                {activeTab === 'stats' && <StatsView compId={selectedComp.id} />}
            </div>
        );
    };

    // Tasks (5 days)
    const renderTasks = (tasksByDay) => (
        <div className="grid gap-3">
            {DAYS.map((day, i) => {
                const task = tasksByDay[day.key];
                return (
                    <div key={day.key} className={`border rounded-xl p-4 transition-all ${task ? 'bg-gray-900/50 border-emerald-500/20' : 'bg-gray-900/30 border-gray-800 border-dashed'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${task ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>{i + 1}</span>
                                <div>
                                    <span className="text-gray-400 text-xs">{day.label}</span>
                                    {task ? (
                                        <p className="text-white font-medium">{task.title}</p>
                                    ) : (
                                        <p className="text-gray-600 text-sm">Hikoya qo'shilmagan</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {task && (
                                    <>
                                        <span className="text-gray-500 text-xs">{task.total_words} so'z · {task.questions_count} savol</span>
                                        <button onClick={() => openTaskEdit(task)} className="p-1.5 text-gray-500 hover:text-emerald-400"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                    </>
                                )}
                                {!task && (
                                    <button onClick={() => openTaskCreate(day.key)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30">
                                        <Plus className="w-3.5 h-3.5" /> Qo'shish
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // Test tab
    const renderTest = (test) => (
        <div>
            {test ? (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-white font-semibold">{test.title || 'Shanba Testi'}</h3>
                            <p className="text-gray-500 text-sm">{test.questions_count} savol · {test.time_limit_minutes} daqiqa</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={openTestModal} className="p-1.5 text-gray-500 hover:text-emerald-400"><Edit className="w-4 h-4" /></button>
                        </div>
                    </div>
                    {test.questions?.map((q, i) => (
                        <div key={i} className="bg-gray-800/50 rounded-lg p-3 mb-2">
                            <p className="text-white text-sm font-medium">{i + 1}. {q.question}</p>
                            <div className="grid grid-cols-2 gap-1 mt-2">
                                {q.options?.map((opt, j) => (
                                    <span key={j} className={`text-xs px-2 py-1 rounded ${j === q.correct ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500'}`}>
                                        {String.fromCharCode(65 + j)}) {opt}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                    <p className="text-gray-500 mb-4">Test hali yaratilmagan</p>
                    <button onClick={openTestModal} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
                        <Plus className="w-4 h-4 inline mr-1" /> Test Yaratish
                    </button>
                </div>
            )}
        </div>
    );

    // Question Builder UI (shared between task and test)
    const renderQuestionBuilder = (questions, qForm, setQForm, onAdd, onRemove) => (
        <div className="mt-4">
            <label className="text-sm text-gray-400 mb-2 block">Savollar ({questions.length} ta)</label>
            {questions.map((q, i) => (
                <div key={i} className="bg-gray-800/50 rounded-lg p-3 mb-2 relative">
                    <button onClick={() => onRemove(i)} className="absolute top-2 right-2 text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                    <p className="text-white text-sm">{i + 1}. {q.question}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                        {q.options?.map((o, j) => (
                            <span key={j} className={`text-xs px-2 py-0.5 rounded ${j === q.correct ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500'}`}>
                                {String.fromCharCode(65 + j)}) {o}
                            </span>
                        ))}
                    </div>
                </div>
            ))}

            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3 mt-2 space-y-2">
                <input value={qForm.question} onChange={e => setQForm(p => ({ ...p, question: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none" placeholder="Savol matni" />
                <div className="grid grid-cols-2 gap-2">
                    {qForm.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-1">
                            <button onClick={() => setQForm(p => ({ ...p, correct: i }))}
                                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${i === qForm.correct ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                {String.fromCharCode(65 + i)}
                            </button>
                            <input value={opt} onChange={e => { const opts = [...qForm.options]; opts[i] = e.target.value; setQForm(p => ({ ...p, options: opts })); }}
                                className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-emerald-500 focus:outline-none" placeholder={`Variant ${String.fromCharCode(65 + i)}`} />
                        </div>
                    ))}
                </div>
                <button onClick={onAdd} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-600/30">
                    <Plus className="w-3.5 h-3.5 inline mr-1" /> Savol qo'shish
                </button>
            </div>
        </div>
    );

    // Task Modal
    const renderTaskModal = () => {
        if (!taskModal) return null;
        const isEdit = taskModal !== 'create';
        const dayLabel = DAYS.find(d => d.key === taskForm.day_of_week)?.label || '';

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-10 overflow-y-auto">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl p-6 mb-10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold text-lg">{isEdit ? 'Hikoyani Tahrirlash' : `Hikoya Qo'shish — ${dayLabel}`}</h3>
                        <button onClick={() => setTaskModal(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-3">
                        {!isEdit && (
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Kun</label>
                                <select value={taskForm.day_of_week} onChange={e => setTaskForm(p => ({ ...p, day_of_week: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none">
                                    {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Mavzu (sarlavha) *</label>
                            <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none" placeholder="Masalan: Ona haqida hikoya" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Rasm</label>
                            <div className="flex gap-2 items-center">
                                <input value={taskForm.image_url} onChange={e => setTaskForm(p => ({ ...p, image_url: e.target.value }))}
                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:border-emerald-500 focus:outline-none" placeholder="URL yoki yuklang" />
                                <label className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 text-sm cursor-pointer hover:border-emerald-500">
                                    <Image className="w-4 h-4 inline mr-1" /> Yuklash
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            </div>
                            {taskForm.image_url && <img src={taskForm.image_url} alt="" className="mt-2 max-h-32 rounded-lg" />}
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Hikoya matni * <span className="text-gray-600">({taskForm.story_text.split(/\s+/).filter(Boolean).length} so'z)</span></label>
                            <textarea value={taskForm.story_text} onChange={e => setTaskForm(p => ({ ...p, story_text: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none" rows={8} placeholder="Hikoya matnini kiriting..." />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Vaqt chegarasi (sekund, ixtiyoriy)</label>
                            <input type="number" value={taskForm.time_limit_seconds} onChange={e => setTaskForm(p => ({ ...p, time_limit_seconds: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none" placeholder="Masalan: 180" />
                        </div>

                        {renderQuestionBuilder(taskForm.questions, questionForm, setQuestionForm, addQuestion, removeQuestion)}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setTaskModal(null)} className="px-4 py-2 text-gray-400 hover:text-white">Bekor</button>
                        <button onClick={handleSaveTask} disabled={saving}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium">
                            <Save className="w-4 h-4 inline mr-1" /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Test Modal
    const renderTestModal = () => {
        if (!testModal) return null;
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-10 overflow-y-auto">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl p-6 mb-10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold text-lg">Shanba Testi</h3>
                        <button onClick={() => setTestModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-3">
                        <input value={testForm.title} onChange={e => setTestForm(p => ({ ...p, title: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none" placeholder="Test sarlavhasi" />
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Vaqt chegarasi (daqiqa)</label>
                            <input type="number" value={testForm.time_limit_minutes} onChange={e => setTestForm(p => ({ ...p, time_limit_minutes: e.target.value }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:outline-none" />
                        </div>

                        {renderQuestionBuilder(testForm.questions, testQuestionForm, setTestQuestionForm, addTestQuestion, removeTestQuestion)}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setTestModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Bekor</button>
                        <button onClick={handleSaveTest} disabled={saving}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium">
                            <Save className="w-4 h-4 inline mr-1" /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    <button onClick={() => setError('')} className="ml-auto text-red-400/50 hover:text-red-400"><X className="w-4 h-4" /></button>
                </div>
            )}

            {loading && view !== 'detail' && (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            )}

            {!loading && view === 'list' && renderList()}
            {view === 'create' && renderCreate()}
            {view === 'detail' && renderDetail()}

            {renderTaskModal()}
            {renderTestModal()}
        </div>
    );
}


// Results Sub-Component
function ResultsView({ compId }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [group, setGroup] = useState('');

    useEffect(() => { loadResults(); }, [group]);

    const loadResults = async () => {
        try {
            setLoading(true);
            const { data } = await adminService.getCompetitionResults(compId, { group: group || undefined, limit: 100 });
            setResults(data.results || []);
        } catch { } finally { setLoading(false); }
    };

    return (
        <div>
            <div className="flex gap-2 mb-4">
                {[
                    { key: '', label: 'Hammasi' },
                    { key: 'fast_reader', label: 'Tez o\'quvchilar' },
                    { key: 'accurate_reader', label: 'To\'liq o\'quvchilar' },
                    { key: 'test_master', label: 'Test ustalar' },
                    { key: 'champion', label: 'Chempionlar' },
                ].map(g => (
                    <button key={g.key} onClick={() => setGroup(g.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm ${group === g.key ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                        {g.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-8"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" /></div>
            ) : results.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Natijalar hali yo'q</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 border-b border-gray-800">
                                <th className="text-left py-2 px-3">#</th>
                                <th className="text-left py-2 px-3">Ism</th>
                                <th className="text-center py-2 px-3">O'qish</th>
                                <th className="text-center py-2 px-3">Test</th>
                                <th className="text-center py-2 px-3">Jami</th>
                                <th className="text-center py-2 px-3">O'rin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                    <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                                    <td className="py-2 px-3 text-white font-medium">{r.student_name}</td>
                                    <td className="py-2 px-3 text-center text-emerald-400">{r.total_reading_score?.toFixed(0)}</td>
                                    <td className="py-2 px-3 text-center text-blue-400">{r.test_score?.toFixed(0)}</td>
                                    <td className="py-2 px-3 text-center text-amber-400 font-bold">{r.total_score?.toFixed(0)}</td>
                                    <td className="py-2 px-3 text-center text-gray-400">{r.rank_overall || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}


// Stats Sub-Component
function StatsView({ compId }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await adminService.getCompetitionStats(compId);
                setStats(data.stats);
            } catch { } finally { setLoading(false); }
        })();
    }, [compId]);

    if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" /></div>;
    if (!stats) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
                { label: 'Hikoyalar', value: `${stats.tasks_count}/5`, icon: BookOpen, color: 'emerald' },
                { label: 'Ishtirokchilar', value: stats.participants, icon: Users, color: 'blue' },
                { label: 'Tugatgan sessiyalar', value: stats.completed_sessions, icon: CheckCircle, color: 'green' },
                { label: "O'rtacha to'liqlik", value: `${stats.avg_completion}%`, icon: BarChart3, color: 'amber' },
                { label: "O'rtacha vaqt", value: `${stats.avg_time_seconds}s`, icon: Clock, color: 'purple' },
                { label: 'Test', value: stats.has_test ? 'Mavjud' : 'Yo\'q', icon: FileText, color: stats.has_test ? 'emerald' : 'gray' },
            ].map((s, i) => (
                <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                    <s.icon className={`w-5 h-5 text-${s.color}-400 mb-2`} />
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                </div>
            ))}
        </div>
    );
}
