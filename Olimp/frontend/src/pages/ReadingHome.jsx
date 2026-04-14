import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Play, Square, X, BookOpen, ChevronRight, Volume2 } from 'lucide-react';
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import readingService from '../services/readingService';
import apiService from '../services/apiService';
import SpeedChart from '../components/SpeedChart';
import { getSimilarity, extractWords, getDisplayTokens } from '../utils/fuzzyMatch';

let API_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';

const DAYS = {
    monday: { label: 'Dushanba', short: 'Du', num: 1 },
    tuesday: { label: 'Seshanba', short: 'Se', num: 2 },
    wednesday: { label: 'Chorshanba', short: 'Ch', num: 3 },
    thursday: { label: 'Payshanba', short: 'Pa', num: 4 },
    friday: { label: 'Juma', short: 'Ju', num: 5 },
};

// ─── Quiz Modal ────────────────────────────────────────────────────────────────
function QuizModal({ compId, task, onClose, readingStats, readingTranscript, readingElapsed, reloadTasks }) {
    const questions = task.questions || [];
    const [qIndex, setQIndex] = useState(0);
    const [phase, setPhase] = useState('tts');
    const [scores, setScores] = useState([]);
    const [recording, setRecording] = useState(false);
    const [evaluating, setEvaluating] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [ttsPlaying, setTtsPlaying] = useState(false);
    const [sttError, setSttError] = useState('');
    const [savingResult, setSavingResult] = useState(false);

    const timerRef = useRef(null);
    const audioRef = useRef(null);
    const speechConfigRef = useRef(null);
    const recognizerRef = useRef(null);
    const recognizedTextRef = useRef('');

    const currentQ = questions[qIndex];
    const totalScore = scores.length ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0;
    const allDone = qIndex >= questions.length;

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

    // Qachonki barcha savollar tugasa natijani yuborish
    useEffect(() => {
        if (allDone && !savingResult && questions.length > 0) {
            submitFinalResult();
        }
    }, [allDone]);

    const submitFinalResult = async () => {
        try {
            setSavingResult(true);
            const questionsCorrect = scores.filter(s => s.passed).length;
            await readingService.submitReading(compId, task.id, {
                stt_transcript: readingTranscript,
                reading_time_seconds: readingElapsed,
                questions_correct: questionsCorrect
            });
            if (reloadTasks) reloadTasks();
        } catch (err) {
            console.error("Natijani saqlashda xatolik:", err);
        } finally {
            setSavingResult(false);
        }
    };

    const playQuestionTTS = async () => {
        try {
            setTtsPlaying(true);
            // Default to 'uz' unless specified
            const lang = 'uz';
            const res = await fetch(
                `${API_URL}/speech/tts?text=${encodeURIComponent(currentQ.question)}&language=${lang}&gender=female`,
                { credentials: 'include' }
            );
            if (!res.ok) throw new Error('TTS error');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => {
                setTtsPlaying(false);
                URL.revokeObjectURL(url);
                setPhase('record');
            };
            audio.onerror = () => { setTtsPlaying(false); setPhase('record'); };
            await audio.play();
        } catch {
            setTtsPlaying(false);
            setPhase('record');
        }
    };

    const ensureSpeechConfig = async () => {
        if (speechConfigRef.current) return true;
        try {
            let resp = await fetch(`${API_URL}/smartkids/speech-token`, { credentials: 'include' });
            if (!resp.ok) {
                resp = await fetch('https://alif24.uz/api/v1/smartkids/speech-token', { credentials: 'include' });
            }
            if (!resp.ok) throw new Error(`speech-token failed`);
            const data = await resp.json();
            const cfg = SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
            cfg.speechRecognitionLanguage = 'uz-UZ';
            speechConfigRef.current = cfg;
            return true;
        } catch (e) {
            console.error('Speech config init failed:', e);
            setSttError("Ovozli tanishga ulanib bo'lmadi.");
            return false;
        }
    };

    const evaluateText = async (text) => {
        setRecording(false);
        setEvaluating(true);
        try {
            const formData = new FormData();
            formData.append('recognized_text', text);

            const res = await fetch(
                `${API_URL}/reading/competitions/${compId}/tasks/${task.id}/quiz/evaluate-text?question_index=${qIndex}`,
                { method: 'POST', body: formData, credentials: 'include' }
            );
            const json = await res.json();
            const d = json.data || {};
            setScores(prev => [...prev, {
                score: d.score ?? 0,
                recognized: d.recognized_text || '',
                correct: d.correct_answer || currentQ.answer,
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
        recognizedTextRef.current = '';
        const ok = await ensureSpeechConfig();
        if (!ok) return;

        try {
            setRecording(true);
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfigRef.current, audioConfig);
            recognizerRef.current = recognizer;

            recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    recognizedTextRef.current += (e.result.text + " ");
                }
            };

            recognizer.startContinuousRecognitionAsync();
        } catch (e) {
            console.error('startRecording failed:', e);
            setRecording(false);
            setSttError("Mikrofon ochilmadi. Ruxsatni tekshiring.");
        }
    };

    const stopAndEvaluate = () => {
        clearInterval(timerRef.current);
        if (recognizerRef.current) {
            const rec = recognizerRef.current;
            recognizerRef.current = null;
            rec.stopContinuousRecognitionAsync(() => {
                try { rec.close(); } catch (_) { }
                evaluateText(recognizedTextRef.current.trim());
            });
        } else {
            evaluateText(recognizedTextRef.current.trim());
        }
    };

    const nextQuestion = () => {
        if (qIndex + 1 >= questions.length) {
            setQIndex(questions.length); // allDone
        } else {
            setQIndex(i => i + 1);
            setPhase('tts');
        }
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const scoreColor = (s) => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';
    const scoreBg = (s) => s >= 80 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-3xl p-7 w-full max-w-lg shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                {!allDone && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-white/60 text-xs">Savol {qIndex + 1} / {questions.length}</p>
                            {scores.length > 0 && (
                                <p className="text-xs text-white/40">O'rtacha: <span className={scoreColor(totalScore)}>{totalScore}/100</span></p>
                            )}
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${((qIndex) / questions.length) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {allDone ? (
                    <div className="flex flex-col items-center gap-4 max-h-[70vh] overflow-y-auto pr-1">
                        <div className="text-5xl">🏆</div>
                        <p className="text-white font-bold text-2xl">Umumiy natija</p>
                        <p className="text-white/40 text-sm -mt-2">{task.title}</p>

                        <div className="w-full">
                            <p className="text-white/50 text-xs uppercase tracking-wide mb-2">📖 O'qish</p>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                    <p className={`text-xl font-black text-emerald-400`}>{readingStats.wpm || 0}</p>
                                    <p className="text-white/40 text-[10px]">so'z/daq</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                    <p className="text-xl font-black text-blue-400">{readingStats.readPercent || 0}%</p>
                                    <p className="text-white/40 text-[10px]">o'qilgan</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                    <p className="text-xl font-black text-purple-400">{fmt(readingStats.elapsed || 0)}</p>
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

                        <button onClick={onClose}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-emerald-500/20">
                            {savingResult ? "Saqlanmoqda..." : "Yopish va qaytish"}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="bg-white/5 rounded-2xl p-5 mb-6">
                            <p className="text-white/40 text-xs mb-2 uppercase tracking-wide">{qIndex + 1}-savol</p>
                            <p className="text-white text-lg font-semibold leading-relaxed">{currentQ?.question}</p>
                        </div>

                        {phase === 'tts' && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center">
                                    <Volume2 className="w-7 h-7 text-emerald-500 animate-pulse" />
                                </div>
                                <p className="text-white/50 text-sm">Savol o'qilmoqda...</p>
                                <button onClick={() => { audioRef.current?.pause(); setPhase('record'); }}
                                    className="text-white/30 text-xs hover:text-white/60 underline">
                                    O'tkazib yuborish
                                </button>
                            </div>
                        )}

                        {phase === 'record' && (
                            <div className="flex flex-col items-center gap-4">
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
                                        <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                        <p className="text-white/50 text-sm">Baholanmoqda...</p>
                                    </>
                                ) : (
                                    <>
                                        {sttError && <p className="text-red-400 text-xs text-center mb-2">{sttError}</p>}
                                        <p className="text-white/60 text-sm text-center">Mikrofonni bosib javob bering</p>
                                        <button onClick={startRecording}
                                            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base transition-transform shadow-lg shadow-emerald-500/30">
                                            <Mic className="w-5 h-5" /> Javob berish
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {phase === 'result' && scores[qIndex] && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="text-4xl">{scores[qIndex].score >= 80 ? '🌟' : scores[qIndex].score >= 50 ? '👍' : '💡'}</div>
                                <div className="text-center">
                                    <p className={`text-4xl font-black ${scoreColor(scores[qIndex].score)}`}>{scores[qIndex].score}</p>
                                    <p className="text-white/40 text-xs mt-1">ball</p>
                                </div>
                                {scores[qIndex].recognized && (
                                    <div className="w-full bg-white/5 rounded-xl p-3 space-y-1.5 text-xs">
                                        <div className="flex gap-2">
                                            <span className="text-white/40 shrink-0">Siz:</span>
                                            <span className="text-white/70 italic">"{scores[qIndex].recognized}"</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-white/40 shrink-0">To'g'ri:</span>
                                            <span className="text-emerald-400">"{scores[qIndex].correct}"</span>
                                        </div>
                                    </div>
                                )}
                                <button onClick={nextQuestion}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium transition-transform">
                                    {qIndex + 1 >= questions.length ? 'Natijani ko\'rish' : 'Keyingi savol'}
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
function RecordingModal({ compId, task, onClose, reloadTasks }) {
    const [phase, setPhase] = useState('countdown');
    const [count, setCount] = useState(3);
    const [elapsed, setElapsed] = useState(0);
    const [sttError, setSttError] = useState('');
    const [transcript, setTranscript] = useState('');
    const [showQuiz, setShowQuiz] = useState(false);
    const [expectedWords, setExpectedWords] = useState([]);
    const [displayTokens, setDisplayTokens] = useState([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [savingResult, setSavingResult] = useState(false);

    const speechConfigRef = useRef(null);
    const recognizerRef = useRef(null);
    const transcriptRef = useRef('');
    const wordIndexRef = useRef(0);
    const timerRef = useRef(null);
    const autoQuizTimerRef = useRef(null);

    useEffect(() => {
        if (task.story_text) {
            setExpectedWords(extractWords(task.story_text));
            setDisplayTokens(getDisplayTokens(task.story_text));
        }
        return () => clearTimeout(autoQuizTimerRef.current);
    }, [task]);

    // Timer logic for countdown
    useEffect(() => {
        if (phase !== 'countdown') return;
        if (count <= 0) {
            // Sessiyani backend da yaratamiz
            readingService.startReading(compId, task.id).then(() => {
                setPhase('reading');
            }).catch(e => {
                setSttError("Boshlashda xatolik: " + e.message);
                setPhase('done');
            });
            return;
        }
        const t = setTimeout(() => setCount(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, count]);

    const ensureSpeechConfig = async () => {
        if (speechConfigRef.current) return true;
        try {
            let resp = await fetch(`${API_URL}/smartkids/speech-token`, { credentials: 'include' });
            if (!resp.ok) {
                resp = await fetch('https://alif24.uz/api/v1/smartkids/speech-token', { credentials: 'include' });
            }
            if (!resp.ok) throw new Error(`speech-token failed`);
            const data = await resp.json();
            const cfg = SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
            cfg.speechRecognitionLanguage = 'uz-UZ';
            speechConfigRef.current = cfg;
            return true;
        } catch (e) {
            console.error('Speech config init failed:', e);
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
                        transcriptRef.current += (newText + " ");
                        setTranscript(transcriptRef.current);

                        const spokenWords = extractWords(newText);
                        let currentIndex = wordIndexRef.current;
                        const expected = expectedWords;

                        for (let sw of spokenWords) {
                            if (currentIndex >= expected.length) break;

                            let matchedIndex = -1;
                            let lookaheadLimit = Math.min(currentIndex + 5, expected.length);

                            for (let k = currentIndex; k < lookaheadLimit; k++) {
                                const similarity = getSimilarity(sw, expected[k]);
                                if (similarity >= 0.55) {
                                    matchedIndex = k;
                                    break;
                                }
                            }
                            if (matchedIndex !== -1) {
                                currentIndex = matchedIndex + 1;
                            }
                        }
                        wordIndexRef.current = currentIndex;
                        setCurrentWordIndex(currentIndex);
                    }
                };

                recognizer.startContinuousRecognitionAsync();
            } catch (e) {
                console.error('startStt failed:', e);
                setSttError("Mikrofon ochilmadi. Ruxsatni tekshiring.");
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
                finishReadingStep();
            });
        } else {
            finishReadingStep();
        }
    };

    const finishReadingStep = async () => {
        setPhase('done');
        // If there are questions, show QuizModal
        if ((task.questions || []).length > 0) {
            autoQuizTimerRef.current = setTimeout(() => {
                setShowQuiz(true);
            }, 2000);
        } else {
            // No questions, submit right away
            try {
                setSavingResult(true);
                await readingService.submitReading(compId, task.id, {
                    stt_transcript: transcriptRef.current,
                    reading_time_seconds: elapsed,
                    questions_correct: 0
                });
                if (reloadTasks) reloadTasks();
            } catch (e) {
                console.error("Result save failed:", e);
            } finally {
                setSavingResult(false);
            }
        }
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const hasQuestions = (task.questions || []).length > 0;

    if (showQuiz) {
        const readingStats = {
            wpm: expectedWords.length > 0 && elapsed > 0 ? Math.round(currentWordIndex / (elapsed / 60)) : 0,
            readPercent: expectedWords.length > 0 ? Math.round((currentWordIndex / expectedWords.length) * 100) : 0,
            elapsed: elapsed,
            wordsRead: currentWordIndex,
            totalWords: expectedWords.length,
        };
        return (
            <QuizModal
                compId={compId}
                task={task}
                onClose={onClose}
                readingStats={readingStats}
                readingTranscript={transcriptRef.current}
                readingElapsed={elapsed}
                reloadTasks={reloadTasks}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
                <h2 className="text-white font-bold text-2xl mb-1 pr-6">{task.title}</h2>
                <p className="text-white/40 text-base mb-6">Matnni quyida o'zing o'qi 🎤</p>

                <div className="bg-white/5 rounded-xl p-5 mb-6 max-h-[50vh] overflow-y-auto">
                    <p className="text-white/90 text-lg leading-relaxed whitespace-pre-wrap">
                        {displayTokens.map((token, idx) => {
                            const isHighlighted = token.isWord && token.wordIndex < currentWordIndex;
                            return (
                                <span key={idx} className={`inline-block mr-1 transition-colors duration-150 ${isHighlighted ? "text-emerald-400 font-bold drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                                    : "text-white/90"
                                    }`}>
                                    {token.text}
                                </span>
                            );
                        })}
                    </p>
                </div>

                {phase === 'countdown' && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-white/60 text-sm">Tayyor bo'l, yozish boshlanmoqda...</p>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <span className="text-white text-5xl font-black">{count}</span>
                        </div>
                    </div>
                )}

                {phase === 'reading' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                            <div className="w-20 h-20 rounded-full bg-emerald-500/30 border-2 border-emerald-500 flex items-center justify-center">
                                <Mic className="w-8 h-8 text-emerald-400" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-emerald-400 font-mono text-lg font-bold">{fmt(elapsed)}</span>
                            <span className="text-white/40 text-sm">Yozilmoqda</span>
                        </div>
                        <button onClick={stopRecording}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-500/40 text-red-500 rounded-2xl font-medium hover:bg-red-500/30 transition-all">
                            <Square className="w-4 h-4" /> Tugatish
                        </button>
                    </div>
                )}

                {phase === 'done' && (
                    <div className="flex flex-col items-center gap-5 text-center">
                        <div className="text-5xl">✅</div>
                        <h3 className="text-white font-bold text-2xl">O'qish yakunlandi</h3>
                        <p className="text-white/50 text-sm mb-4">Natijalar hisoblanmoqda...</p>

                        {!hasQuestions && savingResult && (
                            <p className="text-emerald-400 text-sm">Saqlanmoqda...</p>
                        )}
                        {!hasQuestions && !savingResult && (
                            <button onClick={onClose} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium">Yopish</button>
                        )}

                        {hasQuestions && (
                            <button onClick={() => setShowQuiz(true)}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold transition-transform shadow-lg shadow-emerald-500/20 mt-1">
                                🧠 Savollarni boshlash ({(task.questions || []).length} ta savol)
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}

// ─── Ertak Card (Task) ────────────────────────────────────────────────────────
function ErtakCard({ task, index, onClick }) {
    const [imgError, setImgError] = useState(false);
    const hasImage = task.image_url && !imgError;
    const dayLabel = DAYS[task.day_of_week] ? DAYS[task.day_of_week].label : task.day_of_week;
    const isCompleted = task.status === 'completed';

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={onClick}
            className={`bg-gray-900 border ${isCompleted ? 'border-emerald-500/30' : 'border-gray-800'} rounded-2xl shadow-md hover:border-emerald-500/50 overflow-hidden cursor-pointer transition-all group flex flex-col h-full`}
        >
            <div className="w-full aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                {hasImage ? (
                    <img src={task.image_url} alt={task.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => setImgError(true)} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center group-hover:opacity-90 transition-opacity">
                        <BookOpen className="w-14 h-14 text-emerald-500/40" strokeWidth={1.5} />
                    </div>
                )}
                {isCompleted && (
                    <div className="absolute top-2 left-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        Bajarildi ✓
                    </div>
                )}
                {task.questions_count > 0 && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                        🧠 {task.questions_count} savol
                    </div>
                )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-white font-bold text-base mb-1 line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">{task.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 mt-auto pt-2">
                    <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-300">{dayLabel}</span>
                    <span>•</span>
                    <span>{task.total_words} so'z</span>
                </div>

                {isCompleted ? (
                    <div className="w-full flex items-center justify-between gap-2 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-semibold text-sm">
                        <span>Sizning balingiz:</span>
                        <span className="text-lg">{task.my_score?.toFixed(0)}</span>
                    </div>
                ) : (
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:scale-[1.02] transition-transform shadow-md shadow-emerald-500/20">
                        <Mic className="w-4 h-4" /> O'qishni boshlash
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReadingHome() {
    const navigate = useNavigate();
    const [competitions, setCompetitions] = useState([]);
    const [selectedComp, setSelectedComp] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [results, setResults] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [activeTab, setActiveTab] = useState('tasks');
    const [leaderboardGroup, setLeaderboardGroup] = useState('champion');

    const [hasToken, setHasToken] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    // Modal state for active task
    const [activeTaskModal, setActiveTaskModal] = useState(null);

    useEffect(() => {
        apiService.get('/auth/me')
            .then(() => setHasToken(true))
            .catch(() => setHasToken(false))
            .finally(() => setAuthChecked(true));
    }, []);

    useEffect(() => {
        if (!authChecked) return;
        loadCompetitions();
    }, [authChecked]);

    const loadCompetitions = async () => {
        try {
            setLoading(true);
            const data = await readingService.getCompetitions();
            setCompetitions(data.competitions || []);
            if (data.competitions?.length > 0) {
                selectCompetition(data.competitions[0]);
            }
        } catch (err) {
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const selectCompetition = async (comp) => {
        if (!hasToken) {
            setSelectedComp(comp);
            setTasks([]);
            return;
        }
        try {
            setLoading(true);
            const data = await readingService.getCompetition(comp.id);
            setSelectedComp(data.competition);
            setTasks(data.tasks || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const reloadActiveCompTasks = () => {
        if (selectedComp) selectCompetition(selectedComp);
    };

    const loadResults = async () => {
        if (!selectedComp || !hasToken) return;
        try {
            const data = await readingService.getMyResults(selectedComp.id);
            setResults(data);
        } catch { }
    };

    const loadLeaderboard = async (group) => {
        if (!selectedComp) return;
        try {
            const data = await readingService.getLeaderboard(selectedComp.id, { group: group || leaderboardGroup });
            setLeaderboard(data.leaderboard || []);
        } catch { }
    };

    useEffect(() => {
        if (activeTab === 'results') loadResults();
        if (activeTab === 'leaderboard') loadLeaderboard();
    }, [activeTab, selectedComp]);

    const openTask = async (task) => {
        if (!hasToken) {
            window.location.href = 'https://alif24.uz';
            return;
        }
        if (task.status === 'completed') {
            alert(`Bu vazifani bajargansiz. Balingiz: ${task.my_score?.toFixed(0) || 0}`);
            return;
        }
        try {
            // Backend dan taskni olish (story_text bilan)
            const detail = await readingService.getTask(selectedComp.id, task.id);
            setActiveTaskModal(detail.task);
        } catch (e) {
            alert(e.message || "Xatolik yuzaga keldi");
        }
    };

    if (loading && !selectedComp) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-xl">📖</div>
                        <div>
                            <h1 className="text-white font-bold text-lg">O'qish Musobaqasi</h1>
                            <p className="text-gray-500 text-xs">Alif24 · olimp.alif24.uz</p>
                        </div>
                    </div>
                    {!hasToken && (
                        <a href="https://alif24.uz/student-dashboard" className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors">
                            Kirish
                        </a>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-6">
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        {error}
                        <button onClick={() => setError('')} className="ml-2 opacity-50 hover:opacity-100">✕</button>
                    </div>
                )}

                {competitions.length > 1 && (
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                        {competitions.map(c => (
                            <button key={c.id} onClick={() => selectCompetition(c)}
                                className={`px-5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${selectedComp?.id === c.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>
                                {c.title}
                            </button>
                        ))}
                    </div>
                )}

                {!selectedComp && competitions.length === 0 && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📚</div>
                        <h2 className="text-white text-xl font-bold mb-2">Hozircha musobaqa yo'q</h2>
                        <p className="text-gray-500">Yangi musobaqa boshlanishini kuting</p>
                    </div>
                )}

                {selectedComp && (
                    <>
                        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 mb-6">
                            <h2 className="text-white font-bold text-2xl mb-1">{selectedComp.title}</h2>
                            {selectedComp.description && <p className="text-emerald-100/60 text-sm mb-3">{selectedComp.description}</p>}
                            <div className="flex flex-wrap gap-4 text-sm text-emerald-500/50">
                                <span>📅 Hafta {selectedComp.week_number}/{selectedComp.year}</span>
                                {selectedComp.start_date && <span>🗓 {selectedComp.start_date} — {selectedComp.end_date}</span>}
                            </div>
                        </div>

                        {!hasToken && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-center">
                                <p className="text-amber-400 text-sm">Musobaqada ishtirok etish uchun <a href="https://alif24.uz/student-dashboard" className="underline font-bold">tizimga kiring</a></p>
                            </div>
                        )}

                        <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 p-1.5 rounded-xl w-fit">
                            {[
                                { key: 'tasks', label: 'Vazifalar', icon: '📖' },
                                { key: 'results', label: 'Natijalarim', icon: '📊' },
                                { key: 'leaderboard', label: 'Reyting', icon: '🏆' },
                            ].map(tab => (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'tasks' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                {tasks.length > 0 ? tasks.map((task, i) => (
                                    <ErtakCard key={task.id} task={task} index={i} onClick={() => openTask(task)} />
                                )) : (
                                    <div className="col-span-1 sm:col-span-2 md:col-span-3 text-center py-20 text-gray-500">
                                        Vazifalar yo'q yoki tizimga kirmagansiz
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'results' && (
                            <div>
                                {results?.daily?.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {results.daily.map((d, i) => (
                                                <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-white font-bold">{DAYS[d.day]?.label} — <span className="text-gray-400 font-normal">{d.title}</span></span>
                                                        <span className={`text-xl font-bold ${d.status === 'completed' ? 'text-emerald-400' : 'text-gray-600'}`}>
                                                            {d.total_score?.toFixed(0) || '—'} <span className="text-xs text-gray-500 font-normal">ball</span>
                                                        </span>
                                                    </div>
                                                    {d.status === 'completed' && (
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {[
                                                                { label: 'Matn', val: `${d.completion_percentage?.toFixed(0)}%`, score: d.score_completion },
                                                                { label: "So'zlar", val: `${d.words_read}/${d.total_words}`, score: d.score_words },
                                                                { label: 'Vaqt', val: `${d.reading_time_seconds?.toFixed(0)}s`, score: d.score_time },
                                                                { label: 'Savollar', val: `${d.questions_correct}/${d.questions_total}`, score: d.score_questions },
                                                            ].map((s, j) => (
                                                                <div key={j} className="bg-gray-800 rounded-xl p-2.5 text-center flex flex-col justify-between">
                                                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{s.label}</div>
                                                                    <div className="text-white text-sm font-bold mb-1">{s.val}</div>
                                                                    <div className="text-emerald-400 text-[10px] font-bold">{s.score?.toFixed(0)}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {d.status !== 'completed' && (
                                                        <div className="text-sm text-gray-500">Bajarilmagan</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {results.overall && (
                                            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-6 mt-6">
                                                <h3 className="text-white font-bold text-lg mb-4 text-center">🏆 Umumiy Natija</h3>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="text-center bg-gray-900/50 rounded-xl py-3 border border-emerald-500/10">
                                                        <div className="text-3xl font-black text-emerald-400">{results.overall.total_reading_score?.toFixed(0)}</div>
                                                        <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">O'qish bali</div>
                                                    </div>
                                                    <div className="text-center bg-gray-900/50 rounded-xl py-3 border border-blue-500/10">
                                                        <div className="text-3xl font-black text-blue-400">{results.overall.test_score?.toFixed(0)}</div>
                                                        <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Yakuniy Test</div>
                                                    </div>
                                                    <div className="text-center bg-gradient-to-b from-amber-500/20 to-amber-600/5 rounded-xl py-3 border border-amber-500/30">
                                                        <div className="text-3xl font-black text-amber-400">{results.overall.total_score?.toFixed(0)}</div>
                                                        <div className="text-xs text-amber-500/70 mt-1 uppercase tracking-wider">Jami Ball</div>
                                                    </div>
                                                </div>
                                                {results.overall.rank_overall && (
                                                    <div className="text-center mt-4 text-emerald-100/60 text-sm">
                                                        Sizning o'riningiz reytingda: <span className="text-white font-bold text-lg mx-1">#{results.overall.rank_overall}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-8">
                                            <SpeedChart dailyResults={results.daily} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-gray-500">
                                        Natijalar hali yo'q
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'leaderboard' && (
                            <div>
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                                    {[
                                        { key: 'champion', label: 'Umumiy reyting', icon: '🏆' },
                                        { key: 'fast_reader', label: 'Tez o\'quvchilar', icon: '⚡' },
                                        { key: 'accurate_reader', label: 'Aniq o\'quvchilar', icon: '🎯' },
                                        { key: 'test_master', label: 'Test ustasi', icon: '📝' },
                                    ].map(g => (
                                        <button key={g.key}
                                            onClick={() => { setLeaderboardGroup(g.key); loadLeaderboard(g.key); }}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${leaderboardGroup === g.key
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                                                }`}>
                                            <span>{g.icon}</span>
                                            <span>{g.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {leaderboard.length > 0 ? (
                                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                                                    <tr>
                                                        <th className="py-4 px-4 font-semibold">#</th>
                                                        <th className="py-4 px-4 font-semibold">Ism</th>
                                                        {leaderboardGroup === 'fast_reader' && <>
                                                            <th className="text-center py-4 px-4 font-semibold">To'liqlik</th>
                                                            <th className="text-center py-4 px-4 font-semibold">Vaqt</th>
                                                            <th className="text-center py-4 px-4 font-semibold">So'zlar</th>
                                                        </>}
                                                        {leaderboardGroup === 'accurate_reader' && <>
                                                            <th className="text-center py-4 px-4 font-semibold">To'liqlik</th>
                                                            <th className="text-center py-4 px-4 font-semibold">TJ*</th>
                                                        </>}
                                                        {leaderboardGroup === 'test_master' && <>
                                                            <th className="text-center py-4 px-4 font-semibold">Test</th>
                                                            <th className="text-center py-4 px-4 font-semibold">Jami</th>
                                                        </>}
                                                        {leaderboardGroup === 'champion' && <>
                                                            <th className="text-center py-4 px-4 font-semibold">O'qish</th>
                                                            <th className="text-center py-4 px-4 font-semibold">Test</th>
                                                            <th className="text-center py-4 px-4 font-semibold">Jami</th>
                                                        </>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-800/50">
                                                    {leaderboard.map((r, i) => (
                                                        <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-gray-300 font-bold">
                                                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : r.rank}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-white font-medium">{r.student_name}</td>
                                                            {leaderboardGroup === 'fast_reader' && <>
                                                                <td className="py-3 px-4 text-center text-emerald-400 font-medium">{r.avg_completion?.toFixed(0)}%</td>
                                                                <td className="py-3 px-4 text-center text-blue-400">{r.avg_reading_time?.toFixed(1)}s</td>
                                                                <td className="py-3 px-4 text-center text-gray-400">{r.total_words_read}</td>
                                                            </>}
                                                            {leaderboardGroup === 'accurate_reader' && <>
                                                                <td className="py-3 px-4 text-center text-emerald-400 font-medium">{r.avg_completion?.toFixed(0)}%</td>
                                                                <td className="py-3 px-4 text-center text-blue-400 font-medium">{r.questions_correct}/{r.questions_total}</td>
                                                            </>}
                                                            {leaderboardGroup === 'test_master' && <>
                                                                <td className="py-3 px-4 text-center text-blue-400 font-medium">{r.test_score?.toFixed(0)}</td>
                                                                <td className="py-3 px-4 text-center text-amber-400 font-bold">{r.total_score?.toFixed(0)}</td>
                                                            </>}
                                                            {leaderboardGroup === 'champion' && <>
                                                                <td className="py-3 px-4 text-center text-emerald-400 font-medium">{r.total_reading_score?.toFixed(0)}</td>
                                                                <td className="py-3 px-4 text-center text-blue-400 font-medium">{r.test_score?.toFixed(0)}</td>
                                                                <td className="py-3 px-4 text-center text-amber-400 font-bold text-lg">{r.total_score?.toFixed(0)}</td>
                                                            </>}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
                                        <div className="text-5xl mb-4 text-gray-700">🏆</div>
                                        <p className="text-gray-400">Bu guruhda natijalar hali yo'q</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Render the Active Task Reading Modal */}
                <AnimatePresence>
                    {activeTaskModal && (
                        <RecordingModal
                            compId={selectedComp.id}
                            task={activeTaskModal}
                            onClose={() => setActiveTaskModal(null)}
                            reloadTasks={() => reloadActiveCompTasks()}
                        />
                    )}
                </AnimatePresence>

            </main>
        </div>
    );
}
