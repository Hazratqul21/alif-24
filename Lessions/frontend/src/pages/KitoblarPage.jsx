import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, BookOpen, ChevronRight, ChevronLeft, RotateCcw, 
    ChevronDown, CheckCircle2, Trophy, ZoomIn, ZoomOut, X, 
    Lock, Sparkles, HelpCircle, FileText, ArrowRight
} from 'lucide-react';
import apiService from '../services/apiService';

let API_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';
if (API_URL.startsWith('http://') && window.location.protocol === 'https:') {
    API_URL = API_URL.replace('http://', 'https://');
}

// ─── PAGE TRANSLATION CONFIG ───────────────────────────────────────────────────
const PAGE_CONFIG = {
    uz: { 
        title: '✨ Kitoblar olami', 
        headerTitle: 'Kitoblar', 
        back: 'Ortga', 
        empty: 'Hozircha kitoblar yo\'q', 
        retry: 'Qayta o\'qish',
        read: 'O\'qish',
        quiz: 'Savollar',
        test: 'Testlar',
        premiumBadge: 'Premium',
        freeBadge: 'Bepul',
        lockedTitle: 'Premium obuna zarur',
        lockedDesc: 'Ushbu premium kitobni o\'qish va testlarni yechish uchun premium obuna bo\'lishingiz lozim.',
        lockedBtn: 'Obunani faollashtirish',
        lockBenefits: [
            '📚 Barcha premium asarlardan cheksiz foydalanish',
            '🧠 Aqlli interaktiv savollar va AI testlar',
            '🏆 O\'zlashtirish va o\'sish reytingini kuzatish'
        ],
        langFlags: { uz: '🇺🇿 O\'zb', ru: '🇷🇺 Rus', en: '🇬🇧 Eng' } 
    },
    ru: { 
        title: '✨ Мир книг', 
        headerTitle: 'Книги', 
        back: 'Назад', 
        empty: 'Книг пока нет', 
        retry: 'Читать снова',
        read: 'Читать',
        quiz: 'Вопросы',
        test: 'Тесты',
        premiumBadge: 'Премиум',
        freeBadge: 'Бесплатно',
        lockedTitle: 'Требуется премиум подписка',
        lockedDesc: 'Чтобы читать эту премиум-книгу и проходить тесты, вам необходима активная премиум-подписка.',
        lockedBtn: 'Активировать подписку',
        lockBenefits: [
            '📚 Доступ ко всем премиум-книгам без ограничений',
            '🧠 Умные интерактивные вопросы и тесты',
            '🏆 Отслеживание вашего прогресса и рейтинга'
        ],
        langFlags: { uz: '🇺🇿 Узб', ru: '🇷🇺 Рус', en: '🇬🇧 Анг' } 
    },
    en: { 
        title: '✨ World of Books', 
        headerTitle: 'Books', 
        back: 'Back', 
        empty: 'No books available yet', 
        retry: 'Read again',
        read: 'Read',
        quiz: 'Questions',
        test: 'Tests',
        premiumBadge: 'Premium',
        freeBadge: 'Free',
        lockedTitle: 'Premium subscription required',
        lockedDesc: 'To read this premium book and take quizzes/tests, you need an active premium subscription.',
        lockedBtn: 'Activate subscription',
        lockBenefits: [
            '📚 Unlimited access to all premium books',
            '🧠 Smart interactive quizzes and exams',
            '🏆 Track your learning progress and rank'
        ],
        langFlags: { uz: '🇺🇿 Uzb', ru: '🇷🇺 Rus', en: '🇬🇧 Eng' } 
    }
};

// Helper for rendering PDF.js page onto HTML5 canvas
const renderPage = async (pdfDoc, pageNum, canvasEl, scale) => {
    if (!pdfDoc || !canvasEl) return;
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const context = canvasEl.getContext('2d');
        canvasEl.height = viewport.height;
        canvasEl.width = viewport.width;
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        await page.render(renderContext).promise;
    } catch (err) {
        console.error("Error rendering page:", err);
    }
};

