import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookMarked, Mic, Play, Square, X, BookOpen, ChevronRight, Volume2, RotateCcw, ChevronDown } from 'lucide-react';
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

// 'Class extends value undefined' xatosini oldini olish uchun (Vite + Speech SDK)
if (typeof window !== 'undefined' && !window.EventTarget) {
    window.EventTarget = class EventTarget { };
}
if (typeof window !== 'undefined' && !window.AudioContext && window.webkitAudioContext) {
    window.AudioContext = window.webkitAudioContext;
}

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
    const transcriptRef = useRef('');

    const currentQ = questions[qIndex];
    const [submitting, setSubmitting] = useState(false);
    const totalScore = scores.length ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0;
    const allDone = qIndex >= questions.length;

    const ensureSpeechConfig = async () => {
        if (speechConfigRef.current) return true;
        
        const tokenPaths = [
            `${API_URL}/speech-token`,
            `${API_URL}/smartkids/speech-token`,
            `https://alif24.uz/api/v1/speech-token`,
            `https://alif24.uz/api/v1/smartkids/speech-token`
        ];

        for (const path of tokenPaths) {
            try {
                const resp = await fetch(path, { credentials: 'include' });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.token && data.region) {
                        const cfg = SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
                        cfg.speechRecognitionLanguage = ertak.language === 'ru' ? 'ru-RU' : ertak.language === 'en' ? 'en-US' : 'uz-UZ';
                        speechConfigRef.current = cfg;
                        return true;
                    }
                }
            } catch (err) {
                console.warn(`Failed to fetch speech token from ${path}:`, err);
            }
        }
        
        setSttError("Ovozli tanish xizmatiga ulanib bo'lmadi. Iltimos, internetingizni tekshiring.");
        return false;
    };

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
                quiz_score: avg,
                score: avg
            };

            if (ertak.assignment_id) {
                await apiService.post(`/students/assignments/${ertak.assignment_id}/submit-ertak`, data);
            } else {
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

    const startRecording = async () => {
        setSttError('');
        transcriptRef.current = '';
        const ok = await ensureSpeechConfig();
        if (!ok) return;

        try {
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfigRef.current, audioConfig);
            recognizerRef.current = recognizer;

            recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    transcriptRef.current += (e.result.text + ' ');
                }
            };

            await recognizer.startContinuousRecognitionAsync();
            setRecording(true);
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        } catch {
            setSttError("Mikrofon ochilmadi.");
        }
    };

    const stopAndEvaluate = () => {
        setRecording(false);
        clearInterval(timerRef.current);
        if (recognizerRef.current) {
            recognizerRef.current.stopContinuousRecognitionAsync(() => {
                evaluateText(transcriptRef.current.trim());
                recognizerRef.current.close();
                recognizerRef.current = null;
            });
        } else {
            evaluateText("");
        }
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

                {allDone ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-5xl">🏆</div>
                        <p className="text-white font-bold text-2xl">Umumiy natija</p>
                        <p className="text-white/40 text-sm -mt-2">{ertak.title}</p>
                        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center mb-2">
                            <p className={`text-4xl font-black ${scoreColor(totalScore)}`}>{totalScore}</p>
                            <p className="text-white/40 text-xs mt-1">100 ball dan</p>
                        </div>
                        <button onClick={onClose}
                            className="w-full py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-semibold hover:scale-[1.02] transition-transform">
                            Yopish
                        </button>
                    </div>
                ) : (
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
                                        <div className="flex items-center gap-2 text-red-400 font-mono text-lg font-bold">
                                            {fmt(elapsed)}
                                        </div>
                                        <button onClick={stopAndEvaluate}
                                            className="px-6 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-2xl font-medium hover:bg-red-500/30 transition-all">
                                            Javobni yuborish
                                        </button>
                                    </>
                                ) : evaluating ? (
                                    <div className="flex flex-col items-center gap-4 py-6">
                                        <div className="w-10 h-10 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin" />
                                        <p className="text-white/50 text-sm">Baholanmoqda...</p>
                                    </div>
                                ) : (
                                    <button onClick={startRecording}
                                        className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-purple-500/30">
                                        <Mic className="w-5 h-5" /> Javob berish
                                    </button>
                                )}
                            </div>
                        )}

                        {phase === 'result' && (
                            <div className="flex flex-col items-center gap-4 py-2">
                                <p className={`text-4xl font-black ${scoreColor(scores[qIndex].score)}`}>{scores[qIndex].score}</p>
                                <button onClick={nextQuestion}
                                    className="w-full py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-medium hover:scale-105 transition-transform">
                                    Keyingi savol
                                </button>
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </div>
    );
}

