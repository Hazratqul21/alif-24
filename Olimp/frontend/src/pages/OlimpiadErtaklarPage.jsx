import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookMarked, Mic, Play, Square, X, BookOpen, ChevronRight, Volume2, RotateCcw, Trophy } from 'lucide-react';
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import apiService from '../services/apiService';
import { getSimilarity, extractWords, getDisplayTokens } from '../utils/fuzzyMatch';

let API_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';
if (API_URL.startsWith('http://') && window.location.protocol === 'https:') {
    API_URL = API_URL.replace('http://', 'https://');
}

// ─── Submit to Olympiad ────────────────────────────────────────────────────────
function SubmitToOlympiad({ olympiadId, storyId, wpm, readPercent, readElapsed, quizAnswers = [], quizScoreDirect = null, submitted, onSubmitted, onRefresh }) {
    const [status, setStatus] = useState(submitted ? 'done' : 'idle');
 
    useEffect(() => {
        if (!olympiadId || submitted) return;
        const submit = async () => {
            try {
                setStatus('sending');
                const studentId = localStorage.getItem('userId');
                if (!studentId) { setStatus('done'); onSubmitted(); return; }
                await apiService.post(`/olympiad/${olympiadId}/reading-submit`, {
                    student_id: studentId,
                    story_id: storyId,
                    wpm: wpm || 0,
                    read_percent: readPercent || 0,
                    reading_time_seconds: readElapsed || 0,
                    quiz_answers: quizAnswers,
                    quiz_score_direct: quizScoreDirect,
                });
                setStatus('done');
                onSubmitted();
                // Refresh the story list AFTER successful submit so card turns green
                if (onRefresh) onRefresh();
            } catch (err) {
                console.error('Olympiad submit error:', err);
                setStatus('done');
                onSubmitted();
            }
        };
        submit();
    }, [olympiadId]);


    if (!olympiadId) return null;
    if (status === 'sending') return (
        <p className="text-white/40 text-xs text-center animate-pulse">
            Natija olimpiadaga yuborilmoqda...
        </p>
    );
    if (status === 'done') return (
        <p className="text-emerald-400 text-xs text-center">✅ Natija olimpiadaga yuborildi!</p>
    );
    return null;
}