// Canvas Page Renderer Component
function PDFCanvasPage({ pdfDoc, pageNum, scale = 1.2 }) {
    const canvasRef = useRef(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        if (pdfDoc && pageNum) {
            renderPage(pdfDoc, pageNum, canvasRef.current, scale).then(() => {
                if (isMounted) setLoading(false);
            });
        }
        return () => { isMounted = false; };
    }, [pdfDoc, pageNum, scale]);

    return (
        <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-white shadow-2xl flex items-center justify-center min-h-[350px]">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-950/60 backdrop-blur-xs">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
            <canvas ref={canvasRef} className="max-w-full h-auto object-contain max-h-[70vh]" />
        </div>
    );
}

// ─── PHASE 3: MULTIPLE CHOICE TESTS ──────────────────────────────────────────
function MultipleChoicePhase({ test, testLimit, onDone }) {
    const shuffledTest = useMemo(() => {
        if (!test || test.length === 0) return [];
        let list = [...test];
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        if (testLimit !== undefined && testLimit !== null && testLimit > 0) {
            return list.slice(0, testLimit);
        }
        return list;
    }, [test, testLimit]);

    const [qIndex, setQIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [correctCount, setCorrectCount] = useState(0);

    const currentQ = shuffledTest[qIndex];
    const isLast = qIndex === shuffledTest.length - 1;

    const handleOptionSelect = (idx) => {
        setSelectedOption(idx);
    };

    const handleNext = () => {
        if (selectedOption === null) return;
        
        let newCorrect = correctCount;
        if (selectedOption === currentQ?.correct) {
            newCorrect += 1;
            setCorrectCount(newCorrect);
        }

        if (isLast) {
            const finalScore = Math.round((newCorrect / shuffledTest.length) * 100);
            onDone(finalScore);
        } else {
            setSelectedOption(null);
            setQIndex(prev => prev + 1);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
                <p className="text-white/50 text-xs">Test {qIndex + 1} / {shuffledTest.length}</p>
                <p className="text-white/40 text-xs">To'g'ri: {correctCount}</p>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all" style={{ width: `${((qIndex + 1) / shuffledTest.length) * 100}%` }} />
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                <p className="text-white text-lg font-bold">{currentQ?.question}</p>
            </div>

            <div className="flex flex-col gap-3">
                {currentQ?.options?.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    return (
                        <button
                            key={idx}
                            onClick={() => handleOptionSelect(idx)}
                            className={`w-full py-4 px-5 text-left rounded-2xl text-sm font-semibold transition-all border flex items-center justify-between ${
                                isSelected
                                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                                    : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/80 hover:text-white'
                            }`}
                        >
                            <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                        </button>
                    );
                })}
            </div>

            <button
                onClick={handleNext}
                disabled={selectedOption === null}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 disabled:from-blue-600/40 disabled:to-indigo-600/40 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/10 enabled:hover:scale-[1.02]"
            >
                {isLast ? "Natijani ko'rish" : "Keyingi savol"}
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}

// ─── QUIZ & QUESTIONS MODAL ────────────────────────────────────────────────────
function QuizModal({ book, onClose, readingStats = {} }) {
    const questions = useMemo(() => {
        if (!book.questions || book.questions.length === 0) return [];
        let list = [...book.questions];
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        const limit = book.questions_limit !== undefined && book.questions_limit !== null ? book.questions_limit : 3;
        return list.slice(0, Math.max(3, limit));
    }, [book]);

    const hasQuestions = questions.length > 0;
    const hasTest = book.test && book.test.length > 0;
    
    const getInitialStep = () => {
        if (book.forceTestDirect && hasTest) return 'test';
        if (book.forceQuizDirect && hasQuestions) return 'quiz';
        return hasQuestions ? 'quiz' : (hasTest ? 'test' : 'result');
    };

    const [step, setStep] = useState(getInitialStep());
    const [qIndex, setQIndex] = useState(0);
    const [answerText, setAnswerText] = useState('');
    const [scores, setScores] = useState([]);
    const [evaluating, setEvaluating] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    
    const [testScore, setTestScore] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const currentQ = questions[qIndex];
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0;

    const submitResult = async (finalScores, finalTestScore = null) => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const avg = finalScores.length ? Math.round(finalScores.reduce((a, b) => a + b.score, 0) / finalScores.length) : 0;
            const payload = {
                quiz_score: avg,
                test_score: finalTestScore !== null ? finalTestScore : 0
            };

            await apiService.post(`/kitoblar/${book.id}/complete`, payload);
        } catch (e) {
            console.error("Natijani saqlashda xatolik:", e);
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (step === 'result' && !submitting) {
            submitResult(scores, testScore);
        }
    }, [step]);

    const evaluateText = async () => {
        if (!answerText.trim()) return;
        setEvaluating(true);
        try {
            const res = await fetch(`${API_URL}/evaluate-quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    story_text: book.description || book.title,
                    question: currentQ.question,
                    child_answer: answerText,
                    language: book.language || 'uz',
                    correct_answer: currentQ.answer
                }),
                credentials: 'include'
            });
            const json = await res.json();
            const d = json.data || {};
            setScores(prev => [...prev, {
                score: d.score ?? 0,
                recognized: answerText,
                correct: d.feedback || currentQ.answer,
                passed: d.passed ?? false,
            }]);
        } catch (err) {
            console.error("AI evaluation failed:", err);
            setScores(prev => [...prev, { score: 60, recognized: answerText, correct: currentQ.answer, passed: true }]);
        } finally {
            setEvaluating(false);
            setShowFeedback(true);
        }
    };

    const nextQuestion = () => {
        setShowFeedback(false);
        setAnswerText('');
        if (qIndex + 1 >= questions.length) {
            if (hasTest) {
                setStep('test');
            } else {
                setStep('result');
            }
        } else {
            setQIndex(i => i + 1);
        }
    };

    const handleSkipToTest = () => {
        if (hasTest) {
            setStep('test');
        } else {
            setStep('result');
        }
    };

    const scoreColor = s => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';
    const scoreBg = s => s >= 80 ? 'bg-emerald-500/20 border-emerald-500/30' : s >= 50 ? 'bg-amber-500/20 border-amber-500/30' : 'bg-red-500/20 border-red-500/30';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="relative bg-gradient-to-br from-[#0c0c1e] to-[#141432] border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col z-10"
                style={{ maxHeight: '94vh', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white z-10 p-1.5 rounded-lg bg-white/5">
                    <X className="w-5 h-5" />
                </button>

                {submitting && (
                    <div className="flex flex-col items-center gap-4 py-12">
                        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-white/50 text-sm">Natijalar saqlanmoqda...</p>
                    </div>
                )}

                {!submitting && step === 'quiz' && (
                    <>
                        <div className="mb-5">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-white/60 text-xs">Savol {qIndex + 1} / {questions.length}</p>
                                {scores.length > 0 && (
                                    <p className="text-xs text-white/40">O'rtacha: <span className={scoreColor(avgScore)}>{avgScore}/100</span></p>
                                )}
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all"
                                    style={{ width: `${(qIndex / questions.length) * 100}%` }} />
                            </div>
                        </div>

                        {hasTest && (
                            <button
                                onClick={handleSkipToTest}
                                className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-xl text-xs font-bold transition-all border border-blue-500/20 flex items-center justify-center gap-2 mb-4 hover:scale-[1.01]"
                            >
                                Testga o'tish 📝
                            </button>
                        )}

                        <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/5">
                            <p className="text-indigo-400 text-xs mb-1.5 uppercase tracking-wide font-black">Savol {qIndex + 1}</p>
                            <p className="text-white text-lg font-semibold leading-relaxed">{currentQ?.question}</p>
                        </div>

                        {!showFeedback ? (
                            <div className="flex flex-col gap-4">
                                <textarea
                                    value={answerText}
                                    onChange={(e) => setAnswerText(e.target.value)}
                                    placeholder="Javobingizni shu yerga batafsil yozing..."
                                    rows={4}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                />

                                {evaluating ? (
                                    <div className="flex flex-col items-center gap-2 py-4">
                                        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                        <p className="text-white/40 text-xs">AI javobingizni baholamoqda...</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={evaluateText}
                                        disabled={!answerText.trim()}
                                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 disabled:from-indigo-650/40 disabled:to-violet-650/40 text-white rounded-2xl font-bold text-base hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                                    >
                                        Javobni yuborish
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className={`border rounded-2xl p-5 flex flex-col items-center text-center ${scoreBg(scores[qIndex].score)}`}>
                                    <Trophy className="w-8 h-8 text-yellow-400 mb-1" />
                                    <p className="text-white/60 text-xs font-bold uppercase tracking-wider">AI Ballingiz</p>
                                    <p className={`text-4xl font-black ${scoreColor(scores[qIndex].score)} mt-1`}>
                                        {scores[qIndex].score} / 100
                                    </p>
                                    <div className="mt-3 text-white/80 text-xs leading-relaxed border-t border-white/10 pt-3">
                                        <p className="font-semibold text-white mb-1">Qayta aloqa:</p>
                                        {scores[qIndex].correct}
                                    </div>
                                </div>

                                <button
                                    onClick={nextQuestion}
                                    className="w-full py-3.5 bg-gradient-to-r from-indigo-650 to-violet-650 text-white rounded-2xl font-bold text-base hover:scale-[1.01] transition-transform"
                                >
                                    {qIndex + 1 >= questions.length ? (hasTest ? 'Testlarga o\'tish' : 'Tugatish') : 'Keyingi savol'}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {!submitting && step === 'test' && (
                    <MultipleChoicePhase
                        test={book.test || []}
                        testLimit={book.test_limit}
                        onDone={(score) => {
                            setTestScore(score);
                            setStep('result');
                        }}
                    />
                )}

                {!submitting && step === 'result' && (
                    <div className="flex flex-col items-center gap-5 pt-2">
                        <div className="text-6xl animate-bounce">🏆</div>
                        <div className="text-center">
                            <p className="text-white font-black text-2xl mb-1 uppercase tracking-tight">Umumiy natija</p>
                            <p className="text-white/40 text-xs">{book.title}</p>
                        </div>

                        <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 flex justify-around text-center gap-2">
                            {hasQuestions && (
                                <div className="bg-gradient-to-br from-indigo-600/35 to-violet-600/10 rounded-2xl p-4 flex-1 text-center border border-white/10 relative overflow-hidden">
                                    <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mb-1">Savol-javob</p>
                                    <p className="text-white text-3xl font-black">{avgScore}</p>
                                </div>
                            )}

                            {hasTest && (
                                <div className="bg-gradient-to-br from-blue-600/35 to-cyan-600/10 rounded-2xl p-4 flex-1 text-center border border-white/10 relative overflow-hidden">
                                    <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mb-1">Test bali</p>
                                    <p className="text-white text-3xl font-black">{testScore !== null ? testScore : 0}</p>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform shadow-xl shadow-indigo-500/20"
                        >
                            Yopish
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

// ─── PDF READER MODAL WITH DOUBLE-PAGE 3D FLIPPING ────────────────────────────
function PDFReaderModal({ book, onClose, onFinished }) {
    const [pdfjs, setPdfjs] = useState(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.1);
    const [loading, setLoading] = useState(true);
    const [showDesc, setShowDesc] = useState(false);
    const [direction, setDirection] = useState(1); // 1 = right, -1 = left

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load PDF.js CDN
    useEffect(() => {
        const loadLib = async () => {
            try {
                if (window.pdfjsLib) {
                    setPdfjs(window.pdfjsLib);
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                script.onload = () => {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    setPdfjs(window.pdfjsLib);
                };
                document.head.appendChild(script);
            } catch (err) {
                console.error("Failed to load PDF.js CDN", err);
            }
        };
        loadLib();
    }, []);

    // Fetch PDF File using credentials
    useEffect(() => {
        if (!pdfjs) return;
        const fetchPdf = async () => {
            setLoading(true);
            try {
                const pdf = await pdfjs.getDocument({
                    url: book.pdf_url,
                    withCredentials: true
                }).promise;
                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
            } catch (err) {
                console.error("Error loading PDF document:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPdf();
    }, [pdfjs, book.pdf_url]);

    const handleNext = () => {
        setDirection(1);
        if (isMobile) {
            if (currentPage < numPages) setCurrentPage(p => p + 1);
        } else {
            if (currentPage === 1) {
                setCurrentPage(2);
            } else if (currentPage + 2 <= numPages) {
                setCurrentPage(p => p + 2);
            } else if (currentPage + 1 <= numPages) {
                setCurrentPage(p => p + 1); // Last odd page
            }
        }
    };

    const handlePrev = () => {
        setDirection(-1);
        if (isMobile) {
            if (currentPage > 1) setCurrentPage(p => p - 1);
        } else {
            if (currentPage === 2) {
                setCurrentPage(1);
            } else if (currentPage > 2) {
                setCurrentPage(p => p - 2);
            }
        }
    };

    const zoomIn = () => setScale(s => Math.min(s + 0.15, 2.0));
    const zoomOut = () => setScale(s => Math.max(s - 0.15, 0.6));

    const pageFlipVariants = {
        initial: (dir) => ({
            rotateY: dir > 0 ? 80 : -80,
            opacity: 0.3,
            transformOrigin: dir > 0 ? "right center" : "left center",
        }),
        animate: {
            rotateY: 0,
            opacity: 1,
            transition: { duration: 0.5, ease: "easeOut" }
        },
        exit: (dir) => ({
            rotateY: dir > 0 ? -80 : 80,
            opacity: 0.3,
            transformOrigin: dir > 0 ? "left center" : "right center",
            transition: { duration: 0.5, ease: "easeIn" }
        })
    };

    const hasReachedEnd = isMobile 
        ? currentPage === numPages
        : (currentPage === numPages || (currentPage + 1 >= numPages && currentPage > 1));

    return (
        <div className="fixed inset-0 z-50 bg-[#070714] text-white flex flex-col">
            {/* Header */}
            <header className="shrink-0 bg-[#0e0e24] border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onClose} 
                        className="bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all mr-2 hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-black text-base md:text-lg leading-tight text-white tracking-tight">{book.title}</h2>
                        <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-black">Interaktiv Kitob</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowDesc(true)}
                        className="px-4 py-2 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-200 hover:from-violet-600/30 hover:to-indigo-600/30 transition-all text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                    >
                        Kitob haqida ℹ️
                    </button>

                    <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block" />

                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
                        <button onClick={zoomOut} className="p-1.5 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-colors">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono px-1 min-w-[35px] text-center text-white/50">{Math.round(scale * 100)}%</span>
                        <button onClick={zoomIn} className="p-1.5 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-colors">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Reading Window */}
            <main className="flex-1 relative overflow-y-auto px-4 py-6 flex items-center justify-center min-h-0 bg-[#070714]">
                {loading ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-white/40 text-xs font-semibold">Kitob yuklanmoqda...</p>
                    </div>
                ) : (
                    <div className="relative w-full max-w-6xl flex justify-center items-center">
                        <AnimatePresence initial={false} custom={direction} mode="wait">
                            <motion.div
                                key={currentPage}
                                custom={direction}
                                variants={pageFlipVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="w-full flex justify-center gap-6"
                                style={{ perspective: 1200, transformStyle: "preserve-3d" }}
                            >
                                {isMobile || currentPage === 1 ? (
                                    // Single page centered
                                    <div className="w-full max-w-md">
                                        <PDFCanvasPage pdfDoc={pdfDoc} pageNum={currentPage} scale={scale} />
                                    </div>
                                ) : (
                                    // Double pages side-by-side
                                    <div className="grid grid-cols-2 gap-6 w-full">
                                        <div className="flex justify-end">
                                            <div className="w-full max-w-md">
                                                <PDFCanvasPage pdfDoc={pdfDoc} pageNum={currentPage} scale={scale} />
                                            </div>
                                        </div>
                                        <div className="flex justify-start">
                                            <div className="w-full max-w-md">
                                                {currentPage + 1 <= numPages ? (
                                                    <PDFCanvasPage pdfDoc={pdfDoc} pageNum={currentPage + 1} scale={scale} />
                                                ) : (
                                                    <div className="w-full max-w-md aspect-[3/4] border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center bg-white/1 text-white/20">
                                                        <FileText className="w-12 h-12 stroke-[1.2]" />
                                                        <p className="text-[10px] mt-2 font-mono uppercase tracking-wider">Kitob Yakuni</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )}
            </main>

            {/* Footer Navigation Bar */}
            <footer className="shrink-0 bg-[#0e0e24] border-t border-white/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
                {/* Page info */}
                <div className="text-white/60 text-xs font-semibold flex items-center gap-2">
                    <span className="text-white">Varaq:</span> 
                    <span className="font-mono bg-white/5 px-2.5 py-1 rounded-lg text-indigo-400 font-bold border border-white/5">
                        {isMobile ? currentPage : (currentPage === 1 ? '1' : `${currentPage} - ${Math.min(currentPage + 1, numPages)}`)}
                    </span> 
                    <span>/ {numPages}</span>
                </div>

                {/* Slider / Navigator */}
                <div className="flex-1 max-w-md mx-6 w-full hidden md:block">
                    <input 
                        type="range" 
                        min={1} 
                        max={numPages} 
                        value={currentPage}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setDirection(val > currentPage ? 1 : -1);
                            if (isMobile) {
                                setCurrentPage(val);
                            } else {
                                if (val === 1) setCurrentPage(1);
                                else setCurrentPage(val % 2 === 0 ? val : val - 1);
                            }
                        }}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                    />
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                        onClick={handlePrev}
                        disabled={currentPage === 1}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-20 border border-white/5 text-white/80 rounded-xl text-xs font-bold transition-all disabled:scale-100 active:scale-95"
                    >
                        <ChevronLeft className="w-4 h-4" /> Ortga
                    </button>

                    {hasReachedEnd ? (
                        <button 
                            onClick={onFinished}
                            className="flex-grow sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500/30 rounded-xl text-white hover:scale-[1.03] active:scale-95 transition-all text-xs font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse"
                        >
                            Tugatdim va Savollarga o'tish <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button 
                            onClick={handleNext}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                            Olg'a <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </footer>

            {/* Book Description Overlay */}
            <AnimatePresence>
                {showDesc && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDesc(false)}>
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative bg-gradient-to-br from-[#12122b] to-[#1a1a3e] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col z-50"
                        >
                            <button onClick={() => setShowDesc(false)} className="absolute top-4 right-4 text-white/40 hover:text-white p-1 rounded-lg bg-white/5">
                                <X className="w-4 h-4" />
                            </button>
                            <h3 className="font-black text-white text-lg mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
                                <FileText className="w-5 h-5 text-indigo-400" /> Kitob haqida ma'lumot
                            </h3>
                            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line max-h-[300px] overflow-y-auto pr-1">
                                {book.description || "Ushbu ajoyib asarning izohi mavjud emas."}
                            </p>
                            <button 
                                onClick={() => setShowDesc(false)}
                                className="w-full mt-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs transition-colors"
                            >
                                Yopish
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── SUBSCRIPTION LOCK MODAL ──────────────────────────────────────────────────
function SubscriptionLockModal({ lang, onClose }) {
    const cfg = PAGE_CONFIG[lang] || PAGE_CONFIG.uz;

    const handleRedirect = () => {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const mainDomain = isLocalhost ? 'http://localhost:5173' : 'https://alif24.uz';
        window.location.href = `${mainDomain}/pricing`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-gradient-to-br from-[#100b2e] via-[#16113b] to-[#0c0c1e] border border-amber-500/25 rounded-3xl p-8 w-full max-w-md shadow-[0_0_40px_rgba(245,158,11,0.18)] flex flex-col items-center text-center z-10"
            >
                {/* Floating gold padlock */}
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 mb-5 relative">
                    <Lock className="w-8 h-8 text-slate-950 font-black animate-pulse" />
                    <Sparkles className="w-4 h-4 text-white absolute -top-1.5 -right-1.5 animate-bounce" />
                </div>

                <h3 className="text-white font-black text-2xl mb-2 tracking-tight uppercase">
                    {cfg.lockedTitle}
                </h3>
                <p className="text-white/60 text-xs mb-6 px-2 leading-relaxed">
                    {cfg.lockedDesc}
                </p>

                {/* Benefits List */}
                <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-3 text-left mb-6">
                    {cfg.lockBenefits.map((b, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-white/80 font-medium">
                            <span className="shrink-0">{b.substring(0, 2)}</span>
                            <span>{b.substring(2)}</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-3 w-full">
                    <button 
                        onClick={handleRedirect}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-2xl font-black text-base transition-all shadow-xl shadow-orange-500/20 hover:scale-[1.01] active:scale-95"
                    >
                        {cfg.lockedBtn}
                    </button>
                    
                    <button 
                        onClick={onClose}
                        className="text-white/40 text-xs hover:text-white transition-colors"
                    >
                        Keyinroq sinab ko'rish
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── SINGLE BOOK CARD ──────────────────────────────────────────────────────────
function BookCard({ book, index, onRead, onQuiz, onTest, lang }) {
    const cfg = PAGE_CONFIG[lang] || PAGE_CONFIG.uz;
    const [imgError, setImgError] = useState(false);
    
    const qCount = (book.questions || []).length;
    const testCount = (book.test || []).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={onRead}
            className="bg-white rounded-3xl shadow-lg hover:shadow-2xl overflow-hidden cursor-pointer transition-all group flex flex-col h-full border border-white/10 hover:-translate-y-1.5 duration-300"
        >
            <div className="w-full aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-indigo-650 to-violet-750">
                {book.image_url && !imgError ? (
                    <img
                        src={book.image_url}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/30 gap-1.5">
                        <BookOpen className="w-12 h-12 stroke-[1.2]" />
                        <span className="text-[9px] font-mono uppercase tracking-wider">Kitob Muqovasi</span>
                    </div>
                )}

                {/* Free / Paid badges */}
                <div className="absolute top-3 left-3">
                    {book.is_premium ? (
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 border border-amber-400/30">
                            <Lock className="w-2.5 h-2.5 shrink-0" strokeWidth={3} /> {cfg.premiumBadge}
                        </div>
                    ) : (
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg flex items-center gap-0.5">
                            {cfg.freeBadge}
                        </div>
                    )}
                </div>

                {qCount > 0 && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full font-bold border border-white/10">
                        🧠 {qCount} savol
                    </div>
                )}
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="text-[#1a1a2e] font-bold text-base mb-1.5 line-clamp-2 leading-tight group-hover:text-indigo-650 transition-colors">
                        {book.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-4 font-bold uppercase tracking-wider">
                        <span>📖 PDF format</span>
                        <span>•</span>
                        <span>{book.language === 'uz' ? "O'zbekcha" : book.language === 'ru' ? "Ruscha" : "Inglizcha"}</span>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2 mt-auto">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRead(); }}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-650 to-violet-650 text-white rounded-xl font-black text-xs shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                        {cfg.read} 📖
                    </button>
                    
                    {qCount > 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onQuiz(); }}
                            className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-xl font-bold text-xs border border-emerald-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5"
                        >
                            {cfg.quiz} 🧠
                        </button>
                    )}
                    
                    {testCount > 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onTest(); }}
                            className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-xl font-bold text-xs border border-blue-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5"
                        >
                            {cfg.test} 📝
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

const AGE_GROUPS = ['5-7', '7-8', '8-9', '9-10', '10-11', '11-12', '12-17', '17+'];

// ─── PRIMARY COMPONENT ──────────────────────────────────────────────────────────
export default function KitoblarPage({ lang = 'uz' }) {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    // Active triggers
    const [activeBook, setActiveBook] = useState(null);
    const [directQuizBook, setDirectQuizBook] = useState(null);
    const [directTestBook, setDirectTestBook] = useState(null);
    
    // Subscription locks
    const [showPremiumLock, setShowPremiumLock] = useState(false);

    // Age filters
    const [selectedAgeGroup, setSelectedAgeGroup] = useState('all');
    const [showAgeDropdown, setShowAgeDropdown] = useState(false);

    const cfg = PAGE_CONFIG[lang] || PAGE_CONFIG.uz;

    // Fetch student active subscription on mount
    useEffect(() => {
        apiService.get('/auth/me')
            .then(res => {
                if (res) setUser(res);
            })
            .catch(err => {
                console.error("Auth status verify failed:", err);
            });
    }, []);

    // Load list of books for current language
    useEffect(() => {
        const loadBooks = async () => {
            try {
                setLoading(true);
                const res = await apiService.get('/kitoblar', { language: lang });
                const list = res.data?.books || res.data || [];
                setBooks(list);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadBooks();
    }, [lang]);

    const isUserPremium = user?.subscription?.is_premium === true;

    // Direct access checking helper
    const checkAndExecute = (book, callback) => {
        if (book.is_premium && !isUserPremium) {
            setShowPremiumLock(true);
        } else {
            callback();
        }
    };

    const filtered = selectedAgeGroup === 'all' 
        ? books 
        : books.filter(b => b.age_group === selectedAgeGroup);

    return (
        <div className="min-h-screen bg-[#060613] text-white">
            {/* Nav Header */}
            <header className="border-b border-white/10 p-5 flex justify-between items-center bg-[#0d0d21] relative z-10">
                <div className="flex items-center gap-3 font-bold text-xl text-white select-none">
                    <BookOpen className="w-6 h-6 text-indigo-400" /> 
                    <span>{cfg.headerTitle}</span>
                </div>
                <a 
                    href="https://alif24.uz/student-dashboard" 
                    className="text-white/60 hover:text-white flex items-center gap-2 text-sm font-semibold transition-all hover:scale-102 active:scale-98"
                >
                    <ArrowLeft className="w-4 h-4" /> {cfg.back}
                </a>
            </header>

            {/* Content main */}
            <main className="max-w-6xl mx-auto p-10 text-center relative z-10">
                <h1 className="text-4xl font-extrabold mb-8 tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent flex items-center justify-center gap-2 select-none">
                    {cfg.title}
                </h1>

                {/* Filters Row */}
                <div className="flex justify-center gap-4 mb-10 flex-wrap">
                    {/* Language Toggles */}
                    <div className="bg-white/5 border border-white/5 p-1 rounded-2xl flex">
                        {['uz', 'ru', 'en'].map(l => (
                            <Link 
                                key={l} 
                                to={l === 'uz' ? '/kitoblar' : `/kitoblar/${l}`} 
                                className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all ${lang === l ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white/60 hover:text-white'}`}
                            >
                                {cfg.langFlags[l].split(' ')[1]}
                            </Link>
                        ))}
                    </div>

                    {/* Age Selector Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowAgeDropdown(!showAgeDropdown)} 
                            className="px-5 py-2 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-white/10 transition-colors"
                        >
                            {selectedAgeGroup === 'all' ? 'Barcha yoshlar' : selectedAgeGroup} <ChevronDown className="w-4 h-4" />
                        </button>
                        <AnimatePresence>
                            {showAgeDropdown && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute mt-2 w-48 bg-[#0e0e24] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden text-left"
                                >
                                    <button 
                                        onClick={() => { setSelectedAgeGroup('all'); setShowAgeDropdown(false); }} 
                                        className="w-full text-left px-4 py-3 hover:bg-white/5 text-xs font-semibold"
                                    >
                                        Barchasi
                                    </button>
                                    {AGE_GROUPS.map(g => (
                                        <button 
                                            key={g} 
                                            onClick={() => { setSelectedAgeGroup(g); setShowAgeDropdown(false); }} 
                                            className="w-full text-left px-4 py-3 hover:bg-white/5 text-xs font-semibold"
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Library Books Grid */}
                {loading ? (
                    <div className="py-32 flex flex-col items-center gap-3">
                        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-white/40 text-xs font-bold">Kutubxona yuklanmoqda...</p>
                    </div>
                ) : (
                    <>
                        {filtered.length === 0 ? (
                            <div className="py-20 bg-white/2 border border-white/5 rounded-3xl max-w-md mx-auto flex flex-col items-center justify-center text-white/30 p-8">
                                <HelpCircle className="w-12 h-12 stroke-[1.2]" />
                                <p className="text-sm font-semibold mt-3 select-none">{cfg.empty}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-left">
                                {filtered.map((b, i) => (
                                    <BookCard 
                                        key={b.id} 
                                        book={b} 
                                        index={i} 
                                        lang={lang}
                                        onRead={() => checkAndExecute(b, () => setActiveBook(b))} 
                                        onQuiz={() => checkAndExecute(b, () => setDirectQuizBook(b))}
                                        onTest={() => checkAndExecute(b, () => setDirectTestBook(b))}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Modals & Interfaces */}
            <AnimatePresence>
                {/* PDF Viewer Interface */}
                {activeBook && (
                    <PDFReaderModal 
                        book={activeBook} 
                        onClose={() => setActiveBook(null)} 
                        onFinished={() => {
                            const current = activeBook;
                            setActiveBook(null);
                            setDirectQuizBook(current);
                        }}
                    />
                )}

                {/* Direct Written Question Phase */}
                {directQuizBook && (
                    <QuizModal
                        book={{ ...directQuizBook, forceQuizDirect: true }}
                        onClose={() => setDirectQuizBook(null)}
                        readingStats={{ elapsed: 0 }}
                    />
                )}

                {/* Direct Multiple Choice Test Phase */}
                {directTestBook && (
                    <QuizModal
                        book={{ ...directTestBook, forceTestDirect: true }}
                        onClose={() => setDirectTestBook(null)}
                        readingStats={{ elapsed: 0 }}
                    />
                )}

                {/* Subscription Lock Modal */}
                {showPremiumLock && (
                    <SubscriptionLockModal 
                        lang={lang} 
                        onClose={() => setShowPremiumLock(false)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
