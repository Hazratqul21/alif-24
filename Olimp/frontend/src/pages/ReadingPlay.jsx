import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import readingService from '../services/readingService';
import VoiceRecorder from '../components/VoiceRecorder';

// Phases: loading -> preview -> countdown -> reading -> voice_record -> questions -> result
const PHASE = {
    LOADING: 'loading',
    PREVIEW: 'preview',
    COUNTDOWN: 'countdown',
    READING: 'reading',
    VOICE_RECORD: 'voice_record',
    QUESTIONS: 'questions',
    RESULT: 'result',
};

export default function ReadingPlay() {
    const { compId, taskId } = useParams();
    const navigate = useNavigate();

    const [phase, setPhase] = useState(PHASE.LOADING);
    const [task, setTask] = useState(null);
    const [error, setError] = useState('');

    // Countdown
    const [countdown, setCountdown] = useState(3);
    const countdownRef = useRef(null);

    // Reading
    const [timer, setTimer] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const timerRef = useRef(null);
    const recognitionRef = useRef(null);
    const startTimeRef = useRef(null);

    // Questions
    const [answers, setAnswers] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);

    // Result
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Voice recording mode
    const [sessionId, setSessionId] = useState(null);
    const [recordingMode, setRecordingMode] = useState(false);

    // TTS
    const [isPlayingTTS, setIsPlayingTTS] = useState(false);
    const audioRef = useRef(null);

    // ============ LOAD TASK ============
    useEffect(() => {
        loadTask();
        return () => {
            stopCountdown();
            stopTimer();
            stopSTT();
        };
    }, []);

    const loadTask = async () => {
        try {
            const data = await readingService.getTask(compId, taskId);
            setTask(data.task);

            if (data.session?.status === 'completed') {
                setError("Bu hikoyani allaqachon o'qib bo'lgansiz");
                return;
            }

            setPhase(PHASE.PREVIEW);
        } catch (err) {
            setError(err.message || 'Xatolik');
        }
    };

    // ============ COUNTDOWN ============
    const startCountdown = async (useVoiceRecording = false) => {
        // Start session on backend
        try {
            const response = await readingService.startReading(compId, taskId);
            if (useVoiceRecording) {
                setSessionId(response.session_id);
                setRecordingMode(true);
            }
        } catch (err) {
            setError(err.message);
            return;
        }

        setPhase(PHASE.COUNTDOWN);
        setCountdown(3);

        let count = 3;
        countdownRef.current = setInterval(() => {
            count--;
            setCountdown(count);
            if (count === 0) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
                // If voice recording mode, go to voice record phase
                if (recordingMode) {
                    setPhase(PHASE.VOICE_RECORD);
                } else {
                    startReading();
                }
            }
        }, 1000);
    };

    // ============ VOICE RECORDING ============
    const handleVoiceRecordingComplete = async (audioBlob, duration) => {
        if (!sessionId) {
            setError("Sessiya topilmadi");
            return;
        }

        try {
            setSubmitting(true);

            // Upload audio
            await readingService.uploadAudio(sessionId, audioBlob);

            // Analyze audio (STT + scoring)
            const analysis = await readingService.analyzeAudio(sessionId);

            if (analysis.success) {
                // Set the analysis result and go to result phase
                setResult(analysis.analysis);

                // If there are questions, go to questions phase
                if (task?.questions?.length > 0) {
                    setAnswers(new Array(task.questions.length).fill(-1));
                    setCurrentQ(0);
                    setPhase(PHASE.QUESTIONS);
                    speakQuestion(task.questions[0].question);
                } else {
                    setPhase(PHASE.RESULT);
                }
            } else {
                setError(analysis.error || "Tahlil qilishda xatolik");
            }
        } catch (err) {
            setError(err.message || 'Xatolik yuz berdi');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVoiceError = (errorMsg) => {
        setError(errorMsg);
    };

    // ============ READING + STT ============
    const startReading = () => {
        setPhase(PHASE.READING);
        startTimeRef.current = Date.now();

        // Timer
        timerRef.current = setInterval(() => {
            setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 100);

        // STT
        startSTT();
    };

    const startSTT = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Brauzeringiz Speech Recognition ni qo'llab-quvvatlamaydi. Chrome ishlatib ko'ring.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = task?.language === 'ru' ? 'ru-RU' : task?.language === 'en' ? 'en-US' : 'uz-UZ';

        let finalTranscript = '';

        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += t + ' ';
                } else {
                    interim = t;
                }
            }
            setTranscript(finalTranscript + interim);
        };

        recognition.onerror = (event) => {
            console.warn('STT error:', event.error);
            if (event.error === 'no-speech' || event.error === 'audio-capture') {
                // Restart
                setTimeout(() => {
                    if (phase === PHASE.READING && recognitionRef.current) {
                        try { recognitionRef.current.start(); } catch { }
                    }
                }, 500);
            }
        };

        recognition.onend = () => {
            // Auto-restart if still in reading phase
            if (recognitionRef.current && startTimeRef.current) {
                try { recognition.start(); } catch { }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    };

    const stopSTT = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
                recognitionRef.current.onend = null;
            } catch { }
            recognitionRef.current = null;
        }
        setIsListening(false);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const stopCountdown = () => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    };

    const stopReading = () => {
        stopTimer();
        stopSTT();
        const readingTime = (Date.now() - startTimeRef.current) / 1000;
        setTimer(Math.floor(readingTime));
        startTimeRef.current = null;

        // Go to questions (if any) or submit
        if (task?.questions?.length > 0) {
            setAnswers(new Array(task.questions.length).fill(-1));
            setCurrentQ(0);
            setPhase(PHASE.QUESTIONS);

            // TTS for first question
            speakQuestion(task.questions[0].question);
        } else {
            submitResult(readingTime, transcript, []);
        }
    };

    // ============ TTS (browser) ============
    const speakQuestion = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = task?.language === 'ru' ? 'ru-RU' : task?.language === 'en' ? 'en-US' : 'uz-UZ';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    };

    // ============ QUESTIONS ============
    const selectAnswer = (qIdx, aIdx) => {
        const newAnswers = [...answers];
        newAnswers[qIdx] = aIdx;
        setAnswers(newAnswers);
    };

    const nextQuestion = () => {
        if (currentQ < task.questions.length - 1) {
            const next = currentQ + 1;
            setCurrentQ(next);
            speakQuestion(task.questions[next].question);
        } else {
            // All questions answered — submit
            const readingTime = timer;
            submitResult(readingTime, transcript, answers);
        }
    };

    // ============ SUBMIT ============
    const submitResult = async (readingTime, sttText, questionAnswers) => {
        try {
            setSubmitting(true);
            const data = await readingService.submitReading(compId, taskId, {
                stt_transcript: sttText || '',
                reading_time_seconds: readingTime || timer,
                question_answers: questionAnswers.length > 0 ? questionAnswers : null,
            });
            setResult(data.result);
            setPhase(PHASE.RESULT);
        } catch (err) {
            setError(err.message || 'Natijani yuborishda xatolik');
        } finally {
            setSubmitting(false);
        }
    };

    // ============ FORMAT HELPERS ============
    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // ============ TTS - Hikoyani eshittirish ============
    const playTTS = async () => {
        if (isPlayingTTS) {
            // Stop playing
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            setIsPlayingTTS(false);
            return;
        }

        try {
            setIsPlayingTTS(true);
            const ttsUrl = readingService.getTaskTTSUrl(compId, taskId);

            // Fetch audio
            const response = await fetch(ttsUrl, { credentials: 'include' });
            if (!response.ok) {
                throw new Error('TTS xatoligi');
            }

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);

            // Play audio
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                setIsPlayingTTS(false);
                URL.revokeObjectURL(audioUrl);
            };

            audio.onerror = () => {
                setIsPlayingTTS(false);
                setError('Audio playback error');
            };

            await audio.play();

        } catch (err) {
            console.error('TTS error:', err);
            setIsPlayingTTS(false);
            setError('TTS xatoligi: ' + err.message);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-400';
        if (score >= 50) return 'text-amber-400';
        return 'text-red-400';
    };

    // ============ RENDER ============

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <p className="text-red-400 mb-4">{error}</p>
                    <button onClick={() => navigate(`/reading/${compId}`)} className="px-6 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700">
                        Orqaga
                    </button>
                </div>
            </div>
        );
    }

    // LOADING
    if (phase === PHASE.LOADING) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    // PREVIEW — task intro (mavzu + rasm)
    if (phase === PHASE.PREVIEW) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
                <div className="max-w-lg w-full text-center">
                    {task?.image_url && (
                        <img src={task.image_url} alt="" className="w-full max-h-64 object-cover rounded-2xl mb-6 shadow-xl" />
                    )}
                    <h1 className="text-white text-2xl font-bold mb-2">{task?.title}</h1>

                    {/* Play TTS button */}
                    <button
                        onClick={playTTS}
                        disabled={isPlayingTTS}
                        className={`mb-4 px-6 py-2 rounded-xl font-bold transition-all ${
                            isPlayingTTS
                                ? 'bg-amber-500 text-white animate-pulse'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {isPlayingTTS ? '⏸ To\'xtatish' : '🔊 Hikoyani eshittirish'}
                    </button>

                    <div className="flex items-center justify-center gap-4 text-gray-500 text-sm mb-8">
                        <span>📝 {task?.total_words} so'z</span>
                        <span>❓ {task?.questions?.length || 0} savol</span>
                        {task?.time_limit_seconds && <span>⏱ {task.time_limit_seconds}s</span>}
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-4 mb-6 text-left">
                        <h3 className="text-gray-400 text-sm font-medium mb-2">Qoidalar:</h3>
                        <ul className="text-gray-500 text-sm space-y-1">
                            <li>🎤 Mikrofon yoqiladi — ovoz chiqarib o'qing</li>
                            <li>⏱ Vaqt hisoblanadi — tez va aniq o'qing</li>
                            <li>📖 Matn to'liq ko'rinadi — oxirigacha o'qing</li>
                            <li>🛑 O'qib bo'lgach STOP tugmasini bosing</li>
                            <li>❓ Keyin savollarqa javob bering</li>
                        </ul>
                    </div>

                    <button onClick={() => startCountdown(false)}
                        className="w-full py-4 bg-emerald-600 text-white text-lg font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                        🎤 O'qishni Boshlash
                    </button>

                    <button onClick={() => startCountdown(true)}
                        className="w-full mt-3 py-3 bg-red-600/80 text-white font-bold rounded-xl hover:bg-red-600 transition-all">
                        🎙 Ovoz yozib o'qish
                    </button>

                    <button onClick={() => navigate(-1)} className="mt-3 text-gray-600 text-sm hover:text-gray-400">
                        ← Orqaga
                    </button>
                </div>
            </div>
        );
    }

    // COUNTDOWN — 3, 2, 1
    if (phase === PHASE.COUNTDOWN) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-8xl font-black text-emerald-400 animate-pulse mb-4">
                        {countdown}
                    </div>
                    <p className="text-gray-400 text-lg">{countdown === 1 ? "O'qishni boshlang!" : "Tayyor bo'ling..."}</p>
                </div>
            </div>
        );
    }

    // READING — matn + timer + STT
    if (phase === PHASE.READING) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col">
                {/* Top bar */}
                <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
                        <span className="text-gray-400 text-sm">{isListening ? "Tinglayapman..." : "Mikrofon o'chiq"}</span>
                    </div>
                    <div className="text-white font-mono text-2xl font-bold tabular-nums">
                        ⏱ {formatTime(timer)}
                    </div>
                </div>

                {/* Story text */}
                <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
                    <div className="text-white text-lg leading-relaxed whitespace-pre-wrap font-serif">
                        {task?.story_text}
                    </div>
                </div>

                {/* STT live transcript */}
                {transcript && (
                    <div className="bg-gray-900/80 border-t border-gray-800 px-4 py-3 max-h-24 overflow-y-auto">
                        <p className="text-xs text-gray-500 mb-1">Siz o'qiyapsiz:</p>
                        <p className="text-emerald-400/70 text-sm">{transcript.slice(-200)}</p>
                    </div>
                )}

                {/* STOP button */}
                <div className="p-4 bg-gray-950 border-t border-gray-800">
                    <button onClick={stopReading}
                        className="w-full py-4 bg-red-600 text-white text-lg font-bold rounded-2xl hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-500/20">
                        🛑 STOP — O'qishni tugatish
                    </button>
                </div>
            </div>
        );
    }

    // VOICE RECORD — ovoz yozib olish
    if (phase === PHASE.VOICE_RECORD) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col">
                {/* Top bar */}
                <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
                    <div className="text-white font-mono text-2xl font-bold text-center">
                        🎤 Ovoz yozib oling
                    </div>
                </div>

                {/* Story text */}
                <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
                    <div className="text-white text-lg leading-relaxed whitespace-pre-wrap font-serif">
                        {task?.story_text}
                    </div>
                </div>

                {/* Voice recorder */}
                <div className="p-4 bg-gray-950 border-t border-gray-800">
                    <VoiceRecorder
                        onRecordingComplete={handleVoiceRecordingComplete}
                        onError={handleVoiceError}
                        disabled={submitting}
                        className="w-full"
                    />
                    {submitting && (
                        <div className="mt-4 text-center text-gray-400">
                            ⏳ Yuklanmoqda, kuting...
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // QUESTIONS
    if (phase === PHASE.QUESTIONS && task?.questions) {
        const q = task.questions[currentQ];
        if (!q) return null;

        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
                <div className="max-w-lg w-full">
                    {/* Progress */}
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-gray-500 text-sm">Savol {currentQ + 1} / {task.questions.length}</span>
                        <div className="flex gap-1">
                            {task.questions.map((_, i) => (
                                <div key={i} className={`w-8 h-1.5 rounded-full ${i === currentQ ? 'bg-emerald-500' : i < currentQ ? 'bg-emerald-500/30' : 'bg-gray-800'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Question */}
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-4">
                        <h2 className="text-white text-xl font-semibold mb-6">{q.question}</h2>
                        <div className="space-y-3">
                            {q.options?.map((opt, j) => (
                                <button key={j} onClick={() => selectAnswer(currentQ, j)}
                                    className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                                        answers[currentQ] === j
                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                            : 'border-gray-800 bg-gray-800/50 text-gray-300 hover:border-gray-600'
                                    }`}>
                                    <span className={`inline-flex w-7 h-7 rounded-lg items-center justify-center text-sm font-bold mr-3 ${
                                        answers[currentQ] === j ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'
                                    }`}>{String.fromCharCode(65 + j)}</span>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Next / Submit */}
                    <button onClick={nextQuestion}
                        disabled={answers[currentQ] === -1 || submitting}
                        className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        {submitting ? "Yuklanmoqda..." : currentQ < task.questions.length - 1 ? "Keyingi savol →" : "✅ Natijani ko'rish"}
                    </button>
                </div>
            </div>
        );
    }

    // RESULT
    if (phase === PHASE.RESULT && result) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
                <div className="max-w-lg w-full">
                    <div className="text-center mb-6">
                        <div className="text-5xl mb-3">
                            {result.total_score >= 80 ? '🎉' : result.total_score >= 50 ? '👍' : '💪'}
                        </div>
                        <h1 className="text-white text-2xl font-bold">Natijangiz</h1>
                    </div>

                    {/* Total Score */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-amber-500/10 border border-emerald-500/20 rounded-2xl p-6 mb-4 text-center">
                        <div className={`text-5xl font-black ${getScoreColor(result.total_score)}`}>
                            {result.total_score?.toFixed(0)}
                        </div>
                        <p className="text-gray-500 text-sm mt-1">umumiy ball</p>
                    </div>

                    {/* Detail scores */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
                            <div className="text-2xl mb-1">📖</div>
                            <div className={`text-xl font-bold ${getScoreColor(result.score_completion)}`}>{result.completion_percentage?.toFixed(0)}%</div>
                            <div className="text-gray-500 text-xs mt-1">Matn to'liqligi</div>
                            <div className="text-gray-600 text-xs">{result.score_completion?.toFixed(0)} ball</div>
                        </div>
                        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
                            <div className="text-2xl mb-1">📝</div>
                            <div className={`text-xl font-bold ${getScoreColor(result.score_words)}`}>{result.words_read}</div>
                            <div className="text-gray-500 text-xs mt-1">so'z / {result.total_words}</div>
                            <div className="text-gray-600 text-xs">{result.score_words?.toFixed(0)} ball</div>
                        </div>
                        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
                            <div className="text-2xl mb-1">⏱</div>
                            <div className={`text-xl font-bold ${getScoreColor(result.score_time)}`}>{formatTime(Math.floor(result.reading_time_seconds))}</div>
                            <div className="text-gray-500 text-xs mt-1">vaqt</div>
                            <div className="text-gray-600 text-xs">{result.score_time?.toFixed(0)} ball</div>
                        </div>
                        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
                            <div className="text-2xl mb-1">❓</div>
                            <div className={`text-xl font-bold ${getScoreColor(result.score_questions)}`}>{result.questions_correct}/{result.questions_total}</div>
                            <div className="text-gray-500 text-xs mt-1">savollar</div>
                            <div className="text-gray-600 text-xs">{result.score_questions?.toFixed(0)} ball</div>
                        </div>
                    </div>

                    <button onClick={() => navigate(-1)}
                        className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all">
                        ← Vazifalar ro'yxatiga qaytish
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