// ─── Quiz Modal ────────────────────────────────────────────────────────────────
function QuizModal({ ertak, onClose, readingStats = {}, olympiadId = null, onRefresh = null }) {
    const questions = ertak.questions || [];
    const [qIndex, setQIndex] = useState(0);
    const [phase, setPhase] = useState('tts');
    const [resultSubmitted, setResultSubmitted] = useState(false);
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

    const currentQ = questions[qIndex];
    const totalScore = scores.length ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0;
    const totalCorrect = scores.filter(s => s.passed).length;
    const pointsPerCorrect = 5;
    const totalPoints = totalCorrect * pointsPerCorrect;
    const maxPoints = questions.length * pointsPerCorrect;
    // Convert to 0-100 scale for backend (same logic as backend reading-submit)
    const quizScoreForSubmit = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
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

    const ensureSpeechConfig = async () => {
        if (speechConfigRef.current) return true;
        try {
            let resp = await fetch(`${API_URL}/smartkids/speech-token`, { credentials: 'include' });
            if (!resp.ok) {
                const body = await resp.text();
                const status = resp.status;
                const detail = body ? body : 'Unknown error';
                throw new Error(`speech-token failed (${status}): ${detail}`);
            }
            const data = await resp.json();
            const cfg = SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
            cfg.speechRecognitionLanguage = ertak.language === 'ru' ? 'ru-RU' : ertak.language === 'en' ? 'en-US' : 'uz-UZ';
            speechConfigRef.current = cfg;
            return true;
        } catch (e) {
            const msg = e?.message || String(e) || "Ovozli tanishga ulanib bo'lmadi.";
            setSttError(`Ovozli tanishga ulanib bo'lmadi: ${msg}`);
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
                `${API_URL}/olympiad/ertaklar/${ertak.id}/quiz/evaluate-text?question_index=${qIndex}`,
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
            setQIndex(questions.length);
        } else {
            setQIndex(i => i + 1);
            setPhase('tts');
        }
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const scoreColor = (s) => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';
    const scoreBg = (s) => s >= 80 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-red-500';

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
                            <div
                                className="h-full bg-gradient-to-r from-[#4b30fb] to-[#764ba2] rounded-full transition-all"
                                style={{ width: `${((qIndex) / questions.length) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {allDone ? (() => {
                    const wpm = readingStats.wpm || 0;
                    const readPercent = readingStats.readPercent || 0;
                    const readElapsed = readingStats.elapsed || 0;
                    const fmtTime = `${String(Math.floor(readElapsed / 60)).padStart(2, '0')}:${String(readElapsed % 60).padStart(2, '0')}`;
                    const readingCoin = wpm >= 60 ? 10 : wpm >= 40 ? 5 : 2;
                    const quizCoin = totalScore >= 80 ? 15 : totalScore >= 50 ? 8 : 3;
                    const totalCoin = readingCoin + quizCoin;
                    const wpmColor = wpm >= 60 ? 'text-emerald-400' : wpm >= 40 ? 'text-amber-400' : 'text-red-400';
                    const overallEmoji = (totalScore >= 80 && wpm >= 40) ? '🏆' : totalScore >= 50 ? '⭐' : '💪';

                    return (
                        <div className="flex flex-col items-center gap-5">
                            <div className="text-6xl pt-2 pb-1">💪</div>
                            <div className="text-center">
                                <p className="text-white font-bold text-[1.75rem] mb-1">Umumiy natija</p>
                                <p className="text-white/40 text-sm">{ertak.title}</p>
                            </div>

                            <div className="w-full mt-2">
                                <p className="text-white/50 text-[11px] uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
                                    📖 O'QISH
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-[#1b254b]/50 border border-white/[0.03] rounded-2xl p-4 flex flex-col items-center justify-center">
                                        <p className={`text-[1.75rem] font-black mb-1 leading-none ${wpmColor}`}>{wpm}</p>
                                        <p className="text-white/40 text-[10px] uppercase font-medium tracking-wide">so'z/daq</p>
                                    </div>
                                    <div className="bg-[#1b254b]/50 border border-white/[0.03] rounded-2xl p-4 flex flex-col items-center justify-center">
                                        <p className="text-[1.75rem] font-black mb-1 leading-none text-[#5188f6]">{readPercent}%</p>
                                        <p className="text-white/40 text-[10px] uppercase font-medium tracking-wide">o'qilgan</p>
                                    </div>
                                    <div className="bg-[#1b254b]/50 border border-white/[0.03] rounded-2xl p-4 flex flex-col items-center justify-center">
                                        <p className="text-[1.75rem] font-black mb-1 leading-none text-[#c97cf7]">{fmtTime}</p>
                                        <p className="text-white/40 text-[10px] uppercase font-medium tracking-wide">vaqt</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full mt-1">
                                <p className="text-white/50 text-[11px] uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
                                    🧠 SAVOL-JAVOB
                                </p>
                                <div className="bg-[#1b254b]/50 border border-white/[0.03] rounded-[1.25rem] p-6 text-center mb-4">
                                    <p className={`text-[3.5rem] leading-none font-black mb-2 ${scoreColor(totalScore)}`}>{totalScore}</p>
                                    <p className="text-white/40 text-sm font-medium">100 ball dan</p>
                                </div>
                                <div className="space-y-[6px]">
                                    {scores.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between bg-[#1b254b]/30 rounded-xl px-5 py-[13px]">
                                            <span className="text-white/60 text-[13px] font-medium">{i + 1}-savol</span>
                                            <div className="flex items-center gap-4">
                                                <div className="w-[4.5rem] h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${scoreBg(s.score)}`} style={{ width: `${s.score}%` }} />
                                                </div>
                                                <span className={`text-[13px] font-bold min-w-[28px] text-right ${scoreColor(s.score)}`}>{s.score}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full mt-2 bg-gradient-to-r from-[#cca651]/10 via-[#cca651]/15 to-[#cca651]/10 border border-[#cca651]/20 rounded-3xl p-[18px] text-center flex flex-col items-center justify-center">
                                <div className="flex items-center gap-3 mb-1">
                                    <p className="text-4xl leading-none font-black text-[#facc15]">+{totalCoin}</p>
                                    <img src="/icons/coin.svg" alt="coin" className="w-[38px] h-[38px] drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }} />
                                    <span className="text-4xl filter drop-shadow-md hidden">🪙</span>
                                </div>
                                <p className="text-white/50 text-[13px] font-medium tracking-wide">O'qish: +{readingCoin} • Quiz: +{quizCoin}</p>
                            </div>

                            {/* The "Testni boshlash" button is intentionally omitted here as this is already within the Quiz modal */}

                            <SubmitToOlympiad
                                olympiadId={olympiadId}
                                storyId={ertak.id}
                                wpm={wpm}
                                readPercent={readPercent}
                                readElapsed={readElapsed}
                                quizAnswers={scores.map((s, idx) => ({
                                    question_id: String(idx),
                                    answer_index: 0,
                                    score: s.score
                                }))}
                                quizScoreDirect={quizScoreForSubmit}
                                submitted={resultSubmitted}
                                onSubmitted={() => setResultSubmitted(true)}
                                onRefresh={onRefresh}
                            />

                            <button onClick={onClose}
                                className="w-full py-[18px] mt-2 bg-gradient-to-r from-[#5f33f6] to-[#7f3bf6] text-white rounded-2xl font-bold text-[17px] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                                Yopish
                            </button>
                        </div>
                    );
                })() : (
                    <>
                        <div className="bg-white/5 rounded-2xl p-4 mb-5">
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
                                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-bold text-base hover:scale-105 transition-transform shadow-lg shadow-purple-500/30">
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

// ─── Olympiad Test Result Modal ──────────────────────────────────────────────
function OlympiadTestResultModal({ result, onClose }) {
    const wrongAnswers = (result.total_questions || 0) - (result.correct_answers || 0);
    return (
        <div className="space-y-6 text-center py-4">
            <div className="text-5xl mt-2 mb-2">🎯</div>
            <h2 className="text-[#1a1a2e] font-bold text-2xl">Test natijasi!</h2>
            <div className="grid grid-cols-2 gap-4 text-left">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <p className="text-emerald-800/60 text-[10px] uppercase font-bold tracking-wider mb-1">To'g'ri</p>
                    <p className="text-emerald-600 font-extrabold text-2xl">{result.correct_answers ?? 0} ta</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                    <p className="text-rose-800/60 text-[10px] uppercase font-bold tracking-wider mb-1">Noto'g'ri</p>
                    <p className="text-rose-600 font-extrabold text-2xl">{wrongAnswers} ta</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                    <p className="text-indigo-800/60 text-[10px] uppercase font-bold tracking-wider mb-1">Vaqt</p>
                    <p className="text-[#4b30fb] font-extrabold text-2xl">{result.elapsed_seconds ? `${Math.floor(result.elapsed_seconds / 60)}:${String(result.elapsed_seconds % 60).padStart(2, '0')}` : '—'}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <p className="text-amber-800/60 text-[10px] uppercase font-bold tracking-wider mb-1">Test bali</p>
                    <p className="text-amber-600 font-extrabold text-2xl">{result.quiz_score ?? 0}</p>
                </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-100/50 to-orange-100/50 border border-yellow-200 rounded-2xl p-5 flex flex-col items-center justify-center">
                <p className="text-amber-900/40 text-[10px] uppercase font-bold tracking-widest mb-2">Yig'ilgan coinlar</p>
                <div className="flex items-center gap-3">
                    <p className="text-4xl font-black text-amber-600">+{result.quiz_coins ?? 0}</p>
                    <span className="text-4xl">🪙</span>
                </div>
            </div>

            <div className="space-y-2">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-slate-500 text-sm font-medium">Jami olimpiada balli</span>
                    <span className="text-[#1a1a2e] font-extrabold text-lg">{result.total_score ?? 0}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-slate-500 text-sm font-medium">Jami yig'ilgan coinlar</span>
                    <span className="text-amber-600 font-extrabold text-lg flex items-center gap-1.5">{result.total_coins ?? 0} 🪙</span>
                </div>
            </div>

            <button
                onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-purple-500/25"
            >
                Yopish
            </button>
        </div>
    );
}

// ─── Olympiad Reading Result Modal ───────────────────────────────────────────
function OlympiadReadingResultModal({ result, readingStats, olympiadId, storyId, onClose }) {
    const wpm = readingStats.wpm || 0;
    const readPercent = readingStats.readPercent || 0;
    const readElapsed = readingStats.elapsed || 0;
    const fmtTime = `${String(Math.floor(readElapsed / 60)).padStart(2, '0')}:${String(readElapsed % 60).padStart(2, '0')}`;
    const readingCoin = result.reading_coins ?? 0;
    const quizCoin = result.quiz_coins ?? 0;
    const totalCoin = readingCoin + quizCoin;
    const totalScore = result.total_score || 0;
    const quizScore = result.quiz_score || 0;
    const wpmColor = wpm >= 60 ? 'text-emerald-600' : wpm >= 40 ? 'text-amber-600' : 'text-rose-600';
    const scoreColor = (s) => s >= 80 ? 'text-emerald-600' : s >= 50 ? 'text-amber-600' : 'text-rose-600';
    const wrongAnswers = (result.total_questions || 0) - (result.correct_answers || 0);
    const testFmtTime = result.elapsed_seconds ? `${String(Math.floor(result.elapsed_seconds / 60)).padStart(2, '0')}:${String(result.elapsed_seconds % 60).padStart(2, '0')}` : '00:00';
    const isQuizAttempted = (result.total_questions || 0) > 0;

    return (
        <div className="flex flex-col items-center gap-6 py-2">
            <div className="text-6xl mt-2">🎖️</div>
            <div className="text-center">
                <p className="text-[#1a1a2e] font-black text-3xl mb-1">Natijangiz</p>
                <p className="text-slate-400 text-sm">Ajoyib ko'rsatkich!</p>
            </div>

            <div className="w-full">
                <p className="text-slate-800/40 text-[10px] uppercase tracking-[0.2em] font-black mb-4 flex items-center gap-2 px-1">
                    📖 O'QISH TEZLIGI
                </p>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                        <p className={`text-2xl font-black mb-1 leading-none ${wpmColor}`}>{wpm}</p>
                        <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">so'z/daq</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                        <p className="text-2xl font-black mb-1 leading-none text-indigo-600">{readPercent}%</p>
                        <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">o'qilgan</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                        <p className="text-2xl font-black mb-1 leading-none text-purple-600">{fmtTime}</p>
                        <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">vaqt</p>
                    </div>
                </div>
            </div>

            <div className="w-full">
                <p className="text-slate-800/40 text-[10px] uppercase tracking-[0.2em] font-black mb-4 flex items-center gap-2 px-1">
                    🧠 SAVOL-JAVOB
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex flex-col items-center justify-center">
                        <p className={`text-4xl font-black mb-1 leading-none ${scoreColor(quizScore)}`}>{quizScore}</p>
                        <p className="text-indigo-900/40 text-[9px] uppercase font-bold tracking-widest">Vazifa bali</p>
                    </div>
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex flex-col items-center justify-center">
                        <p className={`text-4xl font-black mb-1 leading-none ${scoreColor(totalScore)}`}>{totalScore}</p>
                        <p className="text-indigo-900/40 text-[9px] uppercase font-bold tracking-widest">Jami reyting</p>
                    </div>
                </div>
                {isQuizAttempted && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 border border-emerald-100/50">
                            <span className="text-[13px] font-semibold">To'g'ri javoblar</span>
                            <span className="text-[13px] font-black">{result.correct_answers || 0} ta</span>
                        </div>
                        <div className="flex items-center justify-between bg-rose-50 text-rose-700 rounded-xl px-4 py-3 border border-rose-100/50">
                            <span className="text-[13px] font-semibold">Noto'g'ri javoblar</span>
                            <span className="text-[13px] font-black">{wrongAnswers} ta</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-3xl p-6 text-center flex flex-col items-center justify-center shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <p className="text-4xl leading-none font-black text-amber-600">+{totalCoin}</p>
                    <span className="text-4xl">🪙</span>
                </div>
                <p className="text-amber-800/40 text-xs font-bold tracking-wide">
                    O'qish: +{readingCoin} {isQuizAttempted && `• Quiz: +${quizCoin}`}
                </p>
            </div>

            <button onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-purple-500/25">
                Yopish
            </button>
        </div>
    );
}

// ─── Olympiad Quiz Modal (multiple-choice) ───────────────────────────────────
function OlympiadQuizModal({ questions = [], olympiadId, storyId = null, onClose, readingStats = null, onRefresh = null }) {
    const [qIndex, setQIndex] = useState(0);
    const [selected, setSelected] = useState(null);
    const [answers, setAnswers] = useState(Array(questions.length).fill(null));
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [startedAt, setStartedAt] = useState(Date.now());
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        setQIndex(0);
        setSelected(null);
        setAnswers(Array(questions.length).fill(null));
        setSubmitting(false);
        setResult(null);
        setError('');
        setStartedAt(Date.now());
        setElapsedSeconds(0);
    }, [questions, olympiadId]);

    useEffect(() => {
        if (result) return;
        const interval = setInterval(() => {
            setElapsedSeconds(Math.round((Date.now() - startedAt) / 1000));
        }, 500);
        return () => clearInterval(interval);
    }, [startedAt, result]);

    const currentQuestion = questions[qIndex];

    const handleSelect = (index) => {
        setSelected(index);
        setAnswers(prev => {
            const next = [...prev];
            next[qIndex] = index;
            return next;
        });
    };

    const next = () => {
        if (selected === null) return;
        if (qIndex + 1 < questions.length) {
            setQIndex(qIndex + 1);
            setSelected(answers[qIndex + 1] ?? null);
        } else {
            submit();
        }
    };

    const submit = async () => {
        setSubmitting(true);
        setError('');
        try {
            const studentId = localStorage.getItem('userId');
            const url = `/olympiad/${olympiadId}/reading-submit`;

            const payload = {
                student_id: studentId,
                story_id: storyId,
                wpm: readingStats?.wpm || 0,
                read_percent: readingStats?.readPercent || 0,
                reading_time_seconds: readingStats?.elapsed || 0,
                quiz_score_direct: null,
                quiz_answers: questions.map((q, idx) => ({
                    question_id: q.id,
                    answer_index: answers[idx] ?? 0,
                }))
            };

            const res = await apiService.post(url, payload);
            setResult({
                ...(res.data || {}),
                elapsed_seconds: elapsedSeconds,
            });
            // Refresh story list so card turns green
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Olympiad quiz submit error:', err);
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setResult(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={handleClose}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.88, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="relative bg-black/75 border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: '94vh' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between px-4 pt-4 pb-3">
                    <div>
                        <h2 className="text-white font-bold text-xl">Olimpiada testi</h2>
                        <p className="text-white/50 text-xs">{questions.length} savol</p>
                    </div>
                    <button onClick={handleClose} className="text-white/40 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {questions.length === 0 ? (
                        <div className="text-center py-10 text-white/60">Bu olimpiada uchun test savollari mavjud emas.</div>
                    ) : result ? (
                        readingStats ? (
                            <OlympiadReadingResultModal
                                result={result}
                                readingStats={readingStats}
                                olympiadId={olympiadId}
                                storyId={storyId}
                                onClose={handleClose}
                            />
                        ) : (
                            <OlympiadTestResultModal
                                result={result}
                                onClose={handleClose}
                            />
                        )
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <p className="text-white/60 text-xs mb-2">{qIndex + 1}/{questions.length} - savol</p>
                                <p className="text-white text-lg font-semibold">{currentQuestion?.question_text}</p>
                            </div>

                            <div className="space-y-2">
                                {currentQuestion?.options?.map((opt, oi) => {
                                    const selectedClass = selected === oi ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200' : 'bg-white/5 border-white/10 text-white/70';
                                    return (
                                        <button
                                            key={oi}
                                            onClick={() => handleSelect(oi)}
                                            className={`w-full text-left px-4 py-3 rounded-2xl border ${selectedClass} hover:bg-emerald-500/20 transition`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono w-6 text-left">{String.fromCharCode(65 + oi)}.</span>
                                                <span className="grow text-sm">{opt}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                            <button
                                onClick={next}
                                disabled={selected === null || submitting}
                                className="w-full py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-semibold disabled:opacity-50 hover:scale-[1.02] transition-transform"
                            >
                                {qIndex + 1 >= questions.length ? (submitting ? 'Yuborilmoqda...' : 'Yakunlash') : 'Keyingi'}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ─── Recording Modal ───────────────────────────────────────────────────────────
function RecordingModal({ ertak, onClose, olympiadId = null, olympiadQuestions = [], onStartOlympiadQuiz, onRefresh }) {
    const [phase, setPhase] = useState('countdown');
    const [count, setCount] = useState(3);
    const [elapsed, setElapsed] = useState(0);
    const [sttError, setSttError] = useState('');
    const [sttAvailable, setSttAvailable] = useState(true);
    const [transcript, setTranscript] = useState('');
    const [playing, setPlaying] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const [showOlympiadQuizInternal, setShowOlympiadQuizInternal] = useState(false);

    const storyQuestions = ertak?.questions || [];
    const hasStoryQuestions = storyQuestions.length > 0;
    const hasOlympiadQuestions = (olympiadQuestions || []).length > 0;
    const hasAnyQuiz = hasStoryQuestions || hasOlympiadQuestions;

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
        if (!sttAvailable) return false;
        if (speechConfigRef.current) return true;
        try {
            const resp = await fetch(`${API_URL}/smartkids/speech-token`, { credentials: 'include' });
            if (!resp.ok) {
                const mainResp = await fetch('https://alif24.uz/api/v1/smartkids/speech-token', { credentials: 'include' });
                if (!mainResp.ok) throw new Error(`speech-token failed`);
                const data = await mainResp.json();
                const cfg = SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
                cfg.speechRecognitionLanguage = ertak.language === 'ru' ? 'ru-RU' : ertak.language === 'en' ? 'en-US' : 'uz-UZ';
                speechConfigRef.current = cfg;
                return true;
            }
            const data = await resp.json();
            const cfg = SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
            cfg.speechRecognitionLanguage = ertak.language === 'ru' ? 'ru-RU' : ertak.language === 'en' ? 'en-US' : 'uz-UZ';
            speechConfigRef.current = cfg;
            return true;
        } catch (e) {
            const msg = e?.message || String(e) || "Ovozli tanishga ulanib bo'lmadi.";
            setSttError(`Ovozli tanishga ulanib bo'lmadi: ${msg}`);
            setSttAvailable(false);
            return false;
        }
    };

    useEffect(() => {
        if (phase !== 'reading') return;

        const startBrowserSpeechRecognition = () => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) return false;

            try {
                const recognizer = new SpeechRecognition();
                recognizer.lang = ertak.language === 'ru' ? 'ru-RU' : ertak.language === 'en' ? 'en-US' : 'uz-UZ';
                recognizer.continuous = true;
                recognizer.interimResults = true;

                recognizer.onresult = (event) => {
                    const results = Array.from(event.results)
                        .map(r => r[0]?.transcript || '')
                        .join(' ');
                    transcriptRef.current += (results + ' ');
                    setTranscript(transcriptRef.current);

                    const spokenWords = extractWords(results);
                    let currentIndex = wordIndexRef.current;
                    const expected = expectedWords;

                    for (let sw of spokenWords) {
                        if (currentIndex >= expected.length) break;
                        let matchedIndex = -1;
                        let lookaheadLimit = Math.min(currentIndex + 5, expected.length);
                        for (let k = currentIndex; k < lookaheadLimit; k++) {
                            const similarity = getSimilarity(sw, expected[k]);
                            if (similarity >= 0.55) { matchedIndex = k; break; }
                        }
                        if (matchedIndex !== -1) currentIndex = matchedIndex + 1;
                    }

                    wordIndexRef.current = currentIndex;
                    setCurrentWordIndex(currentIndex);
                };

                recognizer.onerror = () => {
                    setSttError('Brauzeringizda ovozli tanish qo\'llab-quvvatlanmaydi.');
                };

                recognizer.start();
                recognizerRef.current = recognizer;
                return true;
            } catch (e) {
                return false;
            }
        };

        const startStt = async () => {
            setSttError('');
            transcriptRef.current = '';
            setTranscript('');
            setCurrentWordIndex(0);
            wordIndexRef.current = 0;

            const ok = await ensureSpeechConfig();
            if (!ok) {
                // Try browser-native speech recognition as a fallback
                if (startBrowserSpeechRecognition()) {
                    return;
                }
                return;
            }

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
                                if (similarity >= 0.55) { matchedIndex = k; break; }
                            }
                            if (matchedIndex !== -1) currentIndex = matchedIndex + 1;
                        }

                        wordIndexRef.current = currentIndex;
                        setCurrentWordIndex(currentIndex);
                    }
                };

                recognizer.startContinuousRecognitionAsync();
            } catch (e) {
                setSttError("Mikrofon ochilmadi. Ruxsatni tekshiring.");
            }
        };

        startStt();
        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

        return () => {
            clearInterval(timerRef.current);
            if (recognizerRef.current) {
                try { recognizerRef.current.stopContinuousRecognitionAsync(); recognizerRef.current.close(); } catch (_) { }
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
                if (hasAnyQuiz) {
                    autoQuizTimerRef.current = setTimeout(() => {
                        if (hasStoryQuestions) setShowQuiz(true);
                        else if (hasOlympiadQuestions) setShowOlympiadQuizInternal(true);
                    }, 2000);
                }
            });
        } else {
            setPhase('done');
            if (hasAnyQuiz) {
                autoQuizTimerRef.current = setTimeout(() => {
                    if (hasStoryQuestions) setShowQuiz(true);
                    else if (hasOlympiadQuestions) setShowOlympiadQuizInternal(true);
                }, 2000);
            }
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
            const reqText = encodeURIComponent(text.substring(0, 1000));
            const response = await fetch(
                `${API_URL}/speech/tts?text=${reqText}&language=${ertak.language || 'uz'}&gender=female`,
                { credentials: 'include' }
            );
            if (!response.ok) throw new Error('TTS xato');
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            audio.onended = () => { URL.revokeObjectURL(audioUrl); audioRef.current = null; setPlaying(false); };
            await audio.play();
        } catch (err) {
            setPlaying(false);
        }
    };

    const resetReading = () => {
        setPhase('countdown');
        setCount(3);
        setElapsed(0);
        setPlaying(false);
        setCurrentWordIndex(0);
        wordIndexRef.current = 0;
        setTranscript('');
        transcriptRef.current = '';
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    if (showQuiz || showOlympiadQuizInternal) {
        const readingStats = {
            wpm: expectedWords.length > 0 && elapsed > 0 ? Math.round(currentWordIndex / (elapsed / 60)) : 0,
            readPercent: expectedWords.length > 0 ? Math.round((currentWordIndex / expectedWords.length) * 100) : 0,
            elapsed,
            wordsRead: currentWordIndex,
            totalWords: expectedWords.length,
        };
        if (showQuiz) return <QuizModal ertak={ertak} onClose={onClose} readingStats={readingStats} olympiadId={olympiadId} onRefresh={onRefresh} />;
        if (showOlympiadQuizInternal) return <OlympiadQuizModal questions={olympiadQuestions} olympiadId={olympiadId} storyId={ertak.id} onClose={onClose} readingStats={readingStats} onRefresh={onRefresh} />;

    }

    // ── reading stats for 'done' phase ──
    const totalWords = expectedWords.length;
    const wordsRead = currentWordIndex;
    const readPercent = totalWords > 0 ? Math.round((wordsRead / totalWords) * 100) : 0;
    const minutes = elapsed / 60;
    const wpm = minutes > 0 ? Math.round(wordsRead / minutes) : 0;
    const coinEarned = wpm >= 60 ? 10 : wpm >= 40 ? 5 : 2;
    const wpmColor = wpm >= 60 ? 'text-emerald-400' : wpm >= 40 ? 'text-amber-400' : 'text-red-400';
    const wpmBg = wpm >= 60 ? 'from-emerald-500/20 to-emerald-600/10' : wpm >= 40 ? 'from-amber-500/20 to-amber-600/10' : 'from-red-500/20 to-red-600/10';
    const emoji = wpm >= 60 ? '🏆' : wpm >= 40 ? '⭐' : '💪';
    const fmtTime = fmt(elapsed);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={onClose}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.88, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: '94vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="flex items-start justify-between px-2 pt-2 pb-2 shrink-0">
                    <div className="pr-8">
                        <h2 className="text-white font-bold text-xl leading-tight">{ertak.title}</h2>

                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors shrink-0 mt-0.5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Text Area — grows to fill available space ── */}
                {phase !== 'done' && (
                    <div className="mx-4 mb-3 flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto p-2" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            <p className="text-white/90 text-[16px] leading-[1.9] font-medium" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {displayTokens.map((token, idx) => {
                                    const isHighlighted = token.isWord && token.wordIndex < currentWordIndex;
                                    if (!token.isWord) {
                                        // space / punctuation — render as plain text
                                        return <span key={idx}>{token.text}</span>;
                                    }
                                    // check if next token already starts with a space
                                    const nextToken = displayTokens[idx + 1];
                                    const needsSpace = nextToken && nextToken.isWord; // both words, no space token between
                                    return (
                                        <span key={idx}>
                                            <span
                                                className={`transition-colors duration-150 ${isHighlighted
                                                    ? 'text-emerald-400 font-bold drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                                                    : 'text-white/85'
                                                    }`}
                                            >
                                                {token.text}
                                            </span>
                                            {needsSpace ? ' ' : ''}
                                        </span>
                                    );
                                })}
                            </p>
                        </div>
                        {/* Progress bar at bottom of text area */}
                        {totalWords > 0 && (
                            <div className="shrink-0 px-4 py-2 border-t border-white/5 flex items-center gap-3">
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
                                        style={{ width: `${readPercent}%` }}
                                    />
                                </div>
                                <span className="text-white/30 text-[11px] shrink-0">{wordsRead}/{totalWords}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Bottom Controls ── */}
                <div className="shrink-0 px-4 pb-5">

                    {/* Countdown */}
                    {phase === 'countdown' && (
                        <div className="flex flex-col items-center gap-3 py-3">
                            <p className="text-white/50 text-sm">Tayyor bo'l, yozish boshlanmoqda...</p>
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4b30fb] to-[#764ba2] flex items-center justify-center shadow-lg shadow-purple-500/40">
                                <span className="text-white text-5xl font-black">{count}</span>
                            </div>
                        </div>
                    )}

                    {/* Reading */}
                    {phase === 'reading' && (
                        <div className="flex items-center justify-between gap-3">
                            {/* Timer pill */}
                            <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-4 py-2">
                                <span className="w-2 h-2 bg-[#4b30fb] rounded-full animate-pulse" />
                                <span className="text-[#4b30fb] font-mono text-base font-bold">{fmt(elapsed)}</span>
                            </div>

                            {/* Mic indicator */}
                            <div className="relative w-12 h-12 shrink-0">
                                <div className="absolute inset-0 rounded-full bg-[#4b30fb]/25 animate-ping" />
                                <div className="w-12 h-12 rounded-full bg-[#4b30fb]/30 border-2 border-[#4b30fb] flex items-center justify-center">
                                    <Mic className="w-5 h-5 text-[#4b30fb]" />
                                </div>
                            </div>

                            {/* Stop */}
                            <button
                                onClick={stopRecording}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded-full font-semibold text-sm hover:bg-red-500/30 transition-all"
                            >
                                <Square className="w-3.5 h-3.5" /> Tugatish
                            </button>
                        </div>
                    )}

                    {/* Done */}
                    {phase === 'done' && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-3xl">{emoji}</span>
                                <div>
                                    <p className="text-white font-bold text-lg">O'qish natijasi</p>
                                    <p className="text-white/40 text-xs">{ertak.title}</p>
                                </div>
                            </div>

                            {/* Stats row */}
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
                                    <p className="text-xl font-black text-purple-400">{fmtTime}</p>
                                    <p className="text-white/40 text-[10px] mt-0.5">vaqt</p>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-white/10 rounded-xl p-2.5 text-center">
                                    <p className="text-xl font-black text-yellow-400">+{coinEarned}</p>
                                    <p className="text-white/40 text-[10px] mt-0.5">coin 🪙</p>
                                </div>
                            </div>

                            {/* Words progress bar */}
                            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-white/40 text-xs">O'qilgan so'zlar</span>
                                    <span className="text-white font-semibold text-xs">{wordsRead} / {totalWords}</span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                                        style={{ width: `${readPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={togglePlay}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium text-sm transition-all ${playing
                                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                                        : 'bg-white/8 border border-white/10 text-white hover:bg-white/15'
                                        }`}
                                >
                                    {playing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                    {playing ? "To'xtatish" : 'Eshitish'}
                                </button>
                                <button
                                    onClick={resetReading}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white/8 border border-white/10 text-white rounded-xl font-medium text-sm hover:bg-white/15 transition-all"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" /> Qayta o'qi
                                </button>
                            </div>

                            {hasAnyQuiz && !showQuiz && !showOlympiadQuizInternal && onStartOlympiadQuiz && (
                                <button
                                    onClick={() => {
                                        if (hasStoryQuestions) setShowQuiz(true);
                                        else if (hasOlympiadQuestions) setShowOlympiadQuizInternal(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-purple-500/20"
                                >
                                    🧠 Savollarni boshlash ({hasStoryQuestions ? storyQuestions.length : olympiadQuestions.length} ta savol)
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}

                            <button onClick={onClose} className="text-white/30 text-sm hover:text-white/60 transition-colors text-center">
                                Yopish
                            </button>
                        </div>
                    )}

                    {sttError && (
                        <div className="text-center mt-2 space-y-2">
                            <p className="text-red-400 text-xs">{sttError}</p>
                            <div className="flex justify-center gap-2">
                                <button
                                    onClick={() => {
                                        clearTimeout(autoQuizTimerRef.current);
                                        setPhase('done');
                                        if (hasAnyQuiz) {
                                            autoQuizTimerRef.current = setTimeout(() => {
                                                if (hasStoryQuestions) setShowQuiz(true);
                                                else if (hasOlympiadQuestions) setShowOlympiadQuizInternal(true);
                                            }, 2000);
                                        }
                                    }}
                                    className="px-3 py-2 text-xs bg-white/10 text-white rounded-xl hover:bg-white/15 transition"
                                >
                                    Ovozli tanlashni o'tkazib yuborish
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ─── Test Card (Global Olympiad Test) ──────────────────────────────────────────
function TestCard({ questionCount, onClick, globalQuizResult, onViewResult, isSeen }) {
    const isCompleted = !!globalQuizResult;

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            onClick={onClick}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden cursor-pointer transition-shadow group flex flex-col h-full relative"
        >
            {!isSeen && !isCompleted && (
                <div className="absolute top-2.5 left-2.5 z-20 bg-orange-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-lg animate-pulse border border-orange-400">
                    Yangi
                </div>
            )}

            <div className={`w-full aspect-[4/3] relative overflow-hidden flex items-center justify-center ${isCompleted ? 'bg-emerald-50/50' : 'bg-gradient-to-br from-[#fbbf24] to-[#f97316]'}`}>
                <div className={`text-5xl ${isCompleted ? 'opacity-30 contrast-75' : 'text-white'}`}>🧠</div>
            </div>
            <div className={`p-4 flex flex-col flex-1 ${isCompleted ? 'bg-white' : ''}`}>
                <h3 className="text-[#1a1a2e] font-bold text-base mb-1 leading-snug">Olimpiada testi</h3>
                <p className={`${isCompleted ? 'text-emerald-600' : 'text-[#4b30fb]'} text-xs mb-3`}>Test savollari orqali ball to'plang</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    <span>{questionCount} savol</span>
                </div>

                {isCompleted && globalQuizResult && (
                    <div className="grid grid-cols-3 gap-1.5 mb-4">
                        <div className="bg-emerald-50/50 rounded-lg p-1.5 text-center border border-emerald-100/30">
                            <p className="text-[10px] text-emerald-600/60 uppercase font-bold leading-none mb-1">Ball</p>
                            <p className="text-sm font-black text-emerald-600 leading-none">{globalQuizResult.quiz_score ?? 0}</p>
                        </div>
                        <div className="bg-blue-50/50 rounded-lg p-1.5 text-center border border-blue-100/30">
                            <p className="text-[10px] text-blue-600/60 uppercase font-bold leading-none mb-1">Vaqt</p>
                            <p className="text-sm font-black text-blue-600 leading-none">
                                {globalQuizResult.time_spent_seconds ? `${Math.floor(globalQuizResult.time_spent_seconds / 60)}:${String(globalQuizResult.time_spent_seconds % 60).padStart(2, '0')}` : '—'}
                            </p>
                        </div>
                        <div className="bg-amber-50/50 rounded-lg p-1.5 text-center border border-amber-100/30">
                            <p className="text-[10px] text-amber-600/60 uppercase font-bold leading-none mb-1">Coin</p>
                            <p className="text-sm font-black text-amber-600 leading-none">+{globalQuizResult.coins_earned ?? 0}</p>
                        </div>
                    </div>
                )}
                <div className="mt-auto grid grid-cols-1 gap-2">
                    {isCompleted && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onViewResult(); }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-medium text-sm hover:bg-emerald-100 transition-all border border-emerald-500/10"
                        >
                            <Trophy className="w-4 h-4 text-emerald-500" /> Natijani ko'rish
                        </button>
                    )}
                    <button className={`w-full flex items-center justify-center gap-2 py-3 ${isCompleted ? 'bg-gradient-to-r from-emerald-500/80 to-emerald-600/80 group-hover:scale-[1.02]' : 'bg-gradient-to-r from-[#f97316] to-[#ef4444] group-hover:scale-[1.02]'} text-white rounded-2xl font-semibold text-sm transition-transform shadow-md ${isCompleted ? 'shadow-emerald-500/20' : 'shadow-orange-500/30'}`}>
                        {isCompleted ? 'Qayta ishlash' : 'Testni boshlash'}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Card ──────────────────────────────────────────────────────────────────────
function ErtakCard({ ertak, index, onClick, onViewResult, olympiadQuestions = [] }) {
    const [imgError, setImgError] = useState(false);
    const hasImage = ertak.image_url && !imgError;
    const dayNames = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    const date = ertak.created_at ? new Date(ertak.created_at) : null;
    const dayLabel = date ? dayNames[date.getDay()] : '';
    const wordCount = ertak.content ? ertak.content.trim().split(/\s+/).length : 0;
    const storyQCount = (ertak.questions || []).length;
    const globalQCount = olympiadQuestions?.length || 0;
    const qCount = storyQCount || globalQCount;
    
    // MUHIM: student_result ni to'g'ri tekshirish
    const isCompleted = ertak.student_result && 
                        (ertak.student_result.total_points !== undefined || 
                         ertak.student_result.read_percent !== undefined ||
                         ertak.student_result.earned_coins !== undefined);

    const isSeen = isCompleted || ertak.isSeen; 

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            onClick={onClick}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden cursor-pointer transition-shadow group flex flex-col h-full relative"
        >
            {!isSeen && (
                <div className="absolute top-2.5 left-2.5 z-20 bg-rose-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-lg animate-pulse border border-rose-400">
                    Yangi
                </div>
            )}

            <div className={`w-full aspect-[4/3] relative overflow-hidden flex items-center justify-center ${isCompleted ? 'bg-indigo-50/50' : 'bg-gradient-to-br from-[#4b6ef5] to-[#9b59b6]'}`}>
                {hasImage ? (
                    <img
                        src={ertak.image_url}
                        alt={ertak.title}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isCompleted ? 'opacity-40 grayscale-[0.3]' : 'mix-blend-overlay'}`}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center group-hover:opacity-90 transition-opacity">
                        <BookOpen className={`w-14 h-14 ${isCompleted ? 'text-indigo-200' : 'text-white/40'}`} strokeWidth={1.5} />
                    </div>
                )}
                {qCount > 0 && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
                        🧠 {qCount} savol
                        {storyQCount === 0 && globalQCount > 0 && (
                            <span className="ml-1 text-[10px] opacity-80">(olympiad)</span>
                        )}
                    </div>
                )}
            </div>
            <div className={`p-4 flex flex-col flex-1 ${isCompleted ? 'bg-white' : 'bg-white'}`}>
                <h3 className="text-[#1a1a2e] font-bold text-base mb-1 line-clamp-2 leading-snug">{ertak.title}</h3>
                {ertak.content && (
                    <p className={`text-xs mb-3 line-clamp-2 flex items-center gap-1 ${isCompleted ? 'text-[#4b30fb]/70' : 'text-[#4b30fb]'}`}>
                        <span>📖</span> {ertak.content.slice(0, 60)}...
                    </p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    {dayLabel && <span>{dayLabel}</span>}
                    {dayLabel && wordCount > 0 && <span>•</span>}
                    {wordCount > 0 && <span>{wordCount} so'z</span>}
                </div>

                {isCompleted && ertak.student_result && (
                    <div className="grid grid-cols-4 gap-1 mb-4">
                        <div className="bg-emerald-50/50 rounded-lg p-1.5 text-center border border-emerald-100/30">
                            <p className="text-[9px] text-emerald-600/60 uppercase font-bold leading-none mb-1">Ball</p>
                            <p className="text-[13px] font-black text-emerald-600 leading-none">{ertak.student_result.total_points ?? 0}</p>
                        </div>
                        <div className="bg-blue-50/50 rounded-lg p-1.5 text-center border border-blue-100/30">
                            <p className="text-[9px] text-blue-600/60 uppercase font-bold leading-none mb-1">O'qish</p>
                            <p className="text-[13px] font-black text-blue-600 leading-none">{Math.round(ertak.student_result.read_percent ?? 0)}%</p>
                        </div>
                        <div className="bg-purple-50/50 rounded-lg p-1.5 text-center border border-purple-100/30">
                            <p className="text-[9px] text-purple-600/60 uppercase font-bold leading-none mb-1">Vaqt</p>
                            <p className="text-[13px] font-black text-purple-600 leading-none">
                                {ertak.student_result.reading_duration_seconds ? `${Math.floor(ertak.student_result.reading_duration_seconds / 60)}:${String(ertak.student_result.reading_duration_seconds % 60).padStart(2, '0')}` : '—'}
                            </p>
                        </div>
                        <div className="bg-amber-50/50 rounded-lg p-1.5 text-center border border-amber-100/30">
                            <p className="text-[9px] text-amber-600/60 uppercase font-bold leading-none mb-1">Coin</p>
                            <p className="text-[13px] font-black text-amber-600 leading-none">+{ertak.student_result.earned_coins ?? 0}</p>
                        </div>
                    </div>
                )}
                <div className="mt-auto grid grid-cols-1 gap-2">
                    {isCompleted && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onViewResult(); }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-[#4b30fb] rounded-xl font-medium text-sm hover:bg-indigo-100 transition-all border border-[#4b30fb]/10"
                        >
                            <Trophy className="w-4 h-4 text-[#4b30fb]" /> Natijani ko'rish
                        </button>
                    )}
                    <button className={`w-full flex items-center justify-center gap-2 py-3 ${isCompleted ? 'bg-gradient-to-r from-[#4b30fb]/80 to-[#764ba2]/80 group-hover:scale-[1.02]' : 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] group-hover:scale-[1.02]'} text-white rounded-2xl font-semibold text-sm transition-transform shadow-md ${isCompleted ? 'shadow-purple-500/20' : 'shadow-purple-500/30'}`}>
                        <Mic className="w-4 h-4" /> {isCompleted ? 'Qayta boshlash' : 'Boshlash'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function OlimpiadErtaklarPage() {
    const { olympiadId } = useParams();
    const [searchParams] = useSearchParams();
    const fromReading = searchParams.get('from') === 'reading';
    const [ertaklar, setErtaklar] = useState([]);
    const [olympiadQuestions, setOlympiadQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeErtak, setActiveErtak] = useState(null);
    const [showOlympiadQuiz, setShowOlympiadQuiz] = useState(false);
    const [globalQuizResult, setGlobalQuizResult] = useState(null);
    const [seenStories, setSeenStories] = useState(() => {
        try {
            const saved = localStorage.getItem(`seen_stories_${olympiadId}`);
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    useEffect(() => {
        if (seenStories.length > 0) {
            localStorage.setItem(`seen_stories_${olympiadId}`, JSON.stringify(seenStories));
        }
    }, [seenStories, olympiadId]);

    const markAsSeen = (id) => {
        if (!seenStories.includes(id)) {
            setSeenStories(prev => [...prev, id]);
        }
    };

    useEffect(() => { loadErtaklar(); }, [olympiadId]);

    const loadErtaklar = async () => {
        try {
            setLoading(true);
            const studentId = localStorage.getItem('userId');
            const url = studentId ? `/olympiad/${olympiadId}/content/stories?student_id=${studentId}` : `/olympiad/${olympiadId}/content/stories`;

            const [storiesRes, questionsRes] = await Promise.allSettled([
                apiService.get(url),
                apiService.get(`/olympiad/${olympiadId}/questions`),
            ]);

            if (storiesRes.status === 'fulfilled') {
                const data = storiesRes.value.data;
                const list = data?.ertaklar || data || [];
                setErtaklar(Array.isArray(list) ? list : []);
                setGlobalQuizResult(data?.global_quiz_result || null);
            }

            if (questionsRes.status === 'fulfilled') {
                setOlympiadQuestions(questionsRes.value.data?.questions || []);
            } else {
                setOlympiadQuestions([]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
            {/* Stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[
                    { top: '5%', left: '10%', sz: 'w-1 h-1', d: '0s', dur: '2s' },
                    { top: '15%', left: '30%', sz: 'w-1.5 h-1.5', d: '0.5s', dur: '3s' },
                    { top: '20%', left: '70%', sz: 'w-2 h-2', d: '1.5s', dur: '3.5s' },
                    { top: '50%', left: '85%', sz: 'w-1 h-1', d: '0.8s', dur: '2.8s' },
                    { top: '70%', left: '20%', sz: 'w-1.5 h-1.5', d: '1.2s', dur: '3.2s' },
                    { top: '85%', left: '55%', sz: 'w-2 h-2', d: '0.4s', dur: '2.4s' },
                ].map((s, i) => (
                    <div
                        key={i}
                        className={`absolute ${s.sz} bg-white rounded-full animate-pulse`}
                        style={{ top: s.top, left: s.left, animationDelay: s.d, animationDuration: s.dur }}
                    />
                ))}
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-white/5">
                <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-xl flex items-center justify-center">
                            <BookMarked className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-white">Ertaklar</h1>
                    </div>
                    <Link
                        to={fromReading ? `/olympiad/${olympiadId}/reading` : `/olympiad/${olympiadId}/content`}
                        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> {fromReading ? 'Olimpiada' : 'Kontentlar'}
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 py-10 text-center">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-bold text-white mb-3"
                >
                    ✨ Ertaklar
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-white/50 text-lg max-w-xl mx-auto"
                >
                    Kartochkani bosib o'qi — savollarga javob ber!
                </motion.p>
            </section>

            {/* Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-4 pb-20">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin mx-auto" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400 mb-4">❌ {error}</p>
                        <button
                            onClick={loadErtaklar}
                            className="px-6 py-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-lg"
                        >
                            Qayta urinish
                        </button>
                    </div>
                ) : (
                    (() => {
                        const hasAnyContent = ertaklar.length > 0 || olympiadQuestions.length > 0;
                        if (!hasAnyContent) {
                            return (
                                <div className="text-center py-20">
                                    <div className="text-5xl mb-4">📖</div>
                                    <p className="text-white/50 text-lg">Hozircha vazifalar yo'q</p>
                                </div>
                            );
                        }
                        return (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {olympiadQuestions.length > 0 && (
                                    <TestCard
                                        questionCount={olympiadQuestions.length}
                                        isSeen={seenStories.includes('global_test')}
                                        onClick={() => { 
                                            markAsSeen('global_test');
                                            setActiveErtak(null); 
                                            setShowOlympiadQuiz(true); 
                                        }}
                                        globalQuizResult={globalQuizResult}
                                        onViewResult={() => setViewingResult({ type: 'global', data: globalQuizResult })}
                                    />
                                )}
                                {ertaklar.map((ertak, i) => {
                                    const strId = String(ertak.id);
                                    return (
                                        <ErtakCard
                                            key={strId}
                                            ertak={{...ertak, isSeen: seenStories.includes(strId)}}
                                            index={i}
                                            onClick={() => {
                                                markAsSeen(strId);
                                                setActiveErtak(ertak);
                                            }}
                                            onViewResult={() => setViewingResult({ type: 'story', data: ertak.student_result, ertak })}
                                            olympiadQuestions={olympiadQuestions}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })()
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {activeErtak && (
                    <RecordingModal
                        ertak={activeErtak}
                        onClose={() => { setActiveErtak(null); loadErtaklar(); }}
                        onRefresh={loadErtaklar}
                        olympiadId={olympiadId}
                        olympiadQuestions={olympiadQuestions}
                        onStartOlympiadQuiz={() => { setActiveErtak(null); setShowOlympiadQuiz(true); }}
                    />
                )}

                {showOlympiadQuiz && (
                    <OlympiadQuizModal
                        questions={olympiadQuestions}
                        olympiadId={olympiadId}
                        onClose={() => { setShowOlympiadQuiz(false); loadErtaklar(); }}
                        onRefresh={loadErtaklar}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}