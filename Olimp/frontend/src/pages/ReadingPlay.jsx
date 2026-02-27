import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Square, X, ChevronRight, Volume2 } from 'lucide-react';
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import readingService from '../services/readingService';

const API_URL = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';

// Phases map the Ertaklar logic: tts -> record -> analysis (evaluating) -> questions (optional) -> result
const PHASE = {
    LOADING: 'loading',
    INTRO: 'intro', // Intro screen
    TTS: 'tts',     // Auto-playing task text
    RECORD: 'record',
    EVALUATING: 'evaluating', // uploading/analyzing
    QUESTIONS: 'questions',
    RESULT: 'result',
};

export default function ReadingPlay() {
    const { compId, taskId } = useParams();
    const navigate = useNavigate();

    const [phase, setPhase] = useState(PHASE.LOADING);
    const [task, setTask] = useState(null);
    const [error, setError] = useState('');

    // STT & TTS 
    const [transcript, setTranscript] = useState('');
    const [recording, setRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [sttError, setSttError] = useState('');

    // Auth Token for Azure
    const speechConfigRef = useRef(null);
    const recognizerRef = useRef(null);
    const transcriptRef = useRef('');
    const timerRef = useRef(null);
    const audioRef = useRef(null);
    const questionAudioRef = useRef(null); // For questions TTS
    const startTimeRef = useRef(null);

    // Results & Questions
    const [result, setResult] = useState(null);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState([]);

    // ============ LOAD TASK ============
    useEffect(() => {
        loadTask();
        return () => {
            // Cleanup everything on unmount
            clearInterval(timerRef.current);
            if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
            if (questionAudioRef.current) { questionAudioRef.current.pause(); questionAudioRef.current = null; }
            if (recognizerRef.current) {
                try { recognizerRef.current.stopContinuousRecognitionAsync(); recognizerRef.current.close(); } catch (_) { }
            }
        };
    }, [compId, taskId]);

    const loadTask = async () => {
        try {
            const data = await readingService.getTask(compId, taskId);
            setTask(data.task);

            if (data.session?.status === 'completed') {
                setError("Bu hikoyani allaqachon o'qib bo'lgansiz");
                return;
            }
            setPhase(PHASE.INTRO);
        } catch (err) {
            setError(err.message || 'Xatolik yukladi');
        }
    };

    // ============ AZURE CONFIG ============
    const ensureSpeechConfig = async () => {
        if (speechConfigRef.current) return true;
        try {
            const baseUrl = API_URL.startsWith('http') ? API_URL : window.location.origin + API_URL;
            const resp = await fetch(`${baseUrl}/smartkids/speech-token`);
            if (!resp.ok) throw new Error(`speech-token failed`);
            const data = await resp.json();
            const cfg = SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
            cfg.speechRecognitionLanguage = task?.language === 'ru' ? 'ru-RU' : task?.language === 'en' ? 'en-US' : 'uz-UZ';
            speechConfigRef.current = cfg;
            return true;
        } catch (e) {
            console.error('Speech config init failed:', e);
            setSttError("Ovozli tanishga ulanib bo'lmadi.");
            return false;
        }
    };

    // ============ AZURE AZURE STT LOGIC ============
    const startRecording = async () => {
        setSttError('');
        transcriptRef.current = '';
        setTranscript('');

        const ok = await ensureSpeechConfig();
        if (!ok) return;

        try {
            setRecording(true);
            setElapsed(0);
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfigRef.current, audioConfig);
            recognizerRef.current = recognizer;

            recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    transcriptRef.current += (e.result.text + " ");
                    setTranscript(transcriptRef.current);
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
        const finalReadingTime = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : elapsed;

        setRecording(false);
        setPhase(PHASE.EVALUATING);

        const sendResult = async (text) => {
            try {
                if (task?.questions?.length > 0) {
                    // Navigate to Questions phase first
                    setAnswers(new Array(task.questions.length).fill(-1));
                    setCurrentQ(0);
                    setPhase(PHASE.QUESTIONS);
                    // Also pass final params conceptually for submitResult later, or hold in state:
                    setElapsed(finalReadingTime);
                    setTranscript(text);
                    speakQuestion(task.questions[0].question);
                } else {
                    // No questions, submit directly
                    await submitFinalResult(finalReadingTime, text, []);
                }
            } catch (err) {
                setError("Xatolik: Natija jarayoni " + err.message);
            }
        };

        if (recognizerRef.current) {
            const rec = recognizerRef.current;
            recognizerRef.current = null;
            rec.stopContinuousRecognitionAsync(() => {
                try { rec.close(); } catch (_) { }
                sendResult(transcriptRef.current.trim());
            });
        } else {
            sendResult(transcriptRef.current.trim());
        }
    };

    const submitFinalResult = async (readingTime, sttText, questionAnswers) => {
        try {
            setPhase(PHASE.EVALUATING);
            const data = await readingService.submitReading(compId, taskId, {
                stt_transcript: sttText || '',
                reading_time_seconds: readingTime || 0,
                question_answers: questionAnswers.length > 0 ? questionAnswers : null,
            });
            setResult(data.result);
            setPhase(PHASE.RESULT);
        } catch (err) {
            setError(err.message || 'Natijani yuborishda xatolik');
        }
    };

    // ============ QUESTIONS LOGIC ============
    const speakQuestion = async (text) => {
        if (!text) return;
        if (questionAudioRef.current) {
            questionAudioRef.current.pause();
            questionAudioRef.current = null;
        }

        try {
            const lang = task?.language || 'uz';
            const gender = 'female';
            const baseUrl = API_URL.startsWith('http') ? API_URL : window.location.origin + API_URL;

            const response = await fetch(
                `${baseUrl}/speech/tts?text=${encodeURIComponent(text)}&language=${lang}&gender=${gender}`,
                { credentials: 'include' }
            );

            if (!response.ok) return;

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            questionAudioRef.current = audio;
            audio.onended = () => URL.revokeObjectURL(audioUrl);
            await audio.play();
        } catch (err) {
            console.warn('[TTS] Xato:', err.message);
        }
    };

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
            submitFinalResult(elapsed, transcript, answers);
        }
    };


    // ============ ACTIONS ============
    const startPlayTTS = async () => {
        setPhase(PHASE.TTS);
        try {
            const ttsUrl = readingService.getTaskTTSUrl(compId, taskId);
            const response = await fetch(ttsUrl, { credentials: 'include' });
            if (!response.ok) throw new Error('TTS xato');

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                setPhase(PHASE.RECORD);
            };
            audio.onerror = () => {
                setPhase(PHASE.RECORD);
            };
            await audio.play();
        } catch (err) {
            console.error('TTS Err:', err);
            // Ignore error, directly move to record phase
            setPhase(PHASE.RECORD);
        }
    };

    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const scoreColor = (s) => s >= 80 ? 'text-emerald-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';

    // ============ RENDERS ============
    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
                <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <p className="text-red-400 mb-4">{error}</p>
                    <button onClick={() => navigate(-1)} className="px-6 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700">
                        Orqaga
                    </button>
                </div>
            </div>
        );
    }

    if (phase === PHASE.LOADING) return <div className="min-h-screen bg-gray-950 flex justify-center items-center"><div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-gradient-to-br from-gray-900 to-gray-950 border border-white/5 rounded-3xl p-7 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                {phase !== PHASE.RESULT && (
                    <button onClick={() => navigate(-1)} className="absolute top-4 right-4 text-white/40 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                )}

                {/* 1. INTRO / PREVIEW */}
                {phase === PHASE.INTRO && (
                    <div className="text-center pt-4">
                        {task?.image_url && <img src={task.image_url} alt="" className="w-full h-48 object-cover rounded-xl mb-6 shadow-md" />}
                        <h1 className="text-white text-2xl font-bold mb-4">{task?.title}</h1>
                        <div className="flex justify-center gap-4 text-gray-500 text-sm mb-6">
                            <span>📝 {task?.total_words} so'z</span>
                            <span>❓ {task?.questions?.length || 0} savol</span>
                            {task?.time_limit_seconds && <span>⏱ {task.time_limit_seconds}s</span>}
                        </div>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm">
                            Avval matn (hikoya) xuddi ertak kabi AI tomonidan o'qib beriladi. So'ngra mikrofon yordamida o'zingiz ham o'qishingiz mumkin. Boshlashga tayyormisiz?
                        </p>
                        <button onClick={startPlayTTS} className="w-full py-4 bg-emerald-600 text-white text-lg font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                            Hikoyani O'qishni Boshlash
                        </button>
                    </div>
                )}

                {/* 2. TTS or RECORDING */}
                {(phase === PHASE.TTS || phase === PHASE.RECORD) && (
                    <div className="flex flex-col h-full">
                        <div className="bg-gray-800/50 rounded-2xl p-5 mb-6 max-h-[40vh] overflow-y-auto">
                            <h2 className="text-white/60 text-xs mb-2 uppercase tracking-wide">{task?.title}</h2>
                            <p className="text-white text-lg leading-relaxed whitespace-pre-wrap font-serif">
                                {task?.story_text}
                            </p>

                            {/* LIVE MATCH Text if speaking */}
                            {transcript && (
                                <div className="mt-4 p-3 bg-black/30 rounded-lg border-l-2 border-emerald-500">
                                    <p className="text-xs text-gray-400 mb-1">Siz o'qiyapsiz:</p>
                                    <p className="text-emerald-400 text-sm font-medium leading-relaxed">{transcript}</p>
                                </div>
                            )}
                        </div>

                        {phase === PHASE.TTS && (
                            <div className="flex flex-col items-center gap-4 py-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center">
                                    <Volume2 className="w-7 h-7 text-emerald-400 animate-pulse" />
                                </div>
                                <p className="text-white/50 text-sm">Hikoya o'qilmoqda...</p>
                                <button onClick={() => { audioRef.current?.pause(); setPhase(PHASE.RECORD); }}
                                    className="text-white/30 text-xs hover:text-white/60 underline">
                                    O'tkazib yuborish (o'zim o'qiyman)
                                </button>
                            </div>
                        )}

                        {phase === PHASE.RECORD && (
                            <div className="flex flex-col items-center gap-4 py-2">
                                {sttError && <p className="text-red-400 text-xs text-center">{sttError}</p>}
                                {recording ? (
                                    <>
                                        <div className="relative w-20 h-20">
                                            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                                            <div className="w-20 h-20 rounded-full bg-red-500/30 border-2 border-red-500 flex items-center justify-center">
                                                <Mic className="w-8 h-8 text-red-500" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-red-400 font-mono text-lg font-bold">{fmt(elapsed)}</span>
                                        </div>
                                        <button onClick={stopAndEvaluate}
                                            className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-2xl font-medium hover:bg-red-500/30 transition-all">
                                            <Square className="w-4 h-4" /> Yakunlash
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-white/60 text-sm text-center">Mikrofonni bosib matnni o'qing</p>
                                        <button onClick={startRecording}
                                            className="flex items-center justify-center gap-2 w-full max-w-xs py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-emerald-500/30">
                                            <Mic className="w-5 h-5" /> Gapirishni Boshlash
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. EVALUATING SPINNER */}
                {phase === PHASE.EVALUATING && (
                    <div className="flex flex-col items-center justify-center py-10 gap-4">
                        <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        <p className="text-white/50 text-sm">O'qish natijalari baholanmoqda...</p>
                    </div>
                )}

                {/* 4. QUESTIONS */}
                {phase === PHASE.QUESTIONS && task?.questions && task.questions[currentQ] && (
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-500 text-xs">Savol {currentQ + 1} / {task.questions.length}</span>
                        </div>
                        <div className="h-1 bg-gray-800 rounded-full mb-6">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${((currentQ) / task.questions.length) * 100}%` }} />
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                            <h2 className="text-white text-lg font-semibold mb-6">{task.questions[currentQ].question}</h2>
                            <div className="space-y-2">
                                {task.questions[currentQ].options?.map((opt, j) => (
                                    <button key={j} onClick={() => selectAnswer(currentQ, j)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${answers[currentQ] === j
                                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                                            : 'border-white/5 bg-white/5 text-gray-300 hover:border-white/20'
                                            }`}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={nextQuestion}
                            disabled={answers[currentQ] === -1}
                            className="w-full flex justify-center items-center py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            {currentQ < task.questions.length - 1 ? "Keyingi" : "Natijani ko'rish"}
                        </button>
                    </div>
                )}

                {/* 5. RESULT */}
                {phase === PHASE.RESULT && result && (
                    <div className="flex flex-col items-center gap-5">
                        <div className="text-5xl">{result.total_score >= 80 ? '🏆' : result.total_score >= 50 ? '⭐' : '💪'}</div>
                        <div className="text-center">
                            <p className="text-white font-bold text-2xl">Umumiy Natijangiz</p>
                            <p className={`text-6xl font-black mt-2 ${scoreColor(result.total_score)}`}>{result.total_score?.toFixed(0)}</p>
                            <p className="text-white/40 text-sm mt-1">100 ball dan</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full mb-2">
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                <div className="text-lg">📖</div>
                                <div className={`text-lg font-bold ${scoreColor(result.score_completion)}`}>{result.completion_percentage?.toFixed(0)}%</div>
                                <div className="text-gray-500 text-xs mt-1">O'qilganlik (matn)</div>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                                <div className="text-lg">❓</div>
                                <div className={`text-lg font-bold ${scoreColor(result.score_questions)}`}>{result.questions_correct}/{result.questions_total}</div>
                                <div className="text-gray-500 text-xs mt-1">To'g'ri Savollar</div>
                            </div>
                        </div>

                        <button onClick={() => navigate(-1)}
                            className="w-full py-4 mt-2 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white rounded-2xl font-semibold hover:scale-[1.02] transition-transform">
                            Musobaqa Ro'yxatiga Qaytish
                        </button>
                    </div>
                )}

            </motion.div>
        </div>
    );
}
