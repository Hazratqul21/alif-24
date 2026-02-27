import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookMarked, Mic, Play, Square, X, BookOpen, ChevronRight, Volume2 } from 'lucide-react';
import apiService from '../services/apiService';

let API_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';
if (API_URL.startsWith('http://') && window.location.protocol === 'https:') {
    API_URL = API_URL.replace('http://', 'https://');
}
// ─── Quiz Modal ────────────────────────────────────────────────────────────────
function QuizModal({ ertak, onClose }) {
    const questions = ertak.questions || [];
    const [qIndex, setQIndex] = useState(0);
    // phase per question: 'tts' | 'record' | 'result'
    const [phase, setPhase] = useState('tts');
    const [scores, setScores] = useState([]); // [{score, recognized, correct}]
    const [recording, setRecording] = useState(false);
    const [evaluating, setEvaluating] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [ttsPlaying, setTtsPlaying] = useState(false);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioRef = useRef(null);

    const currentQ = questions[qIndex];
    const totalScore = scores.length ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0;
    const allDone = qIndex >= questions.length;

    // Auto-play TTS for current question
    useEffect(() => {
        if (phase !== 'tts' || !currentQ) return;
        playQuestionTTS();
    }, [qIndex, phase]);

    const playQuestionTTS = async () => {
        try {
            setTtsPlaying(true);
            const res = await fetch(`${API_URL}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ text: currentQ.question, language: ertak.language || 'uz' }),
            });
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

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr;
            chunksRef.current = [];
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); };
            mr.start();
            setRecording(true);
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        } catch {
            alert('Mikrofonga ruxsat bering!');
        }
    };

    const stopAndEvaluate = async () => {
        clearInterval(timerRef.current);
        setRecording(false);
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setEvaluating(true);

        // Wait for chunks to be populated
        await new Promise(r => setTimeout(r, 300));

        try {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', blob, 'answer.webm');

            const res = await fetch(
                `${API_URL}/ertaklar/${ertak.id}/quiz/evaluate?question_index=${qIndex}`,
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
            setScores(prev => [...prev, { score: 0, recognized: '', correct: currentQ.answer, passed: false }]);
        } finally {
            setEvaluating(false);
            setPhase('result');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
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

                {/* Progress bar */}
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
                                className="h-full bg-gradient-to-r from-[#4b30fb] to-[#764ba2] rounded-full transition-all"
                                style={{ width: `${((qIndex) / questions.length) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* All done — final score */}
                {allDone ? (
                    <div className="flex flex-col items-center gap-5">
                        <div className="text-5xl">{totalScore >= 80 ? '🏆' : totalScore >= 50 ? '⭐' : '💪'}</div>
                        <div className="text-center">
                            <p className="text-white font-bold text-2xl">Natijangiz</p>
                            <p className={`text-5xl font-black mt-2 ${scoreColor(totalScore)}`}>{totalScore}</p>
                            <p className="text-white/40 text-sm mt-1">100 ball dan</p>
                        </div>
                        <div className="w-full space-y-2 max-h-48 overflow-y-auto">
                            {scores.map((s, i) => (
                                <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5">
                                    <span className="text-white/60 text-xs">{i + 1}-savol</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${scoreBg(s.score)}`} style={{ width: `${s.score}%` }} />
                                        </div>
                                        <span className={`text-xs font-bold ${scoreColor(s.score)}`}>{s.score}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={onClose}
                            className="w-full py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-semibold hover:scale-[1.02] transition-transform">
                            Yopish
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Question text */}
                        <div className="bg-white/5 rounded-2xl p-5 mb-6">
                            <p className="text-white/40 text-xs mb-2 uppercase tracking-wide">{qIndex + 1}-savol</p>
                            <p className="text-white text-lg font-semibold leading-relaxed">{currentQ?.question}</p>
                        </div>

                        {/* TTS playing */}
                        {phase === 'tts' && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-[#4b30fb]/20 border-2 border-[#4b30fb]/60 flex items-center justify-center">
                                    <Volume2 className="w-7 h-7 text-[#4b30fb] animate-pulse" />
                                </div>
                                <p className="text-white/50 text-sm">Savol o'qilmoqda...</p>
                                <button onClick={() => { audioRef.current?.pause(); setPhase('record'); }}
                                    className="text-white/30 text-xs hover:text-white/60 underline">
                                    O'tkazib yuborish
                                </button>
                            </div>
                        )}

                        {/* Record */}
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
                                        <div className="w-16 h-16 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin" />
                                        <p className="text-white/50 text-sm">Baholanmoqda...</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-white/60 text-sm text-center">Mikrofonni bosib javob bering</p>
                                        <button onClick={startRecording}
                                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-bold text-base hover:scale-105 transition-transform shadow-lg shadow-purple-500/30">
                                            <Mic className="w-5 h-5" /> Javob berish
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Result for this question */}
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
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-medium hover:scale-105 transition-transform">
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
function RecordingModal({ ertak, onClose }) {
    const [phase, setPhase] = useState('countdown');
    const [count, setCount] = useState(3);
    const [elapsed, setElapsed] = useState(0);
    const [recordedUrl, setRecordedUrl] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const playbackRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (phase !== 'countdown') return;
        if (count <= 0) { setPhase('reading'); return; }
        const t = setTimeout(() => setCount(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, count]);

    useEffect(() => {
        if (phase !== 'reading') return;
        let stream;
        (async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mr = new MediaRecorder(stream);
                mediaRecorderRef.current = mr;
                chunksRef.current = [];
                mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
                mr.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    setRecordedUrl(URL.createObjectURL(blob));
                    stream.getTracks().forEach(t => t.stop());
                    setPhase('done');
                };
                mr.start();
            } catch {
                alert('Mikrofonga ruxsat bering!');
                onClose();
            }
        })();
        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => clearInterval(timerRef.current);
    }, [phase]);

    const stopRecording = () => {
        clearInterval(timerRef.current);
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    };

    const togglePlay = () => {
        if (playing) { playbackRef.current?.pause(); setPlaying(false); }
        else {
            const a = new Audio(recordedUrl);
            playbackRef.current = a;
            a.onended = () => setPlaying(false);
            a.play(); setPlaying(true);
        }
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const hasQuestions = (ertak.questions || []).length > 0;

    if (showQuiz) {
        return <QuizModal ertak={ertak} onClose={onClose} />;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
                <h2 className="text-white font-bold text-xl mb-1 pr-6">{ertak.title}</h2>
                <p className="text-white/40 text-sm mb-6">Matnni quyida o'zing o'qi 🎤</p>

                <div className="bg-white/5 rounded-xl p-4 mb-6 max-h-40 overflow-y-auto">
                    <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{ertak.content}</p>
                </div>

                {phase === 'countdown' && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-white/60 text-sm">Tayyor bo'l, yozish boshlanmoqda...</p>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4b30fb] to-[#764ba2] flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <span className="text-white text-5xl font-black">{count}</span>
                        </div>
                    </div>
                )}

                {phase === 'reading' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                            <div className="w-20 h-20 rounded-full bg-red-500/30 border-2 border-red-500 flex items-center justify-center">
                                <Mic className="w-8 h-8 text-red-400" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-400 font-mono text-lg font-bold">{fmt(elapsed)}</span>
                            <span className="text-white/40 text-sm">Yozilmoqda</span>
                        </div>
                        <button onClick={stopRecording}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-2xl font-medium hover:bg-red-500/30 transition-all">
                            <Square className="w-4 h-4" /> Tugatish
                        </button>
                    </div>
                )}

                {phase === 'done' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                            <span className="text-3xl">🌟</span>
                        </div>
                        <div className="text-center">
                            <p className="text-white font-bold text-lg">Barakalla!</p>
                            <p className="text-white/50 text-sm">Juda yaxshi o'qiding!</p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button onClick={togglePlay}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-medium transition-all ${playing
                                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                                    : 'bg-white/10 text-white hover:bg-white/20'}`}>
                                {playing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                {playing ? "To'xtatish" : "Eshitish"}
                            </button>
                            <button onClick={() => { setPhase('countdown'); setCount(3); setElapsed(0); setRecordedUrl(null); setPlaying(false); }}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 text-white rounded-2xl font-medium hover:bg-white/20 transition-all">
                                <Mic className="w-4 h-4" /> Qayta o'qi
                            </button>
                        </div>
                        {hasQuestions && (
                            <button onClick={() => setShowQuiz(true)}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-purple-500/20 mt-1">
                                🧠 Savollarni boshlash
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={onClose} className="text-white/40 text-sm hover:text-white/70 transition-colors">
                            Yopish
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

// ─── Card ──────────────────────────────────────────────────────────────────────
function ErtakCard({ ertak, index, onClick }) {
    const [imgError, setImgError] = useState(false);
    const hasImage = ertak.cover_image && !imgError;
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
            className="bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden cursor-pointer transition-shadow group"
        >
            <div className="w-full aspect-[4/3] relative overflow-hidden">
                {hasImage ? (
                    <img src={ertak.cover_image} alt={ertak.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => setImgError(true)} />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#4b6ef5] to-[#9b59b6] flex items-center justify-center group-hover:opacity-90 transition-opacity">
                        <BookOpen className="w-14 h-14 text-white/40" strokeWidth={1.5} />
                    </div>
                )}
                {qCount > 0 && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                        🧠 {qCount} savol
                    </div>
                )}
            </div>
            <div className="p-4">
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
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-semibold text-sm hover:scale-[1.02] transition-transform shadow-md shadow-purple-500/30">
                    <Mic className="w-4 h-4" /> O'qishni boshlash
                </button>
            </div>
        </motion.div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ErtaklarPage() {
    const [ertaklar, setErtaklar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeErtak, setActiveErtak] = useState(null);

    useEffect(() => { loadErtaklar(); }, []);

    const loadErtaklar = async () => {
        try {
            setLoading(true);
            const data = await apiService.get('/ertaklar');
            const list = data.data?.ertaklar || data.data || data || [];
            setErtaklar(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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
                        <div>
                            <h1 className="text-xl font-bold text-white">Ertaklar</h1>
                            <p className="text-xs text-white/50">lessions.alif24.uz • Ertaklar</p>
                        </div>
                    </div>
                    <Link to="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> Darsliklar
                    </Link>
                </div>
            </header>

            <section className="relative z-10 max-w-6xl mx-auto px-4 py-10 text-center">
                <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-bold text-white mb-3">
                    ✨ Ertaklar
                </motion.h2>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="text-white/50 text-lg max-w-xl mx-auto">
                    Kartochkani bosib o'qi — savollarga javob ber!
                </motion.p>
            </section>

            <div className="relative z-10 max-w-6xl mx-auto px-4 pb-20">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin mx-auto" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400 mb-4">❌ {error}</p>
                        <button onClick={loadErtaklar} className="px-6 py-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-lg">
                            Qayta urinish
                        </button>
                    </div>
                ) : ertaklar.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">📖</div>
                        <p className="text-white/50 text-lg">Hozircha ertaklar yo'q</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {ertaklar.map((ertak, i) => (
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
