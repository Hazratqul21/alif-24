import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookMarked, Mic, MicOff, Play, Square, X, BookOpen } from 'lucide-react';
import apiService from '../services/apiService';

// ─── Recording Modal ───────────────────────────────────────────────────────────
function RecordingModal({ ertak, onClose }) {
    // phase: 'countdown' | 'reading' | 'done'
    const [phase, setPhase] = useState('countdown');
    const [count, setCount] = useState(3);
    const [elapsed, setElapsed] = useState(0);
    const [recordedUrl, setRecordedUrl] = useState(null);
    const [playing, setPlaying] = useState(false);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const playbackRef = useRef(null);
    const timerRef = useRef(null);

    // ── Countdown ──
    useEffect(() => {
        if (phase !== 'countdown') return;
        if (count <= 0) {
            setPhase('reading');
            return;
        }
        const t = setTimeout(() => setCount(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, count]);

    // ── Start mic when phase becomes 'reading' ──
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

        // elapsed timer
        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => clearInterval(timerRef.current);
    }, [phase]);

    const stopRecording = () => {
        clearInterval(timerRef.current);
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const togglePlay = () => {
        if (playing) {
            playbackRef.current?.pause();
            setPlaying(false);
        } else {
            const a = new Audio(recordedUrl);
            playbackRef.current = a;
            a.onended = () => setPlaying(false);
            a.play();
            setPlaying(true);
        }
    };

    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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
                {/* Close */}
                <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                {/* Title */}
                <h2 className="text-white font-bold text-xl mb-1 pr-6">{ertak.title}</h2>
                <p className="text-white/40 text-sm mb-8">Matnni quyida o'zing o'qi 🎤</p>

                {/* Story text */}
                <div className="bg-white/5 rounded-xl p-4 mb-8 max-h-40 overflow-y-auto">
                    <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{ertak.content}</p>
                </div>

                {/* ── Countdown phase ── */}
                {phase === 'countdown' && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-white/60 text-sm">Tayyor bo'l, yozish boshlanmoqda...</p>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4b30fb] to-[#764ba2] flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <span className="text-white text-5xl font-black">{count}</span>
                        </div>
                        <p className="text-white/40 text-xs">Mikrofon sozlanmoqda...</p>
                    </div>
                )}

                {/* ── Reading phase ── */}
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
                        <button
                            onClick={stopRecording}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-2xl font-medium hover:bg-red-500/30 transition-all"
                        >
                            <Square className="w-4 h-4" />
                            Tugatish
                        </button>
                    </div>
                )}

                {/* ── Done phase ── */}
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
                            <button
                                onClick={togglePlay}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-medium transition-all ${playing
                                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                {playing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                {playing ? "To'xtatish" : "Eshitish"}
                            </button>
                            <button
                                onClick={() => { setPhase('countdown'); setCount(3); setElapsed(0); setRecordedUrl(null); setPlaying(false); }}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-medium hover:scale-105 transition-all"
                            >
                                <Mic className="w-4 h-4" />
                                Qayta o'qi
                            </button>
                        </div>
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            onClick={onClick}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden cursor-pointer transition-shadow group"
        >
            {/* Cover image area */}
            <div className="w-full aspect-[4/3] relative overflow-hidden">
                {hasImage ? (
                    <img
                        src={ertak.cover_image}
                        alt={ertak.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#4b6ef5] to-[#9b59b6] flex items-center justify-center group-hover:opacity-90 transition-opacity">
                        <BookOpen className="w-14 h-14 text-white/40" strokeWidth={1.5} />
                    </div>
                )}
            </div>

            {/* Card body */}
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

                {/* CTA button */}
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white rounded-2xl font-semibold text-sm hover:scale-[1.02] transition-transform shadow-md shadow-purple-500/30">
                    <Mic className="w-4 h-4" />
                    O'qishni boshlash
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
            {/* Stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[
                    { top: '5%', left: '10%', size: 'w-1 h-1', delay: '0s', dur: '2s' },
                    { top: '15%', left: '30%', size: 'w-1.5 h-1.5', delay: '0.5s', dur: '3s' },
                    { top: '20%', left: '70%', size: 'w-2 h-2', delay: '1.5s', dur: '3.5s' },
                    { top: '50%', left: '85%', size: 'w-1 h-1', delay: '0.8s', dur: '2.8s' },
                    { top: '70%', left: '20%', size: 'w-1.5 h-1.5', delay: '1.2s', dur: '3.2s' },
                    { top: '85%', left: '55%', size: 'w-2 h-2', delay: '0.4s', dur: '2.4s' },
                ].map((s, i) => (
                    <div key={i} className={`absolute ${s.size} bg-white rounded-full animate-pulse`}
                        style={{ top: s.top, left: s.left, animationDelay: s.delay, animationDuration: s.dur }} />
                ))}
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
            <section className="relative z-10 max-w-6xl mx-auto px-4 py-10 text-center">
                <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-bold text-white mb-3">
                    ✨ Ertaklar
                </motion.h2>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="text-white/50 text-lg max-w-xl mx-auto">
                    Kartochkani bosib o'qi — mikrofon yoqiladi!
                </motion.p>
            </section>

            {/* Grid */}
            <div className="relative z-10 max-w-6xl mx-auto px-4 pb-20">
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {ertaklar.map((ertak, i) => (
                            <ErtakCard
                                key={ertak.id}
                                ertak={ertak}
                                index={i}
                                onClick={() => setActiveErtak(ertak)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Recording Modal */}
            <AnimatePresence>
                {activeErtak && (
                    <RecordingModal
                        ertak={activeErtak}
                        onClose={() => setActiveErtak(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