// ─── Recording Modal ──────────────────────────────────────────────────────────
function RecordingModal({ ertak, onClose }) {
    const [phase, setPhase] = useState('countdown');
    const [count, setCount] = useState(3);
    const [elapsed, setElapsed] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [showQuiz, setShowQuiz] = useState(false);
    const [sttError, setSttError] = useState('');
    const [playing, setPlaying] = useState(false);

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

    const ensureSpeechConfig = async () => {
        if (speechConfigRef.current) return true;
        try {
            const resp = await fetch(`${API_URL}/smartkids/speech-token`, { credentials: 'include' });
            if (!resp.ok) throw new Error('speech-token failed');
            const data = await resp.json();
            const cfg = SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
            cfg.speechRecognitionLanguage = ertak.language === 'ru' ? 'ru-RU' : ertak.language === 'en' ? 'en-US' : 'uz-UZ';
            speechConfigRef.current = cfg;
            return true;
        } catch {
            setSttError("Ovozli tanishga ulanib bo'lmadi.");
            return false;
        }
    };

    useEffect(() => {
        if (phase !== 'reading') return;

        const startStt = async () => {
            setSttError('');
            transcriptRef.current = '';
            setTranscript('');
            setCurrentWordIndex(0);
            wordIndexRef.current = 0;

            const ok = await ensureSpeechConfig();
            if (!ok) return;

            try {
                const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
                const recognizer = new SpeechSDK.SpeechRecognizer(speechConfigRef.current, audioConfig);
                recognizerRef.current = recognizer;

                recognizer.recognized = (s, e) => {
                    if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                        const newText = e.result.text;
                        transcriptRef.current += (newText + ' ');
                        setTranscript(transcriptRef.current);

                        const spokenWords = extractWords(newText);
                        let currentIndex = wordIndexRef.current;
                        for (let sw of spokenWords) {
                            if (currentIndex >= expectedWords.length) break;
                            let matchedIndex = -1;
                            const limit = Math.min(currentIndex + 3, expectedWords.length);
                            for (let k = currentIndex; k < limit; k++) {
                                if (getSimilarity(sw, expectedWords[k]) >= 0.7) {
                                    matchedIndex = k;
                                    break;
                                }
                            }
                            if (matchedIndex !== -1) currentIndex = matchedIndex + 1;
                        }
                        wordIndexRef.current = currentIndex;
                        setCurrentWordIndex(currentIndex);
                    }
                };

                await recognizer.startContinuousRecognitionAsync();
            } catch {
                setSttError("Mikrofon ochilmadi.");
            }
        };

        startStt();
        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

        return () => {
            clearInterval(timerRef.current);
            if (recognizerRef.current) {
                try {
                    recognizerRef.current.stopContinuousRecognitionAsync();
                    recognizerRef.current.close();
                } catch (_) { }
            }
        };
    }, [phase]);

    const stopRecording = () => {
        clearInterval(timerRef.current);
        if (recognizerRef.current) {
            const rec = recognizerRef.current;
            recognizerRef.current = null;
            rec.stopContinuousRecognitionAsync(() => {
                try { rec.close(); } catch (_) { }
                setPhase('done');
                if ((ertak.questions || []).length > 0)
                    autoQuizTimerRef.current = setTimeout(() => setShowQuiz(true), 2000);
            });
        } else {
            setPhase('done');
            if ((ertak.questions || []).length > 0)
                autoQuizTimerRef.current = setTimeout(() => setShowQuiz(true), 2000);
        }
    };

    const togglePlay = async () => {
        if (playing) {
            audioRef.current?.pause();
            setPlaying(false);
        } else {
            try {
                setPlaying(true);
                const res = await fetch(`${API_URL}/speech/tts?text=${encodeURIComponent(ertak.content)}&language=${ertak.language || 'uz'}&gender=female`, { credentials: 'include' });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audioRef.current = audio;
                audio.onended = () => { setPlaying(false); URL.revokeObjectURL(url); };
                await audio.play();
            } catch {
                setPlaying(false);
            }
        }
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const hasQuestions = (ertak.questions || []).length > 0;
    const totalWords = expectedWords.length;
    const wordsRead = currentWordIndex;
    const readPercent = totalWords > 0 ? Math.round((wordsRead / totalWords) * 100) : 0;
    const wpm = elapsed > 0 ? Math.round((wordsRead / elapsed) * 60) : 0;

    const emoji = readPercent >= 90 ? '🏆' : readPercent >= 50 ? '⭐' : '📖';
    const wpmColor = wpm >= 60 ? 'text-emerald-400' : wpm >= 40 ? 'text-amber-400' : 'text-red-400';
    const wpmBg = wpm >= 60 ? 'from-emerald-500/20 to-emerald-500/5' : wpm >= 40 ? 'from-amber-500/20 to-amber-500/5' : 'from-red-500/20 to-red-500/5';

    if (showQuiz) return <QuizModal ertak={ertak} onClose={onClose} readingStats={{ wpm, readPercent, elapsed }} />;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.88, opacity: 0 }}
                className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: '94vh' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="shrink-0 flex items-start justify-between px-5 pt-4 pb-2">
                    <div className="pr-8">
                        <h2 className="text-white font-bold text-xl leading-tight">{ertak.title}</h2>
                        <p className="text-white/40 text-[10px] uppercase tracking-wider mt-0.5">O'qish va tahlil qilish</p>
                    </div>
                    <button onClick={onClose} className="bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                {phase !== 'done' && (
                    <div className="mx-4 mb-2 flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            <p className="text-white/85 text-[19px] leading-[1.9] font-medium">
                                {displayTokens.map((token, i) => {
                                    if (!token.isWord) return <span key={i}>{token.text}</span>;
                                    const isHighlighted = token.wordIndex < currentWordIndex;
                                    return (
                                        <span key={i} className={`transition-colors duration-300 ${isHighlighted ? 'text-emerald-400 font-bold' : ''}`}>
                                            {token.text}
                                        </span>
                                    );
                                })}
                            </p>
                        </div>
                        {totalWords > 0 && (
                            <div className="shrink-0 px-4 py-2 border-t border-white/5 flex items-center gap-3">
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${readPercent}%` }} />
                                </div>
                                <span className="text-emerald-400 text-[10px] font-bold">{readPercent}%</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="shrink-0 px-4 pb-4 pt-1">
                    {phase === 'countdown' && (
                        <div className="flex flex-col items-center gap-2 py-2">
                            <p className="text-white/50 text-sm">Tayyor bo'l...</p>
                            <div className="text-6xl font-black text-white animate-bounce">{count}</div>
                        </div>
                    )}

                    {phase === 'reading' && (
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-4 py-2">
                                <Mic className="w-4 h-4 text-red-500 animate-pulse" />
                                <span className="text-[#4b30fb] font-mono text-base font-bold">{fmt(elapsed)}</span>
                            </div>
                            <button onClick={stopRecording} className="flex-1 bg-white text-[#1a1a2e] py-3 rounded-2xl font-bold hover:bg-white/90 transition-all shadow-lg shadow-white/10">
                                Tugatdim
                            </button>
                        </div>
                    )}

                    {phase === 'done' && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-3xl">{emoji}</span>
                                <h3 className="text-white font-bold text-lg">Ajoyib natija!</h3>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <div className={`bg-gradient-to-br ${wpmBg} border border-white/10 rounded-xl p-2.5 text-center`}>
                                    <p className={`text-xl font-black ${wpmColor}`}>{wpm}</p>
                                    <p className="text-white/40 text-[9px] uppercase">So'z/dak</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                                    <p className="text-xl font-black text-blue-400">{readPercent}%</p>
                                    <p className="text-white/40 text-[9px] uppercase">O'qilgan</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                                    <p className="text-xl font-black text-purple-400">{fmt(elapsed)}</p>
                                    <p className="text-white/40 text-[9px] uppercase">Vaqt</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                                    <p className="text-xl font-black text-emerald-400">{wordsRead}</p>
                                    <p className="text-white/40 text-[9px] uppercase">So'zlar</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={togglePlay} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium text-sm transition-all ${playing ? 'bg-amber-500 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
                                    {playing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    {playing ? 'To\'xtatish' : 'Eshitish'}
                                </button>
                                <button onClick={() => { setPhase('countdown'); setCount(3); setElapsed(0); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white/5 text-white/70 rounded-xl font-medium text-sm hover:bg-white/10 transition-all">
                                    <RotateCcw className="w-4 h-4" /> Qayta o'qish
                                </button>
                            </div>
                            {hasQuestions && (
                                <button onClick={() => setShowQuiz(true)} className="w-full py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-purple-500/20">
                                    🧠 Savollarni boshlash
                                </button>
                            )}
                            <button onClick={onClose} className="text-white/30 text-sm hover:text-white/60 transition-colors text-center">Yopish</button>
                        </div>
                    )}
                    {sttError && <p className="text-red-400 text-xs text-center mt-2">{sttError}</p>}
                </div>
            </motion.div>
        </div>
    );
}

// ─── Cards & Helpers ──────────────────────────────────────────────────────────
function SmartKidsCard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => window.open('https://alif24.uz/smartkids', '_blank')}
            className="bg-white rounded-3xl shadow-lg hover:shadow-2xl overflow-hidden cursor-pointer transition-all group flex flex-col h-full border border-white/10"
        >
            <div className="w-full aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-[#ff8a00] to-[#ff3d00]">
                <div className="w-full h-full flex flex-col items-center justify-center text-white p-4">
                    <BookOpen className="w-14 h-14 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                    <p className="mt-3 font-black text-lg tracking-tight">SmartKids AI</p>
                    <p className="text-[10px] text-white/80 text-center mt-1 uppercase tracking-widest font-bold">O'qish va tahlil</p>
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-[#1a1a2e] font-bold text-base mb-2 leading-tight">SmartKids AI Platformasi</h3>
                <p className="text-gray-500 text-xs mb-4 line-clamp-2 leading-relaxed">
                    Istagan hikoyangizni o'qib, AI yordamida o'z natijangizni tekshiring.
                </p>
                <button className="mt-auto w-full py-3 bg-gradient-to-r from-[#ff8a00] to-[#ff3d00] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/30 group-hover:scale-[1.02] transition-transform">
                    Ochish
                </button>
            </div>
        </motion.div>
    );
}

function ErtakCard({ ertak, index, onClick }) {
    const [imgError, setImgError] = useState(false);
    const wordCount = ertak.content ? ertak.content.trim().split(/\s+/).length : 0;
    const qCount = (ertak.questions || []).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={onClick}
            className="bg-white rounded-3xl shadow-lg hover:shadow-2xl overflow-hidden cursor-pointer transition-all group flex flex-col h-full border border-white/10"
        >
            <div className="w-full aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-[#4b30fb] to-[#764ba2]">
                {ertak.image_url && !imgError ? (
                    <img
                        src={ertak.image_url}
                        alt={ertak.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white/30" />
                    </div>
                )}
                {qCount > 0 && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full font-bold border border-white/10">
                        🧠 {qCount} savol
                    </div>
                )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-[#1a1a2e] font-bold text-base mb-1 line-clamp-2 leading-tight group-hover:text-[#4b30fb] transition-colors">
                    {ertak.title}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-4 font-medium uppercase tracking-wider">
                    <span>📖 {wordCount} so'z</span>
                    <span>•</span>
                    <span>{ertak.language === 'uz' ? "O'zbekcha" : ertak.language === 'ru' ? "Ruscha" : "Inglizcha"}</span>
                </div>
                <button className="mt-auto w-full py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-bold text-sm shadow-lg shadow-purple-500/30 group-hover:scale-[1.02] transition-transform">
                    Oqishni boshlash
                </button>
            </div>
        </motion.div>
    );
}

const AGE_GROUPS = ['5-7', '7-8', '8-9', '9-10', '10-11', '11-12', '12-17', '17+'];
const PAGE_CONFIG = {
    uz: { title: '✨ Ertaklar', headerTitle: 'Ertaklar', back: 'Ortga', empty: 'Yo\'q', retry: 'Qayta', langFlags: { uz: '🇺🇿 O\'zb', ru: '🇷🇺 Rus', en: '🇬🇧 Eng' } },
    ru: { title: '✨ Сказки', headerTitle: 'Сказки', back: 'Назад', empty: 'Нет', retry: 'Повтор', langFlags: { uz: '🇺🇿 Узб', ru: '🇷🇺 Рус', en: '🇬🇧 Анг' } },
    en: { title: '✨ Stories', headerTitle: 'Stories', back: 'Back', empty: 'No', retry: 'Retry', langFlags: { uz: '🇺🇿 Uzb', ru: '🇷🇺 Rus', en: '🇬🇧 Eng' } }
};

export default function ErtaklarPage({ lang = 'uz' }) {
    const [ertaklar, setErtaklar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeErtak, setActiveErtak] = useState(null);
    const [selectedAgeGroup, setSelectedAgeGroup] = useState('all');
    const [showAgeDropdown, setShowAgeDropdown] = useState(false);

    const cfg = PAGE_CONFIG[lang] || PAGE_CONFIG.uz;

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await apiService.get('/ertaklar', { language: lang });
                const list = data.data?.ertaklar || data.data || [];
                setErtaklar(list);
            } catch (err) { setError(err.message); }
            finally { setLoading(false); }
        };
        load();
    }, [lang]);

    const filtered = selectedAgeGroup === 'all' ? ertaklar : ertaklar.filter(e => e.age_group === selectedAgeGroup);

    return (
        <div className="min-h-screen bg-[#1a1a2e] text-white">
            <header className="border-b border-white/10 p-5 flex justify-between items-center">
                <div className="flex items-center gap-3 font-bold text-xl"><BookMarked /> {cfg.headerTitle}</div>
                <a href="/student-dashboard" className="text-white/60 flex items-center gap-2 text-sm"><ArrowLeft /> {cfg.back}</a>
            </header>
            <main className="max-w-6xl mx-auto p-10 text-center">
                <h1 className="text-4xl font-bold mb-8">{cfg.title}</h1>
                <div className="flex justify-center gap-4 mb-10 flex-wrap">
                    <div className="bg-white/5 p-1 rounded-2xl flex">
                        {['uz', 'ru', 'en'].map(l => (
                            <Link key={l} to={l === 'uz' ? '/ertaklar' : `/ertaklar/${l}`} className={`px-4 py-2 rounded-xl text-sm font-bold ${lang === l ? 'bg-indigo-600' : 'text-white/60'}`}>{cfg.langFlags[l].split(' ')[1]}</Link>
                        ))}
                    </div>
                    <div className="relative">
                        <button onClick={() => setShowAgeDropdown(!showAgeDropdown)} className="px-5 py-2 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold flex items-center gap-2">
                            {selectedAgeGroup === 'all' ? 'Barcha yoshlar' : selectedAgeGroup} <ChevronDown />
                        </button>
                        <AnimatePresence>
                            {showAgeDropdown && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute mt-2 w-48 bg-[#16213e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                                    <button onClick={() => { setSelectedAgeGroup('all'); setShowAgeDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-white/5">Barchasi</button>
                                    {AGE_GROUPS.map(g => (
                                        <button key={g} onClick={() => { setSelectedAgeGroup(g); setShowAgeDropdown(false); }} className="w-full text-left px-4 py-3 hover:bg-white/5">{g}</button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                {loading ? <div className="py-20 animate-spin">⌛</div> : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
                        {lang === 'uz' && <SmartKidsCard />}
                        {filtered.map((e, i) => <ErtakCard key={e.id} ertak={e} index={i} onClick={() => setActiveErtak(e)} />)}
                    </div>
                )}
            </main>
            <AnimatePresence>
                {activeErtak && <RecordingModal ertak={activeErtak} onClose={() => setActiveErtak(null)} />}
            </AnimatePresence>
        </div>
    );
}
