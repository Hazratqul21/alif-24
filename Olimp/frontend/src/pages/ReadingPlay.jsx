import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Square, X, ChevronRight, Volume2 } from 'lucide-react';
import readingService from '../services/readingService';
import { getSimilarity, extractWords } from '../utils/fuzzyMatch';
import { useConfetti } from '../hooks/useConfetti';
import { useSoundFx } from '../hooks/useSoundFx';

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

    const { triggerConfetti } = useConfetti();
    const { playSuccess, playLevelUp } = useSoundFx();

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

    // Results & Questions (Voice Quiz)
    const [result, setResult] = useState(null);
    const [currentQ, setCurrentQ] = useState(0);
    const [quizScores, setQuizScores] = useState([]); // [{score, recognized, correct, passed}]
    const [quizPhase, setQuizPhase] = useState('tts'); // 'tts' | 'record' | 'evaluating' | 'result'
    const [quizRecording, setQuizRecording] = useState(false);
    const [quizEvaluating, setQuizEvaluating] = useState(false);
    const [quizElapsed, setQuizElapsed] = useState(0);
    const quizRecognizerRef = useRef(null);
    const quizRecognizedRef = useRef('');
    const quizTimerRef = useRef(null);

    // Karaoke Highlighting logic
    const [expectedWords, setExpectedWords] = useState([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const wordIndexRef = useRef(0); // Synchronize state and callback

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

            // Build expected words for highlighting
            if (data.task?.story_text) {
                setExpectedWords(extractWords(data.task.story_text));
            }

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
            let resp = await fetch(`${API_URL}/smartkids/speech-token`, { credentials: 'include' });
            if (!resp.ok) {
                resp = await fetch('https://alif24.uz/api/v1/smartkids/speech-token', { credentials: 'include' });
            }
            if (!resp.ok) throw new Error(`speech-token failed`);
            const data = await resp.json();
            const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");
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

        // Reset fuzzy match state
        setCurrentWordIndex(0);
        wordIndexRef.current = 0;

        const ok = await ensureSpeechConfig();
        if (!ok) return;

        try {
            setRecording(true);
            setElapsed(0);
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

            const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfigRef.current, audioConfig);
            recognizerRef.current = recognizer;

            recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    const newText = e.result.text;
                    transcriptRef.current += (newText + " ");
                    setTranscript(transcriptRef.current);

                    // --- Fuzzy Matching Logic (Karaoke Highlight) ---
                    // Har qanday yangi so'zlarni arrayga o'giramiz
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
                    // Navigate to Voice Quiz phase
                    setCurrentQ(0);
                    setQuizScores([]);
                    setQuizPhase('tts');
                    setPhase(PHASE.QUESTIONS);
                    setElapsed(finalReadingTime);
                    setTranscript(text);
                    // TTS will auto-play via useEffect
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

    const submitFinalResult = async (readingTime, sttText, quizResults) => {
        try {
            setPhase(PHASE.EVALUATING);
            const data = await readingService.submitReading(compId, taskId, {
                stt_transcript: sttText || '',
                reading_time_seconds: readingTime || 0,
                question_answers: null, // Voice quiz uses separate evaluate endpoint
            });

            // Merge quiz scores into result
            const quizAvg = quizResults.length > 0
                ? Math.round(quizResults.reduce((a, b) => a + b.score, 0) / quizResults.length)
                : 0;
            const finalResult = { ...data.result, quiz_voice_scores: quizResults, quiz_voice_avg: quizAvg };
            setResult(finalResult);

            // Trigger effects
            if (data.result?.total_score >= 80 || quizAvg >= 80) {
                triggerConfetti();
                playLevelUp();
            } else if (data.result?.total_score >= 40) {
                playSuccess();
            }

            setPhase(PHASE.RESULT);
        } catch (err) {
            setError(err.message || 'Natijani yuborishda xatolik');
        }
    };

    // ============ VOICE QUIZ LOGIC (Ertaklar style) ============

    // Auto-play TTS when entering quiz or moving to next question
    useEffect(() => {
        if (phase !== PHASE.QUESTIONS || quizPhase !== 'tts') return;
        if (!task?.questions?.[currentQ]) return;
        playQuestionTTS(task.questions[currentQ].question);
    }, [phase, currentQ, quizPhase]);

    // Cleanup quiz timer/recognizer
    useEffect(() => {
        return () => {
            clearInterval(quizTimerRef.current);
            if (quizRecognizerRef.current) {
                try { quizRecognizerRef.current.stopContinuousRecognitionAsync(); quizRecognizerRef.current.close(); } catch (_) { }
            }
        };
    }, []);

    const playQuestionTTS = async (text) => {
        if (!text) { setQuizPhase('record'); return; }
        if (questionAudioRef.current) { questionAudioRef.current.pause(); questionAudioRef.current = null; }

        try {
            const lang = task?.language || 'uz';
            let response = await fetch(
                `${API_URL}/speech/tts?text=${encodeURIComponent(text)}&language=${lang}&gender=female`,
                { credentials: 'include' }
            );
            if (!response.ok) {
                response = await fetch(
                    `https://alif24.uz/api/v1/speech/tts?text=${encodeURIComponent(text)}&language=${lang}&gender=female`,
                    { credentials: 'include' }
                );
            }
            if (!response.ok) { setQuizPhase('record'); return; }

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            questionAudioRef.current = audio;
            audio.onended = () => { URL.revokeObjectURL(audioUrl); setQuizPhase('record'); };
            audio.onerror = () => { setQuizPhase('record'); };
            await audio.play();
        } catch {
            setQuizPhase('record');
        }
    };

    const startQuizRecording = async () => {
        setSttError('');
        quizRecognizedRef.current = '';
        const ok = await ensureSpeechConfig();
        if (!ok) return;

        try {
            setQuizRecording(true);
            setQuizElapsed(0);
            quizTimerRef.current = setInterval(() => setQuizElapsed(s => s + 1), 1000);

            const SpeechSDK = await import('microsoft-cognitiveservices-speech-sdk');
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfigRef.current, audioConfig);
            quizRecognizerRef.current = recognizer;

            recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    quizRecognizedRef.current += (e.result.text + ' ');
                }
            };

            recognizer.startContinuousRecognitionAsync();
        } catch (e) {
            console.error('Quiz recording failed:', e);
            setQuizRecording(false);
            setSttError('Mikrofon ochilmadi. Ruxsatni tekshiring.');
        }
    };

    const stopAndEvaluateQuiz = () => {
        clearInterval(quizTimerRef.current);
        if (quizRecognizerRef.current) {
            const rec = quizRecognizerRef.current;
            quizRecognizerRef.current = null;
            rec.stopContinuousRecognitionAsync(() => {
                try { rec.close(); } catch (_) { }
                evaluateQuizAnswer(quizRecognizedRef.current.trim());
            });
        } else {
            evaluateQuizAnswer(quizRecognizedRef.current.trim());
        }
    };

    const evaluateQuizAnswer = async (text) => {
        setQuizRecording(false);
        setQuizEvaluating(true);
        setQuizPhase('evaluating');
        try {
            const formData = new FormData();
            formData.append('recognized_text', text);

            const res = await fetch(
                `${API_URL}/reading/competitions/${compId}/tasks/${taskId}/quiz/evaluate-text?question_index=${currentQ}`,
                { method: 'POST', body: formData, credentials: 'include' }
            );
            const json = await res.json();
            const d = json.data || {};
            setQuizScores(prev => [...prev, {
                score: d.score ?? 0,
                recognized: d.recognized_text || text,
                correct: d.correct_answer || task.questions[currentQ]?.answer || '',
                passed: d.passed ?? false,
            }]);
        } catch {
            setQuizScores(prev => [...prev, {
                score: 0, recognized: text,
                correct: task.questions[currentQ]?.answer || '', passed: false,
            }]);
        } finally {
            setQuizEvaluating(false);
            setQuizPhase('result');
        }
    };

    const nextQuizQuestion = () => {
        if (currentQ + 1 >= task.questions.length) {
            // All questions done — submit final result with quiz scores
            submitFinalResult(elapsed, transcript, quizScores);
        } else {
            setCurrentQ(q => q + 1);
            setQuizPhase('tts');
        }
    };


    // ============ ACTIONS ============
    const startPlayTTS = async () => {
        setPhase(PHASE.TTS);
        try {
            // Session yaratish — backend'da submit ishlashi uchun kerak
            await readingService.startReading(compId, taskId);

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
                                {expectedWords.map((word, idx) => (
                                    <span key={idx} className={`inline-block mr-1 transition-colors duration-150 ${idx < currentWordIndex ? "text-emerald-400 font-bold drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                                        : "text-white"
                                        }`}>
                                        {word}
                                    </span>
                                ))}
                            </p>
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

                {/* 4. VOICE QUIZ (Ertaklar style) */}
                {phase === PHASE.QUESTIONS && task?.questions && task.questions[currentQ] && (
                    <div className="flex flex-col">
                        {/* Progress */}
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-500 text-xs">Savol {currentQ + 1} / {task.questions.length}</span>
                            {quizScores.length > 0 && (
                                <span className="text-xs text-white/40">O'rtacha: <span className={scoreColor(Math.round(quizScores.reduce((a, b) => a + b.score, 0) / quizScores.length))}>{Math.round(quizScores.reduce((a, b) => a + b.score, 0) / quizScores.length)}/100</span></span>
                            )}
                        </div>
                        <div className="h-1 bg-gray-800 rounded-full mb-6">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${((currentQ) / task.questions.length) * 100}%` }} />
                        </div>

                        {/* Question text */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                            <p className="text-white/40 text-xs mb-2 uppercase tracking-wide">{currentQ + 1}-savol</p>
                            <h2 className="text-white text-lg font-semibold leading-relaxed">{task.questions[currentQ].question}</h2>
                        </div>

                        {/* TTS playing */}
                        {quizPhase === 'tts' && (
                            <div className="flex flex-col items-center gap-4 py-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center">
                                    <Volume2 className="w-7 h-7 text-emerald-400 animate-pulse" />
                                </div>
                                <p className="text-white/50 text-sm">Savol o'qilmoqda...</p>
                                <button onClick={() => { questionAudioRef.current?.pause(); setQuizPhase('record'); }}
                                    className="text-white/30 text-xs hover:text-white/60 underline">O'tkazib yuborish</button>
                            </div>
                        )}

                        {/* Record */}
                        {quizPhase === 'record' && (
                            <div className="flex flex-col items-center gap-4 py-2">
                                {quizRecording ? (
                                    <>
                                        <div className="relative w-20 h-20">
                                            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                                            <div className="w-20 h-20 rounded-full bg-red-500/30 border-2 border-red-500 flex items-center justify-center">
                                                <Mic className="w-8 h-8 text-red-400" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-red-400 font-mono text-lg font-bold">{fmt(quizElapsed)}</span>
                                        </div>
                                        <button onClick={stopAndEvaluateQuiz}
                                            className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-2xl font-medium hover:bg-red-500/30 transition-all">
                                            <Square className="w-4 h-4" /> Javobni yuborish
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {sttError && <p className="text-red-400 text-xs text-center mb-2">{sttError}</p>}
                                        <p className="text-white/60 text-sm text-center">Mikrofonni bosib javob bering</p>
                                        <button onClick={startQuizRecording}
                                            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:scale-105 transition-transform shadow-lg shadow-emerald-500/30">
                                            <Mic className="w-5 h-5" /> Javob berish
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Evaluating */}
                        {quizPhase === 'evaluating' && (
                            <div className="flex flex-col items-center gap-4 py-6">
                                <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                <p className="text-white/50 text-sm">Baholanmoqda...</p>
                            </div>
                        )}

                        {/* Per-question result */}
                        {quizPhase === 'result' && quizScores[currentQ] && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="text-4xl">{quizScores[currentQ].score >= 80 ? '🌟' : quizScores[currentQ].score >= 50 ? '👍' : '💡'}</div>
                                <div className="text-center">
                                    <p className={`text-4xl font-black ${scoreColor(quizScores[currentQ].score)}`}>{quizScores[currentQ].score}</p>
                                    <p className="text-white/40 text-xs mt-1">ball</p>
                                </div>
                                {quizScores[currentQ].recognized && (
                                    <div className="w-full bg-white/5 rounded-xl p-3 space-y-1.5 text-xs">
                                        <div className="flex gap-2">
                                            <span className="text-white/40 shrink-0">Siz:</span>
                                            <span className="text-white/70 italic">"{quizScores[currentQ].recognized}"</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-white/40 shrink-0">To'g'ri:</span>
                                            <span className="text-emerald-400">"{quizScores[currentQ].correct}"</span>
                                        </div>
                                    </div>
                                )}
                                <button onClick={nextQuizQuestion}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-medium hover:scale-105 transition-transform">
                                    {currentQ + 1 >= task.questions.length ? "Natijani ko'rish" : 'Keyingi savol'}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. RESULT */}
                {phase === PHASE.RESULT && result && (() => {
                    const wpm = elapsed > 0 && currentWordIndex > 0 ? Math.round(currentWordIndex / (elapsed / 60)) : (result.words_per_minute || 0);
                    const readPct = result.completion_percentage?.toFixed(0) || 0;
                    const fmtResult = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
                    const totalCoin = result.coins_earned || 0;
                    const readingCoin = result.coins_reading || 0;
                    const quizCoin = result.coins_quiz || 0;
                    const wpmColor = wpm >= 60 ? 'text-emerald-400' : wpm >= 40 ? 'text-amber-400' : 'text-red-400';
                    const emoji = result.total_score >= 80 ? '🏆' : result.total_score >= 50 ? '⭐' : '💪';

                    return (
                        <div className="flex flex-col items-center gap-4 max-h-[75vh] overflow-y-auto">
                            <div className="text-5xl">{emoji}</div>
                            <p className="text-white font-bold text-2xl">Umumiy natija</p>
                            <p className="text-white/40 text-sm -mt-2">{task?.title}</p>

                            {/* Reading stats */}
                            <div className="w-full">
                                <p className="text-white/50 text-xs uppercase tracking-wide mb-2">📖 O'qish</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                        <p className={`text-xl font-black ${wpmColor}`}>{wpm}</p>
                                        <p className="text-white/40 text-[10px]">so'z/daq</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                        <p className="text-xl font-black text-blue-400">{readPct}%</p>
                                        <p className="text-white/40 text-[10px]">o'qilgan</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                        <p className="text-xl font-black text-purple-400">{fmtResult}</p>
                                        <p className="text-white/40 text-[10px]">vaqt</p>
                                    </div>
                                </div>
                            </div>

                            {/* Voice Quiz stats */}
                            {result.quiz_voice_scores?.length > 0 && (
                                <div className="w-full">
                                    <p className="text-white/50 text-xs uppercase tracking-wide mb-2">🧠 Savol-javob (AI)</p>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center mb-2">
                                        <p className={`text-3xl font-black ${scoreColor(result.quiz_voice_avg)}`}>{result.quiz_voice_avg}</p>
                                        <p className="text-white/40 text-xs mt-1">100 ball dan</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        {result.quiz_voice_scores.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                                                <span className="text-white/60 text-xs">{i + 1}-savol</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${s.score >= 80 ? 'bg-emerald-500' : s.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.score}%` }} />
                                                    </div>
                                                    <span className={`text-xs font-bold min-w-[24px] text-right ${scoreColor(s.score)}`}>{s.score}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Fallback: original backend quiz stats */}
                            {result.questions_total > 0 && !result.quiz_voice_scores?.length && (
                                <div className="w-full">
                                    <p className="text-white/50 text-xs uppercase tracking-wide mb-2">❓ Savollar</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                            <p className={`text-xl font-black ${scoreColor(result.score_questions)}`}>{result.questions_correct}/{result.questions_total}</p>
                                            <p className="text-white/40 text-[10px]">to'g'ri</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                            <p className={`text-xl font-black ${scoreColor(result.total_score)}`}>{result.total_score?.toFixed(0)}</p>
                                            <p className="text-white/40 text-[10px]">umumiy ball</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Coin */}
                            <div className="w-full bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/30 rounded-2xl p-4 text-center">
                                <p className="text-3xl font-black text-yellow-400">+{totalCoin} 🪙</p>
                                <p className="text-white/40 text-xs mt-1">O'qish: +{readingCoin} • Quiz: +{quizCoin}</p>
                            </div>

                            {/* Word Accuracy Map */}
                            <div className="w-full mt-2 bg-gray-900 border border-white/5 rounded-2xl p-5">
                                <h3 className="text-white/60 text-xs uppercase tracking-wide mb-3 flex items-center justify-between">
                                    <span>🔍 So'zma-so'z Tahlil</span>
                                    <span className="text-[10px] text-white/30">(Yashil: to'g'ri, Qizil: xato/o'tkazib yuborilgan)</span>
                                </h3>
                                <div className="text-sm font-serif leading-relaxed h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-2">
                                    {expectedWords.map((word, idx) => {
                                        // A simple check to see if the word was reached during the reading phase
                                        // Because we tracked currentWordIndex based on speech recognition!
                                        const isCorrect = idx < currentWordIndex;
                                        return (
                                            <span
                                                key={idx}
                                                className={`inline-block mr-1 mb-1 px-1.5 py-0.5 rounded ${isCorrect
                                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                    : 'bg-red-500/20 text-red-300 border border-red-500/30 line-through decoration-red-500/50'
                                                    }`}
                                            >
                                                {word}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            <button onClick={() => navigate(-1)}
                                className="w-full py-4 mt-2 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white rounded-2xl font-semibold hover:scale-[1.02] transition-transform">
                                Musobaqa Ro'yxatiga Qaytish
                            </button>
                        </div>
                    );
                })()}

            </motion.div>
        </div>
    );
}
