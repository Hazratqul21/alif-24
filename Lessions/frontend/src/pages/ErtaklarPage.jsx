import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookMarked, Volume2, Square, Loader, Mic, MicOff, Play } from 'lucide-react';
import apiService from '../services/apiService';

export default function ErtaklarPage() {
    const [ertaklar, setErtaklar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);

    // TTS state
    const [playingId, setPlayingId] = useState(null);
    const [ttsLoading, setTtsLoading] = useState(null);
    const [ttsDone, setTtsDone] = useState({}); // {ertakId: true} — AI o'qib bo'ldi
    const audioRef = useRef(null);

    // Voice recording state
    const [recordingId, setRecordingId] = useState(null);
    const [recordedAudio, setRecordedAudio] = useState({}); // {ertakId: blobUrl}
    const [playingRecording, setPlayingRecording] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordAudioRef = useRef(null);

    useEffect(() => {
        loadErtaklar();
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

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

    // ========== AI TTS O'qish ==========
    const handlePlayTTS = async (e, ertak) => {
        e.stopPropagation();
        if (playingId === ertak.id) { stopAudio(); return; }
        stopAudio();

        try {
            setTtsLoading(ertak.id);
            const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
            const response = await fetch(`${API_URL}/ertaklar/${ertak.id}/tts`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!response.ok) throw new Error('TTS xatoligi');

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                setPlayingId(null);
                setTtsDone(prev => ({ ...prev, [ertak.id]: true }));
                URL.revokeObjectURL(audioUrl);
                audioRef.current = null;
            };
            audio.onerror = () => {
                setPlayingId(null);
                URL.revokeObjectURL(audioUrl);
                audioRef.current = null;
            };

            await audio.play();
            setPlayingId(ertak.id);
        } catch (err) {
            console.error('TTS error:', err);
            alert("Audio o'qib bo'lmadi. Qayta urinib ko'ring.");
        } finally {
            setTtsLoading(null);
        }
    };

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setPlayingId(null);
    };

    // ========== Bola ovozini yozish ==========
    const startRecording = async (e, ertakId) => {
        e.stopPropagation();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setRecordedAudio(prev => ({ ...prev, [ertakId]: audioUrl }));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setRecordingId(ertakId);
        } catch (err) {
            console.error('Microphone error:', err);
            alert("Mikrofonga ruxsat bering!");
        }
    };

    const stopRecording = (e) => {
        e.stopPropagation();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setRecordingId(null);
    };

    const playRecording = (e, ertakId) => {
        e.stopPropagation();
        const url = recordedAudio[ertakId];
        if (!url) return;

        if (playingRecording === ertakId) {
            if (recordAudioRef.current) {
                recordAudioRef.current.pause();
                recordAudioRef.current = null;
            }
            setPlayingRecording(null);
            return;
        }

        const audio = new Audio(url);
        recordAudioRef.current = audio;
        audio.onended = () => { setPlayingRecording(null); recordAudioRef.current = null; };
        audio.play();
        setPlayingRecording(ertakId);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
            {/* Stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[5%] left-[10%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '2s' }} />
                <div className="absolute top-[15%] left-[30%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
                <div className="absolute top-[20%] left-[70%] w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '3.5s' }} />
                <div className="absolute top-[50%] left-[85%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.8s', animationDuration: '2.8s' }} />
                <div className="absolute top-[70%] left-[20%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.2s', animationDuration: '3.2s' }} />
                <div className="absolute top-[85%] left-[55%] w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s', animationDuration: '2.4s' }} />
            </div>

            {/* Header */}
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
                        <ArrowLeft className="w-4 h-4" />
                        Darsliklar
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 py-12 text-center">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-bold text-white mb-4"
                >
                    ✨ Ertaklar
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-white/50 text-lg max-w-xl mx-auto"
                >
                    Qiziqarli hikoyalar — AI o'qib beradi, keyin sen o'qi!
                </motion.p>
            </section>

            {/* Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-4 pb-16">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-10 h-10 border-4 border-[#4b30fb]/30 border-t-[#4b30fb] rounded-full animate-spin mx-auto" />
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400 mb-4">❌ {error}</p>
                        <button onClick={loadErtaklar} className="px-6 py-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-lg hover:scale-105 transition-transform">
                            Qayta urinish
                        </button>
                    </div>
                ) : ertaklar.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">📖</div>
                        <p className="text-white/50 text-lg">Hozircha ertaklar yo'q</p>
                        <p className="text-white/30 text-sm mt-2">Tez kunda yangi ertaklar qo'shiladi</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ertaklar.map((ertak, i) => (
                            <motion.div
                                key={ertak.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <div className="w-full text-left bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                                    <button
                                        onClick={() => setSelected(selected === ertak.id ? null : ertak.id)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-1">{ertak.title}</h3>
                                                <div className="flex items-center gap-3 text-xs text-white/50">
                                                    <span>{ertak.language === 'uz' ? "O'zbek" : ertak.language === 'ru' ? 'Русский' : 'English'}</span>
                                                    <span>Yosh: {ertak.age_group || '6-8'}</span>
                                                </div>
                                            </div>
                                            <span className="text-white/40 text-xl">{selected === ertak.id ? '▲' : '▼'}</span>
                                        </div>
                                    </button>

                                    {selected === ertak.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-4 pt-4 border-t border-white/10"
                                        >
                                            {/* Ertak matni */}
                                            <p className="text-white/80 leading-relaxed whitespace-pre-wrap mb-6">{ertak.content}</p>

                                            {/* === 1-qadam: AI o'qib bersin === */}
                                            <div className="bg-white/5 rounded-xl p-4 mb-3 border border-white/10">
                                                <p className="text-white/60 text-xs font-medium mb-2">1-qadam: AI o'qib bersin</p>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={(e) => handlePlayTTS(e, ertak)}
                                                        disabled={ttsLoading === ertak.id}
                                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${playingId === ertak.id
                                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                                                : ttsLoading === ertak.id
                                                                    ? 'bg-white/10 text-white/50 cursor-wait'
                                                                    : 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white hover:scale-105'
                                                            }`}
                                                    >
                                                        {ttsLoading === ertak.id ? (
                                                            <><Loader className="w-4 h-4 animate-spin" /> Yuklanmoqda...</>
                                                        ) : playingId === ertak.id ? (
                                                            <><Square className="w-4 h-4" /> To'xtatish</>
                                                        ) : (
                                                            <><Volume2 className="w-4 h-4" /> 🤖 AI o'qib bersin</>
                                                        )}
                                                    </button>
                                                    {playingId === ertak.id && (
                                                        <span className="flex items-center gap-1 text-xs text-[#4b30fb]">
                                                            <span className="w-1.5 h-1.5 bg-[#4b30fb] rounded-full animate-pulse" />
                                                            Eshitilmoqda...
                                                        </span>
                                                    )}
                                                    {ttsDone[ertak.id] && !playingId && (
                                                        <span className="text-xs text-green-400">✅ AI o'qib bo'ldi!</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* === 2-qadam: Endi sen o'qi! === */}
                                            <div className={`rounded-xl p-4 border transition-all ${ttsDone[ertak.id]
                                                    ? 'bg-emerald-500/10 border-emerald-500/20'
                                                    : 'bg-white/5 border-white/10 opacity-50'
                                                }`}>
                                                <p className="text-white/60 text-xs font-medium mb-2">
                                                    2-qadam: Endi sen o'qi! 🎤
                                                </p>

                                                {!ttsDone[ertak.id] ? (
                                                    <p className="text-white/30 text-sm">Avval AI o'qib bersin, keyin sen o'qi!</p>
                                                ) : (
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        {/* Record/Stop button */}
                                                        {recordingId === ertak.id ? (
                                                            <button
                                                                onClick={stopRecording}
                                                                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-all animate-pulse"
                                                            >
                                                                <MicOff className="w-4 h-4" />
                                                                Yozishni to'xtatish
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => startRecording(e, ertak.id)}
                                                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-medium hover:scale-105 transition-all"
                                                            >
                                                                <Mic className="w-4 h-4" />
                                                                🎤 O'qishni boshlash
                                                            </button>
                                                        )}

                                                        {recordingId === ertak.id && (
                                                            <span className="flex items-center gap-1 text-xs text-red-400">
                                                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                                Yozilmoqda...
                                                            </span>
                                                        )}

                                                        {/* Play recording */}
                                                        {recordedAudio[ertak.id] && !recordingId && (
                                                            <button
                                                                onClick={(e) => playRecording(e, ertak.id)}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${playingRecording === ertak.id
                                                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                                        : 'bg-white/10 text-white/70 hover:text-white'
                                                                    }`}
                                                            >
                                                                <Play className="w-4 h-4" />
                                                                {playingRecording === ertak.id ? "To'xtatish" : "O'z ovozingni eshit"}
                                                            </button>
                                                        )}

                                                        {recordedAudio[ertak.id] && !recordingId && (
                                                            <span className="text-xs text-green-400">🌟 Barakalla! Ajoyib o'qiding!</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
