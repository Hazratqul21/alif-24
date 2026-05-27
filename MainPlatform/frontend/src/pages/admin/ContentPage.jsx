import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, X, Book, Globe, Pencil, Video, Paperclip, CheckSquare } from 'lucide-react';
import adminService from '../../services/adminService';

export default function ContentPage() {
    const [tab, setTab] = useState('lessons');
    const [lessons, setLessons] = useState([]);
    const [ertaklar, setErtaklar] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModal, setCreateModal] = useState(null); // 'lesson' | 'ertak' | 'book'
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [platformContent, setPlatformContent] = useState({});
    const [rawJsonText, setRawJsonText] = useState('{}');

    const [lessonForm, setLessonForm] = useState({ title: '', subject: '', content: '', grade_level: '', language: 'uz', video_url: '' });
    const [ertakForm, setErtakForm] = useState({ title: '', content: '', language: 'uz', age_group: 'Barchasi', questions_limit: 3, test_limit: '' });
    const [ertakQuestions, setErtakQuestions] = useState([]); // [{question:'',answer:''}]
    const [ertakTest, setErtakTest] = useState([]); // [{question:'',options:['','','',''],correct:0}]
    
    // Book forms
    const [bookForm, setBookForm] = useState({ title: '', description: '', language: 'uz', age_group: 'Barchasi', is_premium: false, questions_limit: 3, test_limit: '' });
    const [bookQuestions, setBookQuestions] = useState([]);
    const [bookTest, setBookTest] = useState([]);

    // Bulk text import states
    const [bulkQuestionsText, setBulkQuestionsText] = useState('');
    const [bulkTestsText, setBulkTestsText] = useState('');
    const [editBulkQuestionsText, setEditBulkQuestionsText] = useState('');
    const [editBulkTestsText, setEditBulkTestsText] = useState('');

    const [uploadFile, setUploadFile] = useState(null);
    const [uploadImage, setUploadImage] = useState(null);
    
    const [editLesson, setEditLesson] = useState(null); // lesson object to edit
    const [editForm, setEditForm] = useState({ title: '', subject: '', content: '', grade_level: '', language: 'uz', video_url: '' });

    const [editErtak, setEditErtak] = useState(null); // ertak object to edit
    const [editErtakForm, setEditErtakForm] = useState({ title: '', content: '', language: 'uz', age_group: 'Barchasi', questions_limit: 3, test_limit: '' });
    const [editErtakQuestions, setEditErtakQuestions] = useState([]);
    const [editErtakTest, setEditErtakTest] = useState([]);

    // Edit Book states
    const [editBook, setEditBook] = useState(null);
    const [editBookForm, setEditBookForm] = useState({ title: '', description: '', language: 'uz', age_group: 'Barchasi', is_premium: false, questions_limit: 3, test_limit: '' });
    const [editBookQuestions, setEditBookQuestions] = useState([]);
    const [editBookTest, setEditBookTest] = useState([]);

    useEffect(() => { loadContent(); }, []);

    const loadContent = async () => {
        try {
            setLoading(true);
            const [lessRes, ertRes, pcRes, bookRes] = await Promise.allSettled([
                adminService.getLessons(),
                adminService.getErtaklar(),
                adminService.getPublicContent(),
                adminService.getBooks()
            ]);
            if (lessRes.status === 'fulfilled') {
                const ld = lessRes.value.data?.lessons || lessRes.value.data;
                setLessons(Array.isArray(ld) ? ld : []);
            }
            if (ertRes.status === 'fulfilled') {
                const ed = ertRes.value.data?.ertaklar || ertRes.value.data?.stories || ertRes.value.data;
                setErtaklar(Array.isArray(ed) ? ed : []);
            }
            if (bookRes.status === 'fulfilled') {
                const bd = bookRes.value.data?.books || bookRes.value.data;
                setBooks(Array.isArray(bd) ? bd : []);
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
            setUploadImage(null);
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
                questions_limit: parseInt(ertakForm.questions_limit) || 3,
                test_limit: ertakForm.test_limit ? parseInt(ertakForm.test_limit) : null,
                questions: ertakQuestions.filter(q => q.question.trim() && q.answer.trim()),
                test: ertakTest.filter(t => t.question.trim() && t.options.every(o => o.trim()))
            };
            if (uploadFile) {
                const upRes = await adminService.uploadFile(uploadFile);
                if (upRes.data?.url) {
                    payload.audio_url = upRes.data.url;
                }
            }
            if (uploadImage) {
                const imgRes = await adminService.uploadFile(uploadImage);
                if (imgRes.data?.url) {
                    payload.image_url = imgRes.data.url;
                }
            }

            await adminService.createErtak(payload);
            setCreateModal(null);
            setErtakForm({ title: '', content: '', language: 'uz', age_group: 'Barchasi', questions_limit: 3, test_limit: '' });
            setErtakQuestions([]);
            setErtakTest([]);
            setUploadFile(null);
            setUploadImage(null);
            loadContent();
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateBook = async () => {
        try {
            setSaving(true);
            setError('');

            if (!uploadFile) {
                setError('PDF fayl yuklash majburiy!');
                setSaving(false);
                return;
            }

            const payload = {
                ...bookForm,
                questions_limit: parseInt(bookForm.questions_limit) || 3,
                test_limit: bookForm.test_limit ? parseInt(bookForm.test_limit) : null,
                questions: bookQuestions.filter(q => q.question.trim() && q.answer.trim()),
                test: bookTest.filter(t => t.question.trim() && t.options.every(o => o.trim()))
            };

            const upRes = await adminService.uploadFile(uploadFile);
            if (upRes.data?.url) {
                payload.pdf_url = upRes.data.url;
            } else {
                throw new Error("PDF yuklashda xatolik yuz berdi");
            }

            if (uploadImage) {
                const imgRes = await adminService.uploadFile(uploadImage);
                if (imgRes.data?.url) {
                    payload.image_url = imgRes.data.url;
                }
            }

            await adminService.createBook(payload);
            setCreateModal(null);
            setBookForm({ title: '', description: '', language: 'uz', age_group: 'Barchasi', is_premium: false, questions_limit: 3, test_limit: '' });
            setBookQuestions([]);
            setBookTest([]);
            setUploadFile(null);
            setUploadImage(null);
            loadContent();
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const addQuestion = (isBook = false) => {
        if (isBook) {
            setBookQuestions(prev => [...prev, { question: '', answer: '' }]);
        } else {
            setErtakQuestions(prev => [...prev, { question: '', answer: '' }]);
        }
    };

    const removeQuestion = (i, isBook = false) => {
        if (isBook) {
            setBookQuestions(prev => prev.filter((_, idx) => idx !== i));
        } else {
            setErtakQuestions(prev => prev.filter((_, idx) => idx !== i));
        }
    };

    const updateQuestion = (i, field, val, isBook = false) => {
        if (isBook) {
            setBookQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
        } else {
            setErtakQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
        }
    };

    const handleBulkQuestionsImport = (isEdit = false, isBook = false) => {
        const text = isEdit ? editBulkQuestionsText : bulkQuestionsText;
        if (!text || !text.trim()) return;

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const parsed = [];
        let currentQuestion = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^(?:javob|otvet|answer)\s*:\s*(.*)/i);
            if (match) {
                const answer = match[1].trim();
                if (currentQuestion) {
                    parsed.push({ question: currentQuestion, answer: answer });
                    currentQuestion = null;
                }
            } else {
                const cleanLine = line.replace(/^\d+\s*[\.\)]\s*/, '').trim();
                currentQuestion = cleanLine;
            }
        }

        if (parsed.length > 0) {
            if (isEdit) {
                if (isBook) {
                    setEditBookQuestions(prev => [...prev, ...parsed]);
                } else {
                    setEditErtakQuestions(prev => [...prev, ...parsed]);
                }
                setEditBulkQuestionsText('');
            } else {
                if (isBook) {
                    setBookQuestions(prev => [...prev, ...parsed]);
                } else {
                    setErtakQuestions(prev => [...prev, ...parsed]);
                }
                setBulkQuestionsText('');
            }
            alert(`${parsed.length} ta savol-javob muvaffaqiyatli import qilindi!`);
        } else {
            alert("Matn formatini tekshiring. Savol va uning tagida 'Javob: ...' bo'lishi kerak.");
        }
    };

    const handleBulkTestsImport = (isEdit = false, isBook = false) => {
        const text = isEdit ? editBulkTestsText : bulkTestsText;
        if (!text || !text.trim()) return;

        const parts = text.split(/(?:^|\n)\s*\d+\s*[\.\)]\s*\n*/i);
        const parsed = [];

        for (const part of parts) {
            if (!part.trim()) continue;
            
            const lines = part.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length < 2) continue;
            
            let question = "";
            const options = [];
            let correct = 0;
            let foundQuestion = false;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const optMatch = line.match(/^([a-d])\s*[\)\.]\s*(.*)/i);
                const correctMatch = line.match(/^(?:to['`‘vog]ri\s+)?javob\s*:\s*([a-d])/i);
                
                if (optMatch) {
                    options.push(optMatch[2].trim());
                } else if (correctMatch) {
                    const letter = correctMatch[1].toUpperCase();
                    correct = letter.charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1...
                } else {
                    if (!foundQuestion) {
                        question = line;
                        foundQuestion = true;
                    } else {
                        question += " " + line;
                    }
                }
            }
            
            if (question && options.length > 0) {
                while (options.length < 4) {
                    options.push('');
                }
                parsed.push({
                    question: question.trim(),
                    options: options.slice(0, 4),
                    correct: correct
                });
            }
        }

        if (parsed.length > 0) {
            if (isEdit) {
                if (isBook) {
                    setEditBookTest(prev => [...prev, ...parsed]);
                } else {
                    setEditErtakTest(prev => [...prev, ...parsed]);
                }
                setEditBulkTestsText('');
            } else {
                if (isBook) {
                    setBookTest(prev => [...prev, ...parsed]);
                } else {
                    setErtakTest(prev => [...prev, ...parsed]);
                }
                setBulkTestsText('');
            }
            alert(`${parsed.length} ta test muvaffaqiyatli import qilindi!`);
        } else {
            alert("Matn formatini tekshiring. Har bir test savoli, variantlari (A, B, C, D) va to'g'ri javobi ko'rsatilgan bo'lishi kerak.");
        }
    };

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

    const handleDeleteBook = async (id) => {
        if (!confirm("Kitobni o'chirmoqchimisiz?")) return;
        try {
            await adminService.deleteBook(id);
            loadContent();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        }
    };

    const handleEditErtak = (ertak) => {
        setEditErtak(ertak);
        setEditErtakForm({
            title: ertak.title || '',
            content: ertak.content || ertak.story_text || ertak.body || ertak.description || '',
            language: ertak.language || 'uz',
            age_group: ertak.age_group || 'Barchasi',
            questions_limit: ertak.questions_limit !== undefined && ertak.questions_limit !== null ? ertak.questions_limit : 3,
            test_limit: ertak.test_limit !== undefined && ertak.test_limit !== null ? ertak.test_limit : '',
        });
        setEditErtakQuestions(ertak.questions || []);
        setEditErtakTest(ertak.test || []);
    };

    const handleEditBook = (book) => {
        setEditBook(book);
        setEditBookForm({
            title: book.title || '',
            description: book.description || '',
            language: book.language || 'uz',
            age_group: book.age_group || 'Barchasi',
            is_premium: !!book.is_premium,
            questions_limit: book.questions_limit !== undefined && book.questions_limit !== null ? book.questions_limit : 3,
            test_limit: book.test_limit !== undefined && book.test_limit !== null ? book.test_limit : '',
        });
        setEditBookQuestions(book.questions || []);
        setEditBookTest(book.test || []);
    };

    const handleUpdateErtak = async () => {
        if (!editErtak) return;
        try {
            setSaving(true);
            setError('');
            const payload = {
                ...editErtakForm,
                questions_limit: parseInt(editErtakForm.questions_limit) || 3,
                test_limit: editErtakForm.test_limit ? parseInt(editErtakForm.test_limit) : null,
                questions: editErtakQuestions.filter(q => q.question?.trim() && q.answer?.trim()),
                test: editErtakTest.filter(t => t.question?.trim() && t.options?.every(o => o.trim()))
            };
            if (uploadFile) {
                const upRes = await adminService.uploadFile(uploadFile);
                if (upRes.data?.url) payload.audio_url = upRes.data.url;
            }
            if (uploadImage) {
                const imgRes = await adminService.uploadFile(uploadImage);
                if (imgRes.data?.url) payload.image_url = imgRes.data.url;
            }
            await adminService.updateErtak(editErtak.id, payload);
            setEditErtak(null);
            setEditErtakQuestions([]);
            setEditErtakTest([]);
            setUploadFile(null);
            setUploadImage(null);
            loadContent();
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateBook = async () => {
        if (!editBook) return;
        try {
            setSaving(true);
            setError('');
            const payload = {
                ...editBookForm,
                questions_limit: parseInt(editBookForm.questions_limit) || 3,
                test_limit: editBookForm.test_limit ? parseInt(editBookForm.test_limit) : null,
                questions: editBookQuestions.filter(q => q.question?.trim() && q.answer?.trim()),
                test: editBookTest.filter(t => t.question?.trim() && t.options?.every(o => o.trim()))
            };
            if (uploadFile) {
                const upRes = await adminService.uploadFile(uploadFile);
                if (upRes.data?.url) payload.pdf_url = upRes.data.url;
            }
            if (uploadImage) {
                const imgRes = await adminService.uploadFile(uploadImage);
                if (imgRes.data?.url) payload.image_url = imgRes.data.url;
            }
            await adminService.updateBook(editBook.id, payload);
            setEditBook(null);
            setEditBookQuestions([]);
            setEditBookTest([]);
            setUploadFile(null);
            setUploadImage(null);
            loadContent();
        } catch (err) {
            setError(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
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
                    <p className="text-gray-500 text-sm">Darslar, ertaklar va kitoblar boshqaruvi</p>
                </div>
                <button
                    onClick={() => setCreateModal(tab === 'lessons' ? 'lesson' : tab === 'ertaklar' ? 'ertak' : 'book')}
                    disabled={tab === 'platform'}
                    className={`flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors ${tab === 'platform' ? 'opacity-0 pointer-events-none' : ''}`}
                >
                    <Plus className="w-4 h-4" /> Yangi {tab === 'lessons' ? 'dars' : tab === 'ertaklar' ? 'ertak' : 'kitob'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {[
                    { key: 'lessons', label: 'Darslar', icon: BookOpen, count: lessons.length },
                    { key: 'ertaklar', label: 'Ertaklar', icon: Book, count: ertaklar.length },
                    { key: 'books', label: 'Kitoblar', icon: BookOpen, count: books.length },
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
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => handleEditErtak(e)} className="p-2 text-gray-500 hover:text-blue-400"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteErtak(e.id)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Books List */}
            {tab === 'books' && (
                <div className="space-y-3">
                    {books.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500">Kitoblar yo'q</div>
                    ) : books.map(b => (
                        <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                                    <BookOpen className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-white font-medium truncate">{b.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{b.language?.toUpperCase()}</span>
                                        <span>• {b.age_group} yosh</span>
                                        <span className={b.is_premium ? "text-amber-400 font-bold" : "text-green-400 font-bold"}>
                                            • {b.is_premium ? "Premium (Pullik)" : "Bepul"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 line-clamp-1 italic">{b.description || 'Izohsiz'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => handleEditBook(b)} className="p-2 text-gray-500 hover:text-blue-400"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteBook(b.id)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
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
                            <Select label="Yosh guruhi" value={ertakForm.age_group} options={['Barchasi', '5-7', '7-8', '8-9', '9-10', '10-11', '11-12', '12-17', '17+']} onChange={(v) => setErtakForm({ ...ertakForm, age_group: v })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-gray-800/40 p-3 rounded-xl border border-gray-800">
                            <div>
                                <Input 
                                    label="Savollar soni cheklovi (Min: 3)" 
                                    type="number" 
                                    value={ertakForm.questions_limit} 
                                    onChange={(v) => setErtakForm({ ...ertakForm, questions_limit: parseInt(v) || 3 })} 
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Quiz payti tasodifiy tanlab olimadigan savollar soni.</p>
                            </div>
                            <div>
                                <Input 
                                    label="Testlar soni cheklovi (Ixtiyoriy)" 
                                    type="number" 
                                    value={ertakForm.test_limit} 
                                    placeholder="Barchasi"
                                    onChange={(v) => setErtakForm({ ...ertakForm, test_limit: v })} 
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Tasodifiy tanlab olinadigan testlar soni.</p>
                            </div>
                        </div>

                        {/* ── Savollar bo'limi ── */}
                        <div className="border border-dashed border-gray-600 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-white text-sm font-semibold">❓ Savollar (Quiz)</p>
                                <button
                                    type="button"
                                    onClick={() => addQuestion(false)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Savol qo'shish
                                </button>
                            </div>

                            {/* Savollarni matndan import qilish */}
                            <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
                                <label className="text-gray-300 text-xs font-medium block mb-1.5">
                                    Matndan import qilish (Format: Savol? tagidan Javob: ...)
                                </label>
                                <textarea
                                    value={bulkQuestionsText}
                                    onChange={(e) => setBulkQuestionsText(e.target.value)}
                                    rows={3}
                                    placeholder={`Bolalar qayerga kelishdi?\nJavob: Bog'ga kelishdi.\nJasur nimani ko'rdi?\nJavob: Idishni ko'rdi.`}
                                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 resize-none font-mono placeholder-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleBulkQuestionsImport(false, false)}
                                    className="w-full mt-2 py-1.5 bg-emerald-700/60 text-emerald-200 hover:bg-emerald-700 text-xs font-medium rounded-lg transition-colors border border-emerald-600/40"
                                >
                                    Savollarni import qilish
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
                                                <button type="button" onClick={() => removeQuestion(i, false)} className="text-gray-600 hover:text-red-400 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={q.question}
                                                onChange={e => updateQuestion(i, 'question', e.target.value, false)}
                                                placeholder="Savol matni..."
                                                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                            />
                                            <input
                                                type="text"
                                                value={q.answer}
                                                onChange={e => updateQuestion(i, 'answer', e.target.value, false)}
                                                placeholder="To'g'ri javob..."
                                                className="w-full px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/40 rounded-lg text-emerald-300 text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Test bo'limi ── */}
                        <div className="border border-dashed border-gray-600 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-white text-sm font-semibold">📝 Ko'p tanlovli test (Multiple Choice)</p>
                                <button
                                    type="button"
                                    onClick={() => setErtakTest(prev => [...prev, { question: '', options: ['', '', '', ''], correct: 0 }])}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Test qo'shish
                                </button>
                            </div>

                            {/* Testlarni matndan import qilish */}
                            <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
                                <label className="text-gray-300 text-xs font-medium block mb-1.5">
                                    Matndan import qilish (Format: 1. Savol?\nA) ... B) ... To'g'ri javob: B)
                                </label>
                                <textarea
                                    value={bulkTestsText}
                                    onChange={(e) => setBulkTestsText(e.target.value)}
                                    rows={3}
                                    placeholder={`1. Savol?\nA) Variant A\nB) Variant B\nTo'g'ri javob: B`}
                                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 resize-none font-mono placeholder-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleBulkTestsImport(false, false)}
                                    className="w-full mt-2 py-1.5 bg-blue-700/60 text-blue-200 hover:bg-blue-700 text-xs font-medium rounded-lg transition-colors border border-blue-600/40"
                                >
                                    Testlarni import qilish
                                </button>
                            </div>

                            {ertakTest.length === 0 ? (
                                <p className="text-gray-500 text-xs text-center py-2">Hali test qo'shilmagan. "Test qo'shish" tugmasini bosing.</p>
                            ) : (
                                <div className="space-y-4">
                                    {ertakTest.map((t, idx) => (
                                        <div key={idx} className="bg-gray-800/60 rounded-xl p-3 space-y-2 relative border border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-xs font-medium">{idx + 1}-test savoli</span>
                                                <button type="button" onClick={() => setErtakTest(prev => prev.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-red-400 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={t.question}
                                                onChange={e => setErtakTest(prev => prev.map((q, i) => i === idx ? { ...q, question: e.target.value } : q))}
                                                placeholder="Savol matni..."
                                                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 placeholder-gray-500"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                {t.options.map((opt, optIdx) => (
                                                    <input
                                                        key={optIdx}
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => setErtakTest(prev => prev.map((q, i) => i === idx ? {
                                                            ...q,
                                                            options: q.options.map((o, oi) => oi === optIdx ? e.target.value : o)
                                                        } : q))}
                                                        placeholder={`${String.fromCharCode(65 + optIdx)} varianti...`}
                                                        className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 placeholder-gray-600"
                                                    />
                                                ))}
                                            </div>
                                            <div>
                                                <label className="text-gray-400 text-[10px] block mb-1">To'g'ri javob varianti:</label>
                                                <select
                                                    value={t.correct}
                                                    onChange={e => setErtakTest(prev => prev.map((q, i) => i === idx ? { ...q, correct: parseInt(e.target.value) } : q))}
                                                    className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                                                >
                                                    {t.options.map((_, optIdx) => (
                                                        <option key={optIdx} value={optIdx}>{String.fromCharCode(65 + optIdx)} varianti</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Audio fayl (Ixtiyoriy)</label>
                                <input type="file" accept="audio/*" onChange={(e) => setUploadFile(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Muqova rasmi (Ixtiyoriy)</label>
                                <input type="file" accept="image/*" onChange={(e) => setUploadImage(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white" />
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => { setCreateModal(null); setUploadImage(null); setUploadFile(null); }} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                        <button onClick={handleCreateErtak} disabled={saving || !ertakForm.title || !ertakForm.content} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                            {saving ? 'Yaratilmoqda...' : 'Yaratish'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Create Book Modal */}
            {createModal === 'book' && (
                <Modal title="Yangi kitob yaratish" onClose={() => setCreateModal(null)}>
                    <div className="space-y-3">
                        <Input label="Kitob nomi *" value={bookForm.title} onChange={(v) => setBookForm({ ...bookForm, title: v })} />
                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Kitob haqida izoh (Description) *</label>
                            <textarea
                                value={bookForm.description}
                                onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                                placeholder="Kitob haqida qisqacha izoh yozing..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Select label="Til" value={bookForm.language} options={['uz', 'ru', 'en']} onChange={(v) => setBookForm({ ...bookForm, language: v })} />
                            <Select label="Yosh guruhi" value={bookForm.age_group} options={['Barchasi', '5-7', '7-8', '8-9', '9-10', '10-11', '11-12', '12-17', '17+']} onChange={(v) => setBookForm({ ...bookForm, age_group: v })} />
                        </div>
                        
                        {/* Premium Checkbox */}
                        <div className="flex items-center gap-2 py-2 bg-gray-800/30 px-3 rounded-xl border border-gray-850">
                            <input
                                type="checkbox"
                                id="is_premium_book"
                                checked={bookForm.is_premium}
                                onChange={(e) => setBookForm({ ...bookForm, is_premium: e.target.checked })}
                                className="w-4 h-4 text-emerald-600 border-gray-700 bg-gray-800 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                            <label htmlFor="is_premium_book" className="text-gray-300 text-xs font-semibold cursor-pointer select-none">
                                Premium (Pullik - Oylik obunachilar uchun)
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-gray-800/40 p-3 rounded-xl border border-gray-800">
                            <div>
                                <Input 
                                    label="Savollar soni cheklovi (Min: 3)" 
                                    type="number" 
                                    value={bookForm.questions_limit} 
                                    onChange={(v) => setBookForm({ ...bookForm, questions_limit: parseInt(v) || 3 })} 
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Quiz payti tasodifiy tanlab olinadigan savollar soni.</p>
                            </div>
                            <div>
                                <Input 
                                    label="Testlar soni cheklovi (Ixtiyoriy)" 
                                    type="number" 
                                    value={bookForm.test_limit} 
                                    placeholder="Barchasi"
                                    onChange={(v) => setBookForm({ ...bookForm, test_limit: v })} 
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Tasodifiy tanlab olinadigan testlar soni.</p>
                            </div>
                        </div>

                        {/* ── Savollar bo'limi ── */}
                        <div className="border border-dashed border-gray-600 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-white text-sm font-semibold">❓ Savollar (Quiz)</p>
                                <button
                                    type="button"
                                    onClick={() => addQuestion(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Savol qo'shish
                                </button>
                            </div>

                            <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
                                <label className="text-gray-300 text-xs font-medium block mb-1.5">
                                    Matndan import qilish (Format: Savol? tagidan Javob: ...)
                                </label>
                                <textarea
                                    value={bulkQuestionsText}
                                    onChange={(e) => setBulkQuestionsText(e.target.value)}
                                    rows={3}
                                    placeholder={`Kitob kim haqida?\nJavob: Alisher Navoiy haqida.\nNavoiy nechanchi yilda tug'ilgan?\nJavob: 1441-yilda.`}
                                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 resize-none font-mono placeholder-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleBulkQuestionsImport(false, true)}
                                    className="w-full mt-2 py-1.5 bg-emerald-700/60 text-emerald-200 hover:bg-emerald-700 text-xs font-medium rounded-lg transition-colors border border-emerald-600/40"
                                >
                                    Savollarni import qilish
                                </button>
                            </div>

                            {bookQuestions.length === 0 ? (
                                <p className="text-gray-500 text-xs text-center py-2">Hali savol qo'shilmagan.</p>
                            ) : (
                                <div className="space-y-3">
                                    {bookQuestions.map((q, i) => (
                                        <div key={i} className="bg-gray-800/60 rounded-xl p-3 space-y-2 relative">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-xs font-medium">{i + 1}-savol</span>
                                                <button type="button" onClick={() => removeQuestion(i, true)} className="text-gray-600 hover:text-red-400 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={q.question}
                                                onChange={e => updateQuestion(i, 'question', e.target.value, true)}
                                                placeholder="Savol matni..."
                                                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                            />
                                            <input
                                                type="text"
                                                value={q.answer}
                                                onChange={e => updateQuestion(i, 'answer', e.target.value, true)}
                                                placeholder="To'g'ri javob..."
                                                className="w-full px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/40 rounded-lg text-emerald-300 text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Test bo'limi ── */}
                        <div className="border border-dashed border-gray-600 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-white text-sm font-semibold">📝 Testlar</p>
                                <button
                                    type="button"
                                    onClick={() => setBookTest(prev => [...prev, { question: '', options: ['', '', '', ''], correct: 0 }])}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Test qo'shish
                                </button>
                            </div>

                            <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
                                <label className="text-gray-300 text-xs font-medium block mb-1.5">
                                    Matndan import qilish
                                </label>
                                <textarea
                                    value={bulkTestsText}
                                    onChange={(e) => setBulkTestsText(e.target.value)}
                                    rows={3}
                                    placeholder={`1. Savol?\nA) Variant A\nB) Variant B\nTo'g'ri javob: B`}
                                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 resize-none font-mono placeholder-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleBulkTestsImport(false, true)}
                                    className="w-full mt-2 py-1.5 bg-blue-700/60 text-blue-200 hover:bg-blue-700 text-xs font-medium rounded-lg transition-colors border border-blue-600/40"
                                >
                                    Testlarni import qilish
                                </button>
                            </div>

                            {bookTest.length === 0 ? (
                                <p className="text-gray-500 text-xs text-center py-2">Hali test qo'shilmagan.</p>
                            ) : (
                                <div className="space-y-4">
                                    {bookTest.map((t, idx) => (
                                        <div key={idx} className="bg-gray-800/60 rounded-xl p-3 space-y-2 relative border border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-xs font-medium">{idx + 1}-test</span>
                                                <button type="button" onClick={() => setBookTest(prev => prev.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-red-400 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={t.question}
                                                onChange={e => setBookTest(prev => prev.map((q, i) => i === idx ? { ...q, question: e.target.value } : q))}
                                                placeholder="Savol..."
                                                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                {t.options.map((opt, optIdx) => (
                                                    <input
                                                        key={optIdx}
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => setBookTest(prev => prev.map((q, i) => i === idx ? {
                                                            ...q,
                                                            options: q.options.map((o, oi) => oi === optIdx ? e.target.value : o)
                                                        } : q))}
                                                        placeholder={`${String.fromCharCode(65 + optIdx)} varianti...`}
                                                        className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                                                    />
                                                ))}
                                            </div>
                                            <div>
                                                <select
                                                    value={t.correct}
                                                    onChange={e => setBookTest(prev => prev.map((q, i) => i === idx ? { ...q, correct: parseInt(e.target.value) } : q))}
                                                    className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                                                >
                                                    {t.options.map((_, optIdx) => (
                                                        <option key={optIdx} value={optIdx}>{String.fromCharCode(65 + optIdx)} varianti</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Kitob PDF fayli *</label>
                                <input type="file" accept=".pdf" onChange={(e) => setUploadFile(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Muqova rasmi (Ixtiyoriy)</label>
                                <input type="file" accept="image/*" onChange={(e) => setUploadImage(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white" />
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => { setCreateModal(null); setUploadImage(null); setUploadFile(null); }} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                        <button onClick={handleCreateBook} disabled={saving || !bookForm.title || !bookForm.description} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            {saving ? 'Yaratilmoqda...' : 'Kitobni yaratish'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Edit Ertak Modal */}
            {editErtak && (
                <Modal title={`Ertakni tahrirlash: ${editErtak.title}`} onClose={() => { setEditErtak(null); setUploadImage(null); setUploadFile(null); setEditErtakQuestions([]); }}>
                    <div className="space-y-3">
                        <Input label="Nomi *" value={editErtakForm.title} onChange={(v) => setEditErtakForm({ ...editErtakForm, title: v })} />
                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Mazmuni *</label>
                            <textarea
                                value={editErtakForm.content}
                                onChange={(e) => setEditErtakForm({ ...editErtakForm, content: e.target.value })}
                                rows={6}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Select label="Til" value={editErtakForm.language} options={['uz', 'ru', 'en']} onChange={(v) => setEditErtakForm({ ...editErtakForm, language: v })} />
                            <Select label="Yosh guruhi" value={editErtakForm.age_group} options={['Barchasi', '5-7', '7-8', '8-9', '9-10', '10-11', '11-12', '12-17', '17+']} onChange={(v) => setEditErtakForm({ ...editErtakForm, age_group: v })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-gray-800/40 p-3 rounded-xl border border-gray-800">
                            <div>
                                <Input 
                                    label="Savollar soni cheklovi (Min: 3)" 
                                    type="number" 
                                    value={editErtakForm.questions_limit} 
                                    onChange={(v) => setEditErtakForm({ ...editErtakForm, questions_limit: parseInt(v) || 3 })} 
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Quiz payti tasodifiy tanlab olinadigan savollar soni.</p>
                            </div>
                            <div>
                                <Input 
                                    label="Testlar soni cheklovi (Ixtiyoriy)" 
                                    type="number" 
                                    value={editErtakForm.test_limit} 
                                    placeholder="Barchasi"
                                    onChange={(v) => setEditErtakForm({ ...editErtakForm, test_limit: v })} 
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Tasodifiy tanlab olinadigan testlar soni.</p>
                            </div>
                        </div>

                        {/* ── Savollar bo'limi ── */}
                        <div className="border border-dashed border-gray-600 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-white text-sm font-semibold">❓ Savollar (Quiz)</p>
                                <button
                                    onClick={() => setEditErtakQuestions([...editErtakQuestions, { question: '', answer: '' }])}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Savol qo'shish
                                </button>
                            </div>

                            <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
                                <label className="text-gray-300 text-xs font-medium block mb-1.5">
                                    Matndan import qilish
                                </label>
                                <textarea
                                    value={editBulkQuestionsText}
                                    onChange={(e) => setEditBulkQuestionsText(e.target.value)}
                                    rows={3}
                                    placeholder={`Bolalar qayerga kelishdi?\nJavob: Bog'ga kelishdi.`}
                                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 resize-none font-mono placeholder-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleBulkQuestionsImport(true, false)}
                                    className="w-full mt-2 py-1.5 bg-emerald-700/60 text-emerald-200 hover:bg-emerald-700 text-xs font-medium rounded-lg transition-colors border border-emerald-600/40"
                                >
                                    Savollarni import qilish
                                </button>
                            </div>

                            {editErtakQuestions.length === 0 ? (
                                <p className="text-gray-500 text-xs text-center py-2">Hali savol qo'shilmagan.</p>
                            ) : (
                                <div className="space-y-3">
                                    {editErtakQuestions.map((q, i) => (
                                        <div key={i} className="bg-gray-800/60 rounded-xl p-3 space-y-2 relative">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-xs font-medium">{i + 1}-savol</span>
                                                <button onClick={() => setEditErtakQuestions(editErtakQuestions.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={q.question}
                                                onChange={e => {
                                                    const n = [...editErtakQuestions];
                                                    n[i].question = e.target.value;
                                                    setEditErtakQuestions(n);
                                                }}
                                                placeholder="Savol matni..."
                                                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                            />
                                            <input
                                                type="text"
                                                value={q.answer}
                                                onChange={e => {
                                                    const n = [...editErtakQuestions];
                                                    n[i].answer = e.target.value;
                                                    setEditErtakQuestions(n);
                                                }}
                                                placeholder="To'g'ri javob..."
                                                className="w-full px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/40 rounded-lg text-emerald-300 text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Test bo'limi ── */}
                        <div className="border border-dashed border-gray-600 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-white text-sm font-semibold">📝 Ko'p tanlovli test (Multiple Choice)</p>
                                <button
                                    type="button"
                                    onClick={() => setEditErtakTest(prev => [...prev, { question: '', options: ['', '', '', ''], correct: 0 }])}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Test qo'shish
                                </button>
                            </div>

                            <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
                                <label className="text-gray-300 text-xs font-medium block mb-1.5">
                                    Matndan import qilish
                                </label>
                                <textarea
                                    value={editBulkTestsText}
                                    onChange={(e) => setEditBulkTestsText(e.target.value)}
                                    rows={3}
                                    placeholder={`1. Savol?\nA) Variant A\nB) Variant B\nTo'g'ri javob: B`}
                                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 resize-none font-mono placeholder-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleBulkTestsImport(true, false)}
                                    className="w-full mt-2 py-1.5 bg-blue-700/60 text-blue-200 hover:bg-blue-700 text-xs font-medium rounded-lg transition-colors border border-blue-600/40"
                                >
                                    Testlarni import qilish
                                </button>
                            </div>

                            {editErtakTest.length === 0 ? (
                                <p className="text-gray-500 text-xs text-center py-2">Hali test qo'shilmagan.</p>
                            ) : (
                                <div className="space-y-4">
                                    {editErtakTest.map((t, idx) => (
                                        <div key={idx} className="bg-gray-800/60 rounded-xl p-3 space-y-2 relative border border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-xs font-medium">{idx + 1}-test</span>
                                                <button type="button" onClick={() => setEditErtakTest(prev => prev.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-red-400 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={t.question}
                                                onChange={e => setEditErtakTest(prev => prev.map((q, i) => i === idx ? { ...q, question: e.target.value } : q))}
                                                placeholder="Savol matni..."
                                                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                {t.options?.map((opt, optIdx) => (
                                                    <input
                                                        key={optIdx}
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => setEditErtakTest(prev => prev.map((q, i) => i === idx ? {
                                                            ...q,
                                                            options: q.options.map((o, oi) => oi === optIdx ? e.target.value : o)
                                                        } : q))}
                                                        placeholder={`${String.fromCharCode(65 + optIdx)} varianti...`}
                                                        className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                                                    />
                                                ))}
                                            </div>
                                            <div>
                                                <select
                                                    value={t.correct}
                                                    onChange={e => setEditErtakTest(prev => prev.map((q, i) => i === idx ? { ...q, correct: parseInt(e.target.value) } : q))}
                                                    className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                                                >
                                                    {t.options?.map((_, optIdx) => (
                                                        <option key={optIdx} value={optIdx}>{String.fromCharCode(65 + optIdx)} varianti</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Audio (Ixtiyoriy)</label>
                                <input type="file" accept="audio/*" onChange={(e) => setUploadFile(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white" />
                                {editErtak.audio_url && <p className="text-[10px] text-emerald-400 mt-1 truncate">Mavjud: {editErtak.audio_url.split('/').pop()}</p>}
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Rasm (Ixtiyoriy)</label>
                                <input type="file" accept="image/*" onChange={(e) => setUploadImage(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white" />
                                {editErtak.image_url && <p className="text-[10px] text-blue-400 mt-1 truncate">Mavjud: {editErtak.image_url.split('/').pop()}</p>}
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => { setEditErtak(null); setUploadImage(null); setUploadFile(null); setEditErtakQuestions([]); }} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                        <button onClick={handleUpdateErtak} disabled={saving || !editErtakForm.title || !editErtakForm.content} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Saqlanmoqda...' : 'O\'zgartirishni saqlash'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* Edit Book Modal */}
            {editBook && (
                <Modal title={`Kitobni tahrirlash: ${editBook.title}`} onClose={() => { setEditBook(null); setUploadImage(null); setUploadFile(null); setEditBookQuestions([]); }}>
                    <div className="space-y-3">
                        <Input label="Kitob nomi *" value={editBookForm.title} onChange={(v) => setEditBookForm({ ...editBookForm, title: v })} />
                        <div>
                            <label className="text-gray-400 text-xs mb-1 block">Kitob haqida izoh (Description) *</label>
                            <textarea
                                value={editBookForm.description}
                                onChange={(e) => setEditBookForm({ ...editBookForm, description: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Select label="Til" value={editBookForm.language} options={['uz', 'ru', 'en']} onChange={(v) => setEditBookForm({ ...editBookForm, language: v })} />
                            <Select label="Yosh guruhi" value={editBookForm.age_group} options={['Barchasi', '5-7', '7-8', '8-9', '9-10', '10-11', '11-12', '12-17', '17+']} onChange={(v) => setEditBookForm({ ...editBookForm, age_group: v })} />
                        </div>
                        
                        {/* Premium Checkbox */}
                        <div className="flex items-center gap-2 py-2 bg-gray-800/30 px-3 rounded-xl border border-gray-850">
                            <input
                                type="checkbox"
                                id="edit_is_premium_book"
                                checked={editBookForm.is_premium}
                                onChange={(e) => setEditBookForm({ ...editBookForm, is_premium: e.target.checked })}
                                className="w-4 h-4 text-emerald-600 border-gray-700 bg-gray-800 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                            <label htmlFor="edit_is_premium_book" className="text-gray-300 text-xs font-semibold cursor-pointer select-none">
                                Premium (Pullik - Oylik obunachilar uchun)
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-gray-800/40 p-3 rounded-xl border border-gray-800">
                            <div>
                                <Input 
                                    label="Savollar soni cheklovi (Min: 3)" 
                                    type="number" 
                                    value={editBookForm.questions_limit} 
                                    onChange={(v) => setEditBookForm({ ...editBookForm, questions_limit: parseInt(v) || 3 })} 
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Quiz payti tasodifiy tanlab olinadigan savollar soni.</p>
                            </div>
                            <div>
                                <Input 
                                    label="Testlar soni cheklovi (Ixtiyoriy)" 
                                    type="number" 
                                    value={editBookForm.test_limit} 
                                    placeholder="Barchasi"
                                    onChange={(v) => setEditBookForm({ ...editBookForm, test_limit: v })} 
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Tasodifiy tanlab olinadigan testlar soni.</p>
                            </div>
                        </div>

                        {/* ── Savollar bo'limi ── */}
                        <div className="border border-dashed border-gray-600 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-white text-sm font-semibold">❓ Savollar (Quiz)</p>
                                <button
                                    type="button"
                                    onClick={() => addQuestion(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Savol qo'shish
                                </button>
                            </div>

                            <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
                                <label className="text-gray-300 text-xs font-medium block mb-1.5">
                                    Matndan import qilish
                                </label>
                                <textarea
                                    value={editBulkQuestionsText}
                                    onChange={(e) => setEditBulkQuestionsText(e.target.value)}
                                    rows={3}
                                    placeholder={`Kitob kim haqida?\nJavob: Alisher Navoiy haqida.`}
                                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 resize-none font-mono placeholder-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleBulkQuestionsImport(true, true)}
                                    className="w-full mt-2 py-1.5 bg-emerald-700/60 text-emerald-200 hover:bg-emerald-700 text-xs font-medium rounded-lg transition-colors border border-emerald-600/40"
                                >
                                    Savollarni import qilish
                                </button>
                            </div>

                            {editBookQuestions.length === 0 ? (
                                <p className="text-gray-500 text-xs text-center py-2">Hali savol qo'shilmagan.</p>
                            ) : (
                                <div className="space-y-3">
                                    {editBookQuestions.map((q, i) => (
                                        <div key={i} className="bg-gray-800/60 rounded-xl p-3 space-y-2 relative">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-xs font-medium">{i + 1}-savol</span>
                                                <button type="button" onClick={() => removeQuestion(i, true)} className="text-gray-600 hover:text-red-400 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={q.question}
                                                onChange={e => updateQuestion(i, 'question', e.target.value, true)}
                                                placeholder="Savol matni..."
                                                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                            />
                                            <input
                                                type="text"
                                                value={q.answer}
                                                onChange={e => updateQuestion(i, 'answer', e.target.value, true)}
                                                placeholder="To'g'ri javob..."
                                                className="w-full px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/40 rounded-lg text-emerald-300 text-xs focus:outline-none focus:border-emerald-500 placeholder-gray-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Test bo'limi ── */}
                        <div className="border border-dashed border-gray-600 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-white text-sm font-semibold">📝 Testlar</p>
                                <button
                                    type="button"
                                    onClick={() => setEditBookTest(prev => [...prev, { question: '', options: ['', '', '', ''], correct: 0 }])}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Test qo'shish
                                </button>
                            </div>

                            <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
                                <label className="text-gray-300 text-xs font-medium block mb-1.5">
                                    Matndan import qilish
                                </label>
                                <textarea
                                    value={editBulkTestsText}
                                    onChange={(e) => setEditBulkTestsText(e.target.value)}
                                    rows={3}
                                    placeholder={`1. Savol?\nA) Variant A\nB) Variant B\nTo'g'ri javob: B`}
                                    className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500 resize-none font-mono placeholder-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleBulkTestsImport(true, true)}
                                    className="w-full mt-2 py-1.5 bg-blue-700/60 text-blue-200 hover:bg-blue-700 text-xs font-medium rounded-lg transition-colors border border-blue-600/40"
                                >
                                    Testlarni import qilish
                                </button>
                            </div>

                            {editBookTest.length === 0 ? (
                                <p className="text-gray-500 text-xs text-center py-2">Hali test qo'shilmagan.</p>
                            ) : (
                                <div className="space-y-4">
                                    {editBookTest.map((t, idx) => (
                                        <div key={idx} className="bg-gray-800/60 rounded-xl p-3 space-y-2 relative border border-gray-700">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-xs font-medium">{idx + 1}-test</span>
                                                <button type="button" onClick={() => setEditBookTest(prev => prev.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-red-400 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={t.question}
                                                onChange={e => setEditBookTest(prev => prev.map((q, i) => i === idx ? { ...q, question: e.target.value } : q))}
                                                placeholder="Savol..."
                                                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                {t.options?.map((opt, optIdx) => (
                                                    <input
                                                        key={optIdx}
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => setEditBookTest(prev => prev.map((q, i) => i === idx ? {
                                                            ...q,
                                                            options: q.options.map((o, oi) => oi === optIdx ? e.target.value : o)
                                                        } : q))}
                                                        placeholder={`${String.fromCharCode(65 + optIdx)} varianti...`}
                                                        className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                                                    />
                                                ))}
                                            </div>
                                            <div>
                                                <select
                                                    value={t.correct}
                                                    onChange={e => setEditBookTest(prev => prev.map((q, i) => i === idx ? { ...q, correct: parseInt(e.target.value) } : q))}
                                                    className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                                                >
                                                    {t.options?.map((_, optIdx) => (
                                                        <option key={optIdx} value={optIdx}>{String.fromCharCode(65 + optIdx)} varianti</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Yangi Kitob PDF (Ixtiyoriy)</label>
                                <input type="file" accept=".pdf" onChange={(e) => setUploadFile(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white" />
                                {editBook.pdf_url && <p className="text-[10px] text-emerald-400 mt-1 truncate">Mavjud: {editBook.pdf_url.split('/').pop()}</p>}
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs mb-1 block">Yangi Muqova (Ixtiyoriy)</label>
                                <input type="file" accept="image/*" onChange={(e) => setUploadImage(e.target.files[0] || null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white" />
                                {editBook.image_url && <p className="text-[10px] text-blue-400 mt-1 truncate">Mavjud: {editBook.image_url.split('/').pop()}</p>}
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => { setEditBook(null); setUploadImage(null); setUploadFile(null); setEditBookQuestions([]); }} className="px-4 py-2 text-gray-400 text-sm">Bekor</button>
                        <button onClick={handleUpdateBook} disabled={saving || !editBookForm.title || !editBookForm.description} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            {saving ? 'Saqlanmoqda...' : 'O\'zgartirishni saqlash'}
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
