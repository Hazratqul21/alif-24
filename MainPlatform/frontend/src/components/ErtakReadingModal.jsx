/**
 * ErtakReadingModal — Olimpiada uslubida ertak o'qish + savol-javob modali.
 * StudentDashboard da reference_type='ertak' bo'lgan vazifalar uchun ishlatiladi.
 * Props:
 *   ertak        — Story object (title, content, questions, language, id)
 *   assignmentId — Assignment ID (submit-ertak uchun)
 *   onClose      — Modal yopilganda chaqiriladi
 *   onDone       — Muvaffaqiyatli topshirilganda chaqiriladi
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Volume2, ChevronRight, X, Trophy, CheckCircle2 } from 'lucide-react';
import studentService from '../services/studentService';

const API_URL = (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//')
    : '') || '/api/v1';

// ─── Fuzzy word matching helpers ─────────────────────────────────────────────
function extractWords(text) {
    return (text || '').toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
}
function getSimilarity(a, b) {
    if (a === b) return 1;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1;
    const editDist = (s, t) => {
        const m = s.length, n = t.length;
        const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
        for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
            dp[i][j] = s[i - 1] === t[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        return dp[m][n];
    };
    return (longer.length - editDist(longer, shorter)) / longer.length;
}

// ─── Phase 1: Reading with word highlight ───────────────────────────────────
function ReadingPhase({ ertak, onDone }) {
    const [count, setCount] = useState(3);
    const [phase, setPhase] = useState('countdown'); // countdown | reading | done
    const [elapsed, setElapsed] = useState(0);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [sttError, setSttError] = useState('');

    const expectedWords = extractWords(ertak.content || '');
    const wordIndexRef = useRef(0);
    const recognizerRef = useRef(null);
    const timerRef = useRef(null);

    // Countdown
    useEffect(() => {
        if (phase !== 'countdown') return;
        if (count <= 0) { setPhase('reading'); return; }
        const t = setTimeout(() => setCount(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, count]);

    // Start STT when reading starts
    useEffect(() => {
        if (phase !== 'reading') return;
        wordIndexRef.current = 0;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) { setSttError("Brauzer ovozli tanishni qo'llab-quvvatlamaydi"); return; }
        try {
            const rec = new SpeechRec();
            rec.lang = ertak.language === 'ru' ? 'ru-RU' : ertak.language === 'en' ? 'en-US' : 'uz-UZ';
            rec.continuous = true;
            rec.interimResults = true;
            rec.onresult = (e) => {
                const spoken = extractWords(Array.from(e.results).map(r => r[0]?.transcript || '').join(' '));
                let idx = wordIndexRef.current;
                for (const sw of spoken) {
                    if (idx >= expectedWords.length) break;
                    for (let k = idx; k < Math.min(idx + 5, expectedWords.length); k++) {
                        if (getSimilarity(sw, expectedWords[k]) >= 0.55) { idx = k + 1; break; }
                    }
                }
                wordIndexRef.current = idx;
                setCurrentWordIndex(idx);
            };
            rec.onerror = () => setSttError("Mikrofon xatosi");
            rec.start();
            recognizerRef.current = rec;
        } catch { setSttError("Mikrofon ochilmadi"); }
        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => {
            clearInterval(timerRef.current);
            try { recognizerRef.current?.stop(); } catch (_) {}
        };
    }, [phase]);

    const stopReading = () => {
        clearInterval(timerRef.current);
        try { recognizerRef.current?.stop(); } catch (_) {}
        const wpm = elapsed > 0 ? Math.round((wordIndexRef.current / elapsed) * 60) : 0;
        const readPct = expectedWords.length > 0 ? Math.round((wordIndexRef.current / expectedWords.length) * 100) : 0;
        onDone({ wpm, readPercent: Math.min(readPct, 100), elapsed });
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // Render colored text tokens
    const tokens = (ertak.content || '').split(/(\s+)/);
    let wordCount = 0;
    const renderedText = tokens.map((token, i) => {
        if (/\s+/.test(token)) return <span key={i}>{token}</span>;
        const idx = wordCount++;
        const done = idx < currentWordIndex;
        return <span key={i} className={done ? 'text-green-400 font-semibold' : 'text-white/80'}>{token}</span>;
    });

    if (phase === 'countdown') return (
        <div className="flex flex-col items-center justify-center gap-6 py-12">
            <motion.div
                key={count}
                initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                className="text-8xl font-black text-white"
            >{count > 0 ? count : '🎤'}</motion.div>
            <p className="text-white/50 text-sm">O'qishga tayyorlaning...</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400 font-mono font-bold">{fmt(elapsed)}</span>
                </div>
                <span className="text-white/40 text-xs">{currentWordIndex}/{expectedWords.length} so'z</span>
            </div>

            {sttError && <p className="text-amber-400 text-xs bg-amber-500/10 rounded-lg px-3 py-2">{sttError}</p>}

            <div className="bg-white/5 rounded-2xl p-5 max-h-80 overflow-y-auto text-base leading-loose whitespace-pre-wrap">
                {renderedText}
            </div>

            <button
                onClick={stopReading}
                className="w-full py-4 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-xl"
            >
                <Square className="w-5 h-5" /> O'qishni yakunlash
            </button>
        </div>
    );
}

// ─── Phase 2: Voice Quiz ─────────────────────────────────────────────────────
function QuizPhase({ ertak, assignmentId, readingStats, onDone, onClose }) {
    const questions = ertak.questions || [];
    const [qIndex, setQIndex] = useState(0);
    const [phase, setPhase] = useState('tts'); // tts | record | evaluating | result | done
    const [scores, setScores] = useState([]);
    const [elapsed, setElapsed] = useState(0);
    const [sttError, setSttError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isAnswering, setIsAnswering] = useState(false);

    const timerRef = useRef(null);
    const audioRef = useRef(null);
    const recognizerRef = useRef(null);
    const recognizedRef = useRef('');
    const [liveText, setLiveText] = useState('');

    const currentQ = questions[qIndex];
    const allDone = qIndex >= questions.length;
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0;

    useEffect(() => {
        if (phase === 'tts' && currentQ) playTTS();
    }, [qIndex, phase]);

    // If no questions, skip to submit
    useEffect(() => {
        if (questions.length === 0) submitResult([]);
    }, []);

    const playTTS = async () => {
        try {
            const r = await fetch(`${API_URL}/speech/tts?text=${encodeURIComponent(currentQ.question)}&language=${ertak.language || 'uz'}&gender=female`, { credentials: 'include' });
            if (!r.ok) throw new Error();
            const url = URL.createObjectURL(await r.blob());
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => { URL.revokeObjectURL(url); setPhase('record'); };
            audio.onerror = () => setPhase('record');
            await audio.play();
        } catch { setPhase('record'); }
    };

    const startRecording = () => {
        setSttError('');
        recognizedRef.current = '';
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) { setSttError("Brauzer ovozni qo'llab-quvvatlamaydi"); return; }
        try {
            const rec = new SpeechRec();
            rec.lang = ertak.language === 'ru' ? 'ru-RU' : ertak.language === 'en' ? 'en-US' : 'uz-UZ';
            rec.continuous = true;
            rec.interimResults = true;
            rec.onresult = e => {
                const transcript = Array.from(e.results)
                    .map(r => r[0]?.transcript || '')
                    .join(' ');
                recognizedRef.current = transcript;
                setLiveText(transcript);
            };
            rec.start();
            recognizerRef.current = rec;
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
            setPhase('record');
        } catch { setSttError("Mikrofon ochilmadi"); }
    };

    const stopAndEvaluate = async () => {
        clearInterval(timerRef.current);
        try { recognizerRef.current?.stop(); } catch (_) {}
        setPhase('evaluating');
        const text = recognizedRef.current.trim();
        try {
            const r = await fetch(`${API_URL}/smartkids/evaluate-quiz`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    story_text: ertak.content,
                    question: currentQ.question,
                    child_answer: text,
                    language: ertak.language || 'uz',
                    correct_answer: currentQ.answer // O'qituvchi bergan to'g'ri javob
                }),
                credentials: 'include' 
            });
            const json = await r.json();
            const d = json.data || {};
            setScores(prev => [...prev, { score: d.score ?? 0, recognized: text, correct: d.feedback || '', passed: d.passed ?? false }]);
        } catch {
            setScores(prev => [...prev, { score: 0, recognized: text, correct: 'Xatolik yuz berdi', passed: false }]);
        }
        setPhase('result');
        setIsAnswering(false);
    };

    const nextQuestion = () => {
        const newIndex = qIndex + 1;
        setIsAnswering(false);
        setLiveText('');
        if (newIndex >= questions.length) {
            setQIndex(questions.length); // triggers allDone
        } else {
            setQIndex(newIndex);
            setPhase('tts');
        }
    };

    const submitResult = async (finalScores) => {
        setSubmitting(true);
        const avg = finalScores.length ? Math.round(finalScores.reduce((a, b) => a + b.score, 0) / finalScores.length) : 0;
        try {
            if (assignmentId) {
                await studentService.submitErtak(assignmentId, {
                    wpm: readingStats.wpm || 0,
                    read_percent: readingStats.readPercent || 0,
                    reading_time_seconds: readingStats.elapsed || 0,
                    quiz_scores: finalScores,
                    quiz_average: avg,
                });
            } else {
                // Agar vazifa bo'lmasa, shunchaki o'qilgan deb belgilash
                await studentService.completePublicStory(ertak.id, {
                    wpm: readingStats.wpm || 0,
                    quiz_score: avg
                });
            }
            onDone({ wpm: readingStats.wpm, readPercent: readingStats.readPercent, quiz_average: avg, scores: finalScores });
        } catch (e) {
            console.error(e);
            onDone(null);
        }
        setSubmitting(false);
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const scoreColor = s => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';

    // All questions done → auto-submit
    if (allDone) {
        if (!submitting) submitResult(scores);
        return (
            <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-12 h-12 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin" />
                <p className="text-white/50 text-sm">Natijalar saqlanmoqda...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Progress */}
            <div className="flex items-center justify-between">
                <p className="text-white/50 text-xs">Savol {qIndex + 1} / {questions.length}</p>
                {scores.length > 0 && <p className="text-xs text-white/40">O'rtacha: <span className={scoreColor(avgScore)}>{avgScore}/100</span></p>}
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#4b30fb] to-[#764ba2] rounded-full transition-all" style={{ width: `${(qIndex / questions.length) * 100}%` }} />
            </div>

            {/* Question */}
            <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-white/40 text-xs mb-1">Savol</p>
                <p className="text-white text-lg font-semibold">{currentQ?.question}</p>
            </div>

            {/* TTS phase */}
            {phase === 'tts' && (
                <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-14 h-14 rounded-full bg-[#4b30fb]/20 border-2 border-[#4b30fb]/60 flex items-center justify-center">
                        <Volume2 className="w-6 h-6 text-[#4b30fb] animate-pulse" />
                    </div>
                    <p className="text-white/50 text-sm">Savol o'qilmoqda...</p>
                    <button onClick={() => { audioRef.current?.pause(); setPhase('record'); }} className="text-white/30 text-xs hover:text-white/60 underline">O'tkazib yuborish</button>
                </div>
            )}

            {/* Record phase — Initial button */}
            {phase === 'record' && !isAnswering && (
                <div className="flex flex-col items-center gap-4 py-4">
                    {sttError && <p className="text-red-400 text-xs">{sttError}</p>}
                    <p className="text-white/60 text-sm text-center">Savolga javob berishga tayyormisiz?</p>
                    <button 
                        onClick={() => { setIsAnswering(true); startRecording(); }}
                        className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl shadow-purple-500/20"
                    >
                        <Mic className="w-6 h-6" /> Javob berish
                    </button>
                </div>
            )}

            {/* Recording active — Shown after clicking 'Javob berish' */}
            {phase === 'record' && isAnswering && (
                <div className="flex flex-col items-center gap-6 py-4 bg-white/5 rounded-3xl border border-white/10 p-6">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                            <Mic className="w-9 h-9 text-white" />
                        </div>
                    </div>
                    
                    <div className="text-center">
                        <p className="text-red-400 font-mono text-2xl font-black mb-1">{fmt(elapsed)}</p>
                        <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Ovoz yozilmoqda...</p>
                    </div>

                    {liveText && (
                        <div className="w-full bg-white/5 rounded-xl p-3 border border-white/5 animate-in fade-in slide-in-from-bottom-2">
                            <p className="text-white/60 text-xs italic line-clamp-3">"{liveText}..."</p>
                        </div>
                    )}

                    <button 
                        onClick={stopAndEvaluate}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all border border-white/10"
                    >
                        <Square className="w-5 h-5 fill-current" /> Javobni yuborish
                    </button>
                </div>
            )}

            {/* Evaluating */}
            {phase === 'evaluating' && (
                <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-12 h-12 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin" />
                    <p className="text-white/50 text-sm">Baholanmoqda...</p>
                </div>
            )}

            {/* Result */}
            {phase === 'result' && scores[qIndex] && (
                <div className="flex flex-col items-center gap-4 py-2">
                    <div className="text-4xl">{scores[qIndex].score >= 80 ? '🌟' : scores[qIndex].score >= 50 ? '👍' : '💡'}</div>
                    <p className={`text-4xl font-black ${scoreColor(scores[qIndex].score)}`}>{scores[qIndex].score}<span className="text-white/30 text-xl font-normal">/100</span></p>
                    <button onClick={nextQuestion}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-medium hover:scale-105 transition-transform">
                        {qIndex + 1 >= questions.length ? 'Natijani ko\'rish' : 'Keyingi savol'}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Phase 3: Result Screen ──────────────────────────────────────────────────
function ResultScreen({ ertak, readingStats, quizResult, onClose }) {
    const { wpm = 0, readPercent = 0, elapsed = 0 } = readingStats || {};
    const { quiz_average = 0, scores = [] } = quizResult || {};
    const fmtTime = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    
    const readingCoin = wpm >= 60 ? 10 : wpm >= 40 ? 5 : 2;
    const quizCoin = quiz_average >= 80 ? 15 : quiz_average >= 50 ? 8 : 3;
    const totalCoin = readingCoin + quizCoin;
    
    const wpmColor = wpm >= 60 ? 'text-emerald-400' : wpm >= 40 ? 'text-amber-400' : 'text-red-400';
    const scoreColor = (s) => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-rose-400';
    const scoreBg = (s) => s >= 80 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-rose-500';

    return (
        <div className="flex flex-col items-center gap-5 pt-2">
            <div className="text-6xl animate-bounce">💪</div>
            <div className="text-center">
                <p className="text-white font-bold text-2xl mb-1 uppercase tracking-tight">Umumiy natija</p>
                <p className="text-white/40 text-xs">{ertak.title}</p>
            </div>

            {/* Reading Stats */}
            <div className="w-full">
                <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-3">📖 O'QISH NATIJASI</p>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                        <p className={`text-xl font-black ${wpmColor}`}>{wpm}</p>
                        <p className="text-white/40 text-[9px] uppercase">so'z/daq</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                        <p className="text-xl font-black text-blue-400">{readPercent}%</p>
                        <p className="text-white/40 text-[9px] uppercase">o'qilgan</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                        <p className="text-xl font-black text-purple-400">{fmtTime}</p>
                        <p className="text-white/40 text-[9px] uppercase">vaqt</p>
                    </div>
                </div>
            </div>

            {/* Quiz Stats */}
            <div className="w-full">
                <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-3">🧠 SAVOLLAR TAHLILI</p>
                <div className="bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-3xl p-5 text-center mb-4 shadow-xl border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Trophy className="w-16 h-16 text-white" />
                    </div>
                    <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mb-1">Jami savollar bali</p>
                    <p className="text-white text-5xl font-black">{quiz_average}</p>
                </div>

                {scores.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {scores.map((s, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5 border border-white/5">
                                <span className="text-white/60 text-[12px]">{i + 1}-savol</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className={`h-full ${scoreBg(s.score)}`} style={{ width: `${s.score}%` }} />
                                    </div>
                                    <span className={`text-[12px] font-bold ${scoreColor(s.score)}`}>{s.score}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Coins */}
            <div className="w-full bg-gradient-to-r from-yellow-500/10 via-yellow-500/20 to-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-3xl font-black text-yellow-400">+{totalCoin}</span>
                    <span className="text-3xl">🪙</span>
                </div>
                <p className="text-white/40 text-[11px]">O'qish: +{readingCoin} • Quiz: +{quizCoin}</p>
            </div>

            <button onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform shadow-xl shadow-purple-500/20">
                Yopish
            </button>
        </div>
    );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export default function ErtakReadingModal({ ertak, assignmentId, onClose, onDone }) {
    const [step, setStep] = useState('reading'); // reading | quiz | result | error
    const [readingStats, setReadingStats] = useState(null);
    const [quizResult, setQuizResult] = useState(null);

    if (!ertak) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl p-6 w-full h-[95vh] sm:h-auto sm:max-w-lg shadow-2xl flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>

                    <h2 className="text-white font-bold text-lg mb-1 pr-8">{ertak.title}</h2>
                    <p className="text-white/40 text-xs mb-5">
                        {step === 'reading' ? '📖 O\'qish bosqichi' : step === 'quiz' ? '🧠 Savol-javob' : '🏆 Natija'}
                    </p>

                    {step === 'reading' && (
                        <ReadingPhase
                            ertak={ertak}
                            onDone={(stats) => { setReadingStats(stats); setStep('quiz'); }}
                        />
                    )}

                    {step === 'quiz' && (
                        <QuizPhase
                            ertak={ertak}
                            assignmentId={assignmentId}
                            readingStats={readingStats}
                            onDone={(result) => {
                                setQuizResult(result);
                                setStep(result ? 'result' : 'error');
                                if (result) onDone && onDone();
                            }}
                            onClose={onClose}
                        />
                    )}

                    {step === 'result' && (
                        <ResultScreen
                            ertak={ertak}
                            readingStats={readingStats}
                            quizResult={quizResult}
                            onClose={onClose}
                        />
                    )}

                    {step === 'error' && (
                        <div className="flex flex-col items-center gap-4 py-8 text-center">
                            <div className="text-4xl">⚠️</div>
                            <p className="text-white/70">Topshirishda xatolik yuz berdi</p>
                            <button onClick={onClose} className="px-6 py-3 bg-white/10 text-white rounded-2xl hover:bg-white/20">Yopish</button>
                        </div>
                    )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
