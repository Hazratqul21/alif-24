import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookMarked, Mic, Play, Square, X, BookOpen, ChevronRight, Volume2, RotateCcw, ChevronDown } from 'lucide-react';
import apiService from '../services/apiService';
import { getSimilarity, extractWords, getDisplayTokens } from '../utils/fuzzyMatch';

let API_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';
if (API_URL.startsWith('http://') && window.location.protocol === 'https:') {
    API_URL = API_URL.replace('http://', 'https://');
}

// ─── Quiz Modal ────────────────────────────────────────────────────────────────
function QuizModal({ ertak, onClose, readingStats = {} }) {
    const questions = ertak.questions || [];
    const [qIndex, setQIndex] = useState(0);
    const [phase, setPhase] = useState('tts');
    const [scores, setScores] = useState([]);
    const [recording, setRecording] = useState(false);
    const [evaluating, setEvaluating] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [sttError, setSttError] = useState('');

    const timerRef = useRef(null);
    const audioRef = useRef(null);
    const speechConfigRef = useRef(null);
    const recognizerRef = useRef(null);
    const recognizedTextRef = useRef('');
    const transcriptRef = useRef(''); // Jamlangan matn uchun ref qo'shildi

    const currentQ = questions[qIndex];
    const [submitting, setSubmitting] = useState(false);
    const totalScore = scores.length ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0;
    const allDone = qIndex >= questions.length;

    const submitResult = async (finalScores) => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const avg = finalScores.length ? Math.round(finalScores.reduce((a, b) => a + b.score, 0) / finalScores.length) : 0;
            const data = {
                wpm: readingStats.wpm || 0,
                read_percent: readingStats.readPercent || 0,
                reading_time_seconds: readingStats.elapsed || 0,
                quiz_scores: finalScores,
                quiz_average: avg,
                quiz_score: avg, // Kutubxonada ko'rinishi uchun
                score: avg // API mosligi uchun
            };

            // Agar assignmentId bo'lsa (vazifa sifatida), submit-ertak endpointiga yuboramiz
            if (ertak.assignment_id) {
                await apiService.post(`/students/assignments/${ertak.assignment_id}/submit-ertak`, data);
            } else {
                // Oddiy ertak bo'lsa, complete endpointiga
                await apiService.post(`/stories/${ertak.id}/complete`, data);
            }
        } catch (e) {
            console.error("Natijani saqlashda xatolik:", e);
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (allDone && !submitting) {
            submitResult(scores);
        }
    }, [allDone]);

    useEffect(() => {
        if (phase !== 'tts' || !currentQ) return;
        playQuestionTTS();
    }, [qIndex, phase]);

    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            if (recognizerRef.current) {
                try { recognizerRef.current.stopContinuousRecognitionAsync(); recognizerRef.current.close(); } catch (_) { }
            }
            if (audioRef.current) {
                try { audioRef.current.pause(); } catch (_) { }
            }
        };
    }, []);

    const isManualStopRef = useRef(false);

    const playQuestionTTS = async () => {
        try {
            const lang = ertak.language || 'uz';
            const res = await fetch(
                `${API_URL}/speech/tts?text=${encodeURIComponent(currentQ.question)}&language=${lang}&gender=female`,
                { credentials: 'include' }
            );
            if (!res.ok) throw new Error('TTS error');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => { URL.revokeObjectURL(url); setPhase('record'); };
            audio.onerror = () => { setPhase('record'); };
            await audio.play();
        } catch {
            setPhase('record');
        }
    };

    const evaluateText = async (text) => {
        setRecording(false);
        setEvaluating(true);
        try {
            const res = await fetch(`${API_URL}/smartkids/evaluate-quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    story_text: ertak.content,
                    question: currentQ.question,
                    child_answer: text,
                    language: ertak.language || 'uz',
                    correct_answer: currentQ.answer
                }),
                credentials: 'include'
            });
            const json = await res.json();
            const d = json.data || {};
            setScores(prev => [...prev, {
                score: d.score ?? 0,
                recognized: text,
                correct: d.feedback || currentQ.answer,
                passed: d.passed ?? false,
            }]);
        } catch {
            setScores(prev => [...prev, { score: 0, recognized: text, correct: currentQ.answer, passed: false }]);
        } finally {
            setEvaluating(false);
            setPhase('result');
        }
    };

    const startRecording = () => {
        setSttError('');
        recognizedTextRef.current = ''; // Bu yerda joriy segment saqlanadi
        transcriptRef.current = '';    // Bu yerda jamlangan matn saqlanadi
        isManualStopRef.current = false;

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) { setSttError("Brauzer ovozni qo'llab-quvvatlamaydi"); return; }

        const runRec = () => {
            if (isManualStopRef.current || phase !== 'record') return;

            try {
                const rec = new SpeechRec();
                rec.lang = ertak.language === 'ru' ? 'ru-RU' : ertak.language === 'en' ? 'en-US' : 'uz-UZ';
                rec.continuous = false;
                rec.interimResults = true;

                rec.onresult = e => {
                    const currentTranscript = Array.from(e.results)
                        .map(r => r[0]?.transcript || '')
                        .join(' ');
                    recognizedTextRef.current = currentTranscript;
                };

                rec.onend = () => {
                    // Segment tugagach jamlaymiz
                    transcriptRef.current = (transcriptRef.current + " " + recognizedTextRef.current).trim();
                    recognizedTextRef.current = "";

                    if (!isManualStopRef.current && phase === 'record') {
                        setTimeout(runRec, 250);
                    }
                };

                rec.onerror = (e) => {
                    if (e.error === 'no-speech') {
                        if (!isManualStopRef.current && phase === 'record') setTimeout(runRec, 250);
                        return;
                    }
                };

                rec.start();
                recognizerRef.current = rec;
            } catch (err) { }
        };

        setRecording(true);
        setElapsed(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        runRec();
    };

    const stopAndEvaluate = () => {
        isManualStopRef.current = true;
        setRecording(false);
        clearInterval(timerRef.current);
        if (recognizerRef.current) {
            try { recognizerRef.current.stop(); } catch (_) { }
        }
        // Jamlangan matn + oxirgi segmentni yuboramiz
        const finalAnswer = (transcriptRef.current + " " + recognizedTextRef.current).trim();
        evaluateText(finalAnswer);
    };

    const nextQuestion = () => {
        if (qIndex + 1 >= questions.length) setQIndex(questions.length);
        else { setQIndex(i => i + 1); setPhase('tts'); }
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const scoreColor = s => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';
    const scoreBg = s => s >= 80 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl"
                style={{ maxHeight: '90vh', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                {!allDone && (
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-white/60 text-xs">Savol {qIndex + 1} / {questions.length}</p>
                            {scores.length > 0 && (
                                <p className="text-xs text-white/40">O'rtacha: <span className={scoreColor(totalScore)}>{totalScore}/100</span></p>
                            )}
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#4b30fb] to-[#764ba2] rounded-full transition-all"
                                style={{ width: `${(qIndex / questions.length) * 100}%` }} />
                        </div>
                    </div>
                )}

                {allDone ? (() => {
                    if (submitting) {
                        return (
                            <div className="flex flex-col items-center gap-4 py-12">
                                <div className="w-12 h-12 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin" />
                                <p className="text-white/50 text-sm">Natijalar saqlanmoqda...</p>
                            </div>
                        );
                    }
                    const wpm = readingStats.wpm || 0;
                    const readPercent = readingStats.readPercent || 0;
                    const readElapsed = readingStats.elapsed || 0;
                    const fmtTime = fmt(readElapsed);
                    const readingCoin = wpm >= 60 ? 10 : wpm >= 40 ? 5 : 2;
                    const quizCoin = totalScore >= 80 ? 15 : totalScore >= 50 ? 8 : 3;
                    const totalCoin = readingCoin + quizCoin;
                    const wpmColor = wpm >= 60 ? 'text-emerald-400' : wpm >= 40 ? 'text-amber-400' : 'text-red-400';
                    const overallEmoji = (totalScore >= 80 && wpm >= 40) ? '🏆' : totalScore >= 50 ? '⭐' : '💪';
                    return (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-5xl">{overallEmoji}</div>
                            <p className="text-white font-bold text-2xl">Umumiy natija</p>
                            <p className="text-white/40 text-sm -mt-2">{ertak.title}</p>
                            <div className="w-full">
                                <p className="text-white/50 text-xs uppercase tracking-wide mb-2">📖 O'qish</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                        <p className={`text-xl font-black ${wpmColor}`}>{wpm}</p>
                                        <p className="text-white/40 text-[10px]">so'z/daq</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                        <p className="text-xl font-black text-blue-400">{readPercent}%</p>
                                        <p className="text-white/40 text-[10px]">o'qilgan</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                        <p className="text-xl font-black text-purple-400">{fmtTime}</p>
                                        <p className="text-white/40 text-[10px]">vaqt</p>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full">
                                <p className="text-white/50 text-xs uppercase tracking-wide mb-2">🧠 Savol-javob</p>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center mb-2">
                                    <p className={`text-4xl font-black ${scoreColor(totalScore)}`}>{totalScore}</p>
                                    <p className="text-white/40 text-xs mt-1">100 ball dan</p>
                                </div>
                                <div className="space-y-1.5">
                                    {scores.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                                            <span className="text-white/60 text-xs">{i + 1}-savol</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${scoreBg(s.score)}`} style={{ width: `${s.score}%` }} />
                                                </div>
                                                <span className={`text-xs font-bold min-w-[24px] text-right ${scoreColor(s.score)}`}>{s.score}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/30 rounded-2xl p-4 text-center">
                                <p className="text-3xl font-black text-yellow-400">+{totalCoin} 🪙</p>
                                <p className="text-white/40 text-xs mt-1">O'qish: +{readingCoin} • Quiz: +{quizCoin}</p>
                            </div>
                            <button onClick={onClose}
                                className="w-full py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-semibold hover:scale-[1.02] transition-transform">
                                Yopish
                            </button>
                        </div>
                    );
                })() : (
                    <>
                        <div className="bg-white/5 rounded-2xl p-4 mb-4">
                            <p className="text-white/40 text-xs mb-1.5 uppercase tracking-wide">{qIndex + 1}-savol</p>
                            <p className="text-white text-lg font-semibold leading-relaxed">{currentQ?.question}</p>
                        </div>

                        {phase === 'tts' && (
                            <div className="flex flex-col items-center gap-3 py-4">
                                <div className="w-14 h-14 rounded-full bg-[#4b30fb]/20 border-2 border-[#4b30fb]/60 flex items-center justify-center">
                                    <Volume2 className="w-6 h-6 text-[#4b30fb] animate-pulse" />
                                </div>
                                <p className="text-white/50 text-sm">Savol o'qilmoqda...</p>
                                <button onClick={() => { audioRef.current?.pause(); setPhase('record'); }}
                                    className="text-white/30 text-xs hover:text-white/60 underline">
                                    O'tkazib yuborish
                                </button>
                            </div>
                        )}

                        {phase === 'record' && (
                            <div className="flex flex-col items-center gap-4 py-2">
                                {recording ? (
                                    <>
                                        <div className="relative w-20 h-20">
                                            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                                            <div className="w-20 h-20 rounded-full bg-red-500/30 border-2 border-red-500 flex items-center justify-center">
                                                <Mic className="w-8 h-8 text-red-400" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-red-400 font-mono text-lg font-bold">{fmt(elapsed)}</span>
                                        </div>
                                        <button onClick={stopAndEvaluate}
                                            className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-2xl font-medium hover:bg-red-500/30 transition-all">
                                            <Square className="w-4 h-4" /> Javobni yuborish
                                        </button>
                                    </>
                                ) : evaluating ? (
                                    <>
                                        <div className="w-14 h-14 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin" />
                                        <p className="text-white/50 text-sm">Baholanmoqda...</p>
                                    </>
                                ) : (
                                    <>
                                        {sttError && <p className="text-red-400 text-xs text-center mb-1">{sttError}</p>}
                                        <p className="text-white/60 text-sm text-center">Mikrofonni bosib javob bering</p>
                                        <button onClick={startRecording}
                                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-purple-500/30">
                                            <Mic className="w-5 h-5" /> Javob berish
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {phase === 'result' && scores[qIndex] && (
                            <div className="flex flex-col items-center gap-4 py-2">
                                <div className="text-4xl">{scores[qIndex].score >= 80 ? '🌟' : scores[qIndex].score >= 50 ? '👍' : '💡'}</div>
                                <div className="text-center">
                                    <p className={`text-4xl font-black ${scoreColor(scores[qIndex].score)}`}>{scores[qIndex].score}</p>
                                    <p className="text-white/40 text-xs mt-1">ball</p>
                                </div>
                                {scores[qIndex].recognized && (
                                    <div className="w-full bg-white/5 rounded-xl p-3 space-y-1.5 text-xs">

                                    </div>
                                )}
                                <button onClick={nextQuestion}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-medium hover:scale-105 transition-transform">
                                    {qIndex + 1 >= questions.length ? "Natijani ko'rish" : 'Keyingi savol'}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </div>
    );
}

// ─── Recording Modal ───────────────────────────────────────────────────────────
function RecordingModal({ ertak, onClose }) {
    const [phase, setPhase] = useState('countdown');
    const [count, setCount] = useState(3);
    const [elapsed, setElapsed] = useState(0);
    const [sttError, setSttError] = useState('');
    const [transcript, setTranscript] = useState('');
    const [playing, setPlaying] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);

    const [expectedWords, setExpectedWords] = useState([]);
    const [displayTokens, setDisplayTokens] = useState([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);

    const speechConfigRef = useRef(null);
    const recognizerRef = useRef(null);
    const transcriptRef = useRef('');
    const wordIndexRef = useRef(0);
    const timerRef = useRef(null);
    const autoQuizTimerRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        if (ertak.content) {
            setExpectedWords(extractWords(ertak.content));
            setDisplayTokens(getDisplayTokens(ertak.content));
        }
        return () => { clearTimeout(autoQuizTimerRef.current); };
    }, [ertak]);

    useEffect(() => {
        if (phase !== 'countdown') return;
        if (count <= 0) { setPhase('reading'); return; }
        const t = setTimeout(() => setCount(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, count]);

    const isManualStopRef = useRef(false);

    useEffect(() => {
        if (phase !== 'reading') return;

        const startStt = () => {
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRec) { setSttError("Brauzer ovozni qo'llab-quvvatlamaydi"); return; }
            if (isManualStopRef.current || phase !== 'reading') return;

            try {
                const rec = new SpeechRec();
                rec.lang = ertak.language === 'ru' ? 'ru-RU' : ertak.language === 'en' ? 'en-US' : 'uz-UZ';
                rec.continuous = true;
                rec.interimResults = true;

                rec.onresult = (e) => {
                    let interimTranscript = '';
                    let finalSegmentText = '';
                    
                    // Faqat yangi kelgan (resultIndex dan boshlab) natijalarni olamiz
                    for (let i = e.resultIndex; i < e.results.length; i++) {
                        if (e.results[i].isFinal) {
                            finalSegmentText += e.results[i][0].transcript + " ";
                        } else {
                            interimTranscript += e.results[i][0].transcript;
                        }
                    }

                    if (finalSegmentText) {
                        transcriptRef.current += finalSegmentText;
                    }

                    const currentFullText = (transcriptRef.current + interimTranscript).trim();
                    setTranscript(currentFullText);
                };

                rec.onend = () => {
                    // Faqat brauzer o'zi to'xtatganda va hali o'qishda bo'lsak qayta boshlaymiz
                    if (!isManualStopRef.current && phase === 'reading') {
                        setTimeout(startStt, 100); // Tezroq restart
                    }
                };

                rec.onerror = (e) => {
                    if (e.error === 'no-speech' || e.error === 'aborted') return;
                    console.error("STT Error:", e.error);
                };

                rec.start();
                recognizerRef.current = rec;
            } catch (err) {
                console.error("STT Start Error:", err);
            }
        };

        // Initial setup
        setSttError('');
        transcriptRef.current = '';
        setTranscript('');
        setCurrentWordIndex(0);
        wordIndexRef.current = 0;
        isManualStopRef.current = false;

        startStt();
        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

        return () => {
            clearInterval(timerRef.current);
            if (recognizerRef.current) {
                try { 
                    isManualStopRef.current = true;
                    recognizerRef.current.stop(); 
                } catch (_) { }
            }
        };
    }, [phase]);

    // Track words whenever transcript changes
    useEffect(() => {
        if (!transcript || expectedWords.length === 0) return;

        const finalSegments = extractWords(transcriptRef.current);
        if (finalSegments.length === 0) return;

        let currentIndex = wordIndexRef.current;
        // Oxirgi 10 ta so'zni tekshiramiz (yangi segmentni o'z ichiga oladi)
        const lastSegments = finalSegments.slice(-10);

        for (let sw of lastSegments) {
            if (currentIndex >= expectedWords.length) break;
            let matchedIndex = -1;
            // Qidiruv doirasini 3 tagacha qisqartiramiz (sakrab ketmaslik uchun)
            const limit = Math.min(currentIndex + 3, expectedWords.length);
            for (let k = currentIndex; k < limit; k++) {
                // Aniqlikni 0.7 ga ko'taramiz
                if (getSimilarity(sw, expectedWords[k]) >= 0.7) {
                    matchedIndex = k;
                    break;
                }
            }
            if (matchedIndex !== -1) currentIndex = matchedIndex + 1;
        }

        if (currentIndex > wordIndexRef.current) {
            wordIndexRef.current = currentIndex;
            setCurrentWordIndex(currentIndex);
        }
    }, [transcript, expectedWords]);

    const stopRecording = () => {
        isManualStopRef.current = true;
        clearInterval(timerRef.current);
        if (recognizerRef.current) {
            try {
                recognizerRef.current.stop();
                recognizerRef.current = null;
            } catch (_) { }
        }
        setPhase('done');
        // Natijani ko'rib olishi uchun 3 soniya vaqt beramiz va savollarga o'tamiz
        if ((ertak.questions || []).length > 0) {
            autoQuizTimerRef.current = setTimeout(() => {
                setShowQuiz(true);
            }, 3000);
        }
    };

    const togglePlay = async () => {
        if (playing) {
            if (audioRef.current) { try { audioRef.current.pause(); audioRef.current = null; } catch (_) { } }
            setPlaying(false);
            return;
        }
        try {
            setPlaying(true);
            const text = transcriptRef.current || transcript || ertak.content;
            const response = await fetch(
                `${API_URL}/speech/tts?text=${encodeURIComponent(text.substring(0, 1000))}&language=${ertak.language || 'uz'}&gender=female`,
                { credentials: 'include' }
            );
            if (!response.ok) throw new Error('TTS xato');
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            audio.onended = () => { URL.revokeObjectURL(audioUrl); audioRef.current = null; setPlaying(false); };
            await audio.play();
        } catch { setPlaying(false); }
    };

    const resetReading = () => {
        setPhase('countdown'); setCount(3); setElapsed(0);
        setPlaying(false); setCurrentWordIndex(0);
        wordIndexRef.current = 0; setTranscript(''); transcriptRef.current = '';
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const hasQuestions = (ertak.questions || []).length > 0;

    // stats for done phase
    const totalWords = expectedWords.length;
    const wordsRead = currentWordIndex;
    const readPercent = totalWords > 0 ? Math.round((wordsRead / totalWords) * 100) : 0;
    const wpm = elapsed > 0 ? Math.round(wordsRead / (elapsed / 60)) : 0;
    const coinEarned = wpm >= 60 ? 10 : wpm >= 40 ? 5 : 2;
    const wpmColor = wpm >= 60 ? 'text-emerald-400' : wpm >= 40 ? 'text-amber-400' : 'text-red-400';
    const wpmBg = wpm >= 60 ? 'from-emerald-500/20 to-emerald-600/10' : wpm >= 40 ? 'from-amber-500/20 to-amber-600/10' : 'from-red-500/20 to-red-600/10';
    const emoji = wpm >= 60 ? '🏆' : wpm >= 40 ? '⭐' : '💪';

    if (showQuiz) {
        return <QuizModal ertak={ertak} onClose={onClose} readingStats={{ wpm, readPercent, elapsed, wordsRead, totalWords }} />;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={onClose}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.88, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                /* ↓ flex flex-col + maxHeight — matn flex-1 bilan bo'sh joyni to'ldiradi */
                className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: '94vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── HEADER (shrink-0 — siqilmaydi) ── */}
                <div className="shrink-0 flex items-start justify-between px-5 pt-4 pb-2">
                    <div className="pr-8">
                        <h2 className="text-white font-bold text-xl leading-tight">{ertak.title}</h2>
                        {phase === 'reading' && (
                            <p className="text-white/40 text-xs mt-0.5">Matnni quyida o'zing o'qi 🎙</p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── MATN MAYDONI (flex-1 min-h-0 — qolgan barcha joyni egallaydi) ── */}
                {phase !== 'done' && (
                    <div className="mx-4 mb-2 flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
                        {/* Scroll bo'ladigan matn */}
                        <div className="flex-1 overflow-y-auto p-4"
                            style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            <p className="text-white/85 text-[19px] leading-[1.9] font-medium"
                                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {displayTokens.map((token, idx) => {
                                    const isHighlighted = token.isWord && token.wordIndex < currentWordIndex;
                                    return (
                                        <span
                                            key={idx}
                                            className={token.isWord ? `transition-colors duration-150 ${isHighlighted
                                                ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                                                : 'text-white/85'
                                                }` : ''}
                                        >
                                            {token.text}
                                        </span>
                                    );
                                })}
                            </p>
                        </div>
                        {/* Progress bar — matn ostida */}
                        {totalWords > 0 && (
                            <div className="shrink-0 px-4 py-2 border-t border-white/5 flex items-center gap-3">
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
                                        style={{ width: `${readPercent}%` }} />
                                </div>
                                <span className="text-white/30 text-[11px] shrink-0">{wordsRead}/{totalWords}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── PASTKI CONTROLS (shrink-0 — doim pastda, kichik joy oladi) ── */}
                <div className="shrink-0 px-4 pb-4 pt-1">

                    {/* Countdown */}
                    {phase === 'countdown' && (
                        <div className="flex flex-col items-center gap-2 py-2">
                            <p className="text-white/50 text-sm">Tayyor bo'l, yozish boshlanmoqda...</p>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4b30fb] to-[#764ba2] flex items-center justify-center shadow-lg shadow-purple-500/40">
                                <span className="text-white text-4xl font-black">{count}</span>
                            </div>
                        </div>
                    )}

                    {/* Reading */}
                    {phase === 'reading' && (
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-4 py-2">
                                <span className="w-2 h-2 bg-[#4b30fb] rounded-full animate-pulse" />
                                <span className="text-[#4b30fb] font-mono text-base font-bold">{fmt(elapsed)}</span>

                            </div>
                            <div className="relative w-10 h-10 shrink-0">
                                <div className="absolute inset-0 rounded-full bg-[#4b30fb]/25 animate-ping" />
                                <div className="w-10 h-10 rounded-full bg-[#4b30fb]/30 border-2 border-[#4b30fb] flex items-center justify-center">
                                    <Mic className="w-4 h-4 text-[#4b30fb]" />
                                </div>
                            </div>
                            <button onClick={stopRecording}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-full font-semibold text-sm hover:bg-red-500/30 transition-all">
                                <Square className="w-3.5 h-3.5" /> Tugatdim
                            </button>
                        </div>
                    )}

                    {/* Done */}
                    {phase === 'done' && (
                        <div className="flex flex-col gap-3">
                            {/* Hero */}
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-3xl">{emoji}</span>
                                <div>
                                    <p className="text-white font-bold text-lg">O'qish natijasi</p>
                                    <p className="text-white/40 text-xs">{ertak.title}</p>
                                </div>
                            </div>

                            {/* Stats — 4 ta kichik karta */}
                            <div className="grid grid-cols-4 gap-2">
                                <div className={`bg-gradient-to-br ${wpmBg} border border-white/10 rounded-xl p-2.5 text-center`}>
                                    <p className={`text-xl font-black ${wpmColor}`}>{wpm}</p>
                                    <p className="text-white/40 text-[10px] mt-0.5">so'z/daq</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-white/10 rounded-xl p-2.5 text-center">
                                    <p className="text-xl font-black text-blue-400">{readPercent}%</p>
                                    <p className="text-white/40 text-[10px] mt-0.5">o'qilgan</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-xl p-2.5 text-center">
                                    <p className="text-xl font-black text-purple-400">{fmt(elapsed)}</p>
                                    <p className="text-white/40 text-[10px] mt-0.5">vaqt</p>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-white/10 rounded-xl p-2.5 text-center">
                                    <p className="text-xl font-black text-yellow-400">+{coinEarned}</p>
                                    <p className="text-white/40 text-[10px] mt-0.5">coin 🪙</p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-white/40 text-xs">O'qilgan so'zlar</span>
                                    <span className="text-white font-semibold text-xs">{wordsRead} / {totalWords}</span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                                        style={{ width: `${readPercent}%` }} />
                                </div>
                            </div>

                            {/* Tugmalar */}
                            <div className="flex gap-2">
                                <button onClick={togglePlay}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium text-sm transition-all ${playing
                                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                                        : 'bg-white/8 border border-white/10 text-white hover:bg-white/15'
                                        }`}>
                                    {playing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                    {playing ? "To'xtatish" : 'Eshitish'}
                                </button>
                                <button onClick={resetReading}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white/8 border border-white/10 text-white rounded-xl font-medium text-sm hover:bg-white/15 transition-all">
                                    <RotateCcw className="w-3.5 h-3.5" /> Qayta o'qi
                                </button>
                            </div>

                            {hasQuestions && (
                                <button onClick={() => setShowQuiz(true)}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-purple-500/20">
                                    🧠 Savollarni boshlash ({(ertak.questions || []).length} ta savol)
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}

                            <button onClick={onClose} className="text-white/30 text-sm hover:text-white/60 transition-colors text-center">
                                Yopish
                            </button>
                        </div>
                    )}

                    {sttError && <p className="text-red-400 text-xs text-center mt-2">{sttError}</p>}
                </div>
            </motion.div>
        </div>
    );
}

// ─── Card ──────────────────────────────────────────────────────────────────────
function SmartKidsCard() {
    const openSmartKids = () => {
        // Opens MainPlatform SmartKids in a new tab
        window.open('https://alif24.uz/smartkids', '_blank');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            onClick={openSmartKids}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden cursor-pointer transition-shadow group flex flex-col h-full"
        >
            <div className="w-full aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-[#ff8a00] to-[#ff3d00]">
                <div className="w-full h-full flex flex-col items-center justify-center text-white px-4">
                    <BookOpen className="w-14 h-14" strokeWidth={1.5} />
                    <p className="mt-3 font-bold text-lg">SmartKids</p>
                    <p className="mt-1 text-xs text-white/80 text-center">AI yordamida o'qish va savol-javob</p>
                </div>
            </div>
            <div className="p-4 flex flex-col flex-1">
                <p className="text-[#1a1a2e] font-bold text-base mb-2 leading-snug">SmartKids AI</p>
                <p className="text-[#4b30fb] text-xs mb-4 line-clamp-2">
                    Hikoyalarni o'qib, savollarga javob bering va baholanishni oling.
                </p>
                <button className="mt-auto w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#ff8a00] to-[#ff3d00] text-white rounded-2xl font-semibold text-sm hover:scale-[1.02] transition-transform shadow-md shadow-orange-500/30">
                    Ochish
                </button>
            </div>
        </motion.div>
    );
}

function ErtakCard({ ertak, index, onClick }) {
    const [imgError, setImgError] = useState(false);
    const hasImage = ertak.image_url && !imgError;
    const dayNames = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    const date = ertak.created_at ? new Date(ertak.created_at) : null;
    const dayLabel = date ? dayNames[date.getDay()] : '';
    const wordCount = ertak.content ? ertak.content.trim().split(/\s+/).length : 0;
    const qCount = (ertak.questions || []).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            onClick={onClick}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden cursor-pointer transition-shadow group flex flex-col h-full"
        >
            <div className="w-full aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-[#4b6ef5] to-[#9b59b6]">
                {hasImage ? (
                    <img src={ertak.image_url} alt={ertak.title} loading="lazy" decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => setImgError(true)} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center group-hover:opacity-90 transition-opacity">
                        <BookOpen className="w-14 h-14 text-white/40" strokeWidth={1.5} />
                    </div>
                )}
                {qCount > 0 && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                        🧠 {qCount} savol
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-1">
                <h3 className="text-[#1a1a2e] font-bold text-base mb-1 line-clamp-2 leading-snug">{ertak.title}</h3>
                {ertak.content && (
                    <p className="text-[#4b30fb] text-xs mb-3 line-clamp-2 flex items-center gap-1">
                        <span>📖</span> {ertak.content.slice(0, 60)}...
                    </p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                    {dayLabel && <span>{dayLabel}</span>}
                    {dayLabel && wordCount > 0 && <span>•</span>}
                    {wordCount > 0 && <span>{wordCount} so'z</span>}
                </div>
                <button className="mt-auto w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-semibold text-sm hover:scale-[1.02] transition-transform shadow-md shadow-purple-500/30">
                    <Mic className="w-4 h-4" /> Boshlash
                </button>
            </div>
        </motion.div>
    );
}

// ─── Age group helpers ──────────────────────────────────────────────────────────
const AGE_GROUPS = ['5-7', '7-8', '8-9', '9-10', '10-11', '11-12', '12-17', '17+'];



const PAGE_CONFIG = {
    uz: {
        title: '✨ Ertaklar va hikoyalar',
        subtitle: "O'qi — savollarga javob ber!",
        headerTitle: 'Ertaklar',
        empty: "Hozircha ertaklar yo'q",
        retry: 'Qayta urinish',
        all: 'Barchasi',
        back: 'Ortga',
        langFlags: { uz: "🇺🇿 O'zb", ru: '🇷🇺 Rus', en: '🇬🇧 Eng' },
    },
    ru: {
        title: '✨ Сказки и рассказы',
        subtitle: 'Читайте — отвечайте на вопросы!',
        headerTitle: 'Сказки',
        empty: 'Пока нет сказок',
        retry: 'Повторить',
        all: 'Все',
        back: 'Назад',
        langFlags: { uz: "🇺🇿 O'zb", ru: '🇷🇺 Рус', en: '🇬🇧 Eng' },
    },
    en: {
        title: '✨ Fairy tales and stories',
        subtitle: 'Read and answer questions!',
        headerTitle: 'Stories',
        empty: 'No stories yet',
        retry: 'Retry',
        all: 'All',
        back: 'Back',
        langFlags: { uz: "🇺🇿 O'zb", ru: '🇷🇺 Rus', en: '🇬🇧 Eng' },
    },
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ErtaklarPage({ lang = 'uz' }) {
    const [ertaklar, setErtaklar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeErtak, setActiveErtak] = useState(null);
    const [selectedAgeGroup, setSelectedAgeGroup] = useState('all');
    const [showAgeDropdown, setShowAgeDropdown] = useState(false);

    const cfg = PAGE_CONFIG[lang] || PAGE_CONFIG.uz;


    useEffect(() => { loadErtaklar(); }, [lang]);

    const loadErtaklar = async () => {
        try {
            setLoading(true);
            const data = await apiService.get('/ertaklar', { language: lang });
            const list = data.data?.ertaklar || data.data || data || [];
            setErtaklar(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Yosh guruhi bo'yicha filtrlash
    const filteredErtaklar = (selectedAgeGroup === 'all' || selectedAgeGroup === 'Barchasi')
        ? ertaklar
        : ertaklar.filter(e => e.age_group === selectedAgeGroup);


    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[
                    { top: '5%', left: '10%', sz: 'w-1 h-1', d: '0s', dur: '2s' },
                    { top: '15%', left: '30%', sz: 'w-1.5 h-1.5', d: '0.5s', dur: '3s' },
                    { top: '20%', left: '70%', sz: 'w-2 h-2', d: '1.5s', dur: '3.5s' },
                    { top: '50%', left: '85%', sz: 'w-1 h-1', d: '0.8s', dur: '2.8s' },
                    { top: '70%', left: '20%', sz: 'w-1.5 h-1.5', d: '1.2s', dur: '3.2s' },
                    { top: '85%', left: '55%', sz: 'w-2 h-2', d: '0.4s', dur: '2.4s' },
                ].map((s, i) => (
                    <div key={i} className={`absolute ${s.sz} bg-white rounded-full animate-pulse`}
                        style={{ top: s.top, left: s.left, animationDelay: s.d, animationDuration: s.dur }} />
                ))}
            </div>

            <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-white/5">
                <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-xl flex items-center justify-center">
                            <BookMarked className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-white">{cfg.headerTitle}</h1>
                    </div>
                    <a href="https://alif24.uz/student-dashboard"
                        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> {cfg.back}
                    </a>
                </div>
            </header>

            <section className="relative z-30 max-w-6xl mx-auto px-4 py-10 text-center">
                <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                    {cfg.title}
                </motion.h2>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="text-white/50 text-xs xs:text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-8 whitespace-nowrap overflow-hidden text-ellipsis px-2">
                    {cfg.subtitle}
                </motion.p>

                {/* ── Bir qatordagi filtrlar (Til + Yosh Dropdown) ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="flex items-center justify-center gap-2 mb-8 flex-wrap">

                    {/* Til tanlovi */}
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1">
                        {['uz', 'ru', 'en'].map(l => (
                            <Link key={l} to={l === 'uz' ? '/ertaklar' : `/ertaklar/${l}`}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${lang === l
                                    ? 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white shadow-lg shadow-purple-500/30'
                                    : 'text-white/60 hover:text-white'
                                    }`}>
                                {cfg.langFlags[l].split(' ')[1] || cfg.langFlags[l]}
                            </Link>
                        ))}
                    </div>

                    {/* Yosh guruhi Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowAgeDropdown(!showAgeDropdown)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold border transition-all ${selectedAgeGroup !== 'all'
                                ? 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white border-transparent'
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                                }`}>

                            <span>
                                {(selectedAgeGroup === 'all' || selectedAgeGroup === 'Barchasi')
                                    ? (lang === 'uz' ? 'Barcha' : lang === 'ru' ? 'Все' : 'All')
                                    : selectedAgeGroup}
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showAgeDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showAgeDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowAgeDropdown(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-48 bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden"
                                    >
                                        {AGE_GROUPS.map(group => {
                                            const isActive = selectedAgeGroup === group;
                                            return (
                                                <button key={group}
                                                    onClick={() => { setSelectedAgeGroup(group); setShowAgeDropdown(false); }}
                                                    className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-between ${isActive
                                                        ? 'bg-[#4b30fb] text-white'
                                                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                                                        }`}>
                                                    <span>{group} </span>
                                                </button>
                                            );
                                        })}
                                    </motion.div>                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </section>

            <div className="relative z-10 max-w-6xl mx-auto px-4 pb-20">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin mx-auto" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400 mb-4">❌ {error}</p>
                        <button onClick={loadErtaklar}
                            className="px-6 py-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-lg">
                            {cfg.retry}
                        </button>
                    </div>
                ) : filteredErtaklar.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">📖</div>
                        <p className="text-white/50 text-lg">{cfg.empty}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {lang === 'uz' && <SmartKidsCard />}
                        {filteredErtaklar.map((ertak, i) => (
                            <ErtakCard key={ertak.id} ertak={ertak} index={i} onClick={() => setActiveErtak(ertak)} />
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {activeErtak && (
                    <RecordingModal ertak={activeErtak} onClose={() => setActiveErtak(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
