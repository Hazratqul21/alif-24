// ─── Recording Modal (Microsoft Speech SDK bilan) ──────────────────────────
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

    // Microsoft SDK refs
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

    // Microsoft Speech token olish
    const ensureSpeechConfig = async () => {
        if (speechConfigRef.current) return true;
        try {
            const resp = await fetch(`${API_URL}/smartkids/speech-token`, { credentials: 'include' });
            if (!resp.ok) {
                const mainResp = await fetch('https://alif24.uz/api/v1/smartkids/speech-token', { credentials: 'include' });
                if (!mainResp.ok) throw new Error('speech-token failed');
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

                // Microsoft SDK continuous recognition - UZLUKSIZ TINGLAYDI
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
                            const limit = Math.min(currentIndex + 5, expectedWords.length);
                            for (let k = currentIndex; k < limit; k++) {
                                if (getSimilarity(sw, expectedWords[k]) >= 0.55) {
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

                // Avtomatik qayta ulanish - Microsoft SDK buni o'zi boshqaradi
                recognizer.canceled = (s, e) => {
                    if (e.reason === SpeechSDK.CancellationReason.Error) {
                        console.error("STT Error:", e.errorDetails);
                    }
                };

                await recognizer.startContinuousRecognitionAsync();
            } catch {
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
                className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: '94vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* HEADER */}
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

                {/* MATN MAYDONI */}
                {phase !== 'done' && (
                    <div className="mx-4 mb-2 flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
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

                {/* CONTROLS */}
                <div className="shrink-0 px-4 pb-4 pt-1">
                    {phase === 'countdown' && (
                        <div className="flex flex-col items-center gap-2 py-2">
                            <p className="text-white/50 text-sm">Tayyor bo'l, yozish boshlanmoqda...</p>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4b30fb] to-[#764ba2] flex items-center justify-center shadow-lg shadow-purple-500/40">
                                <span className="text-white text-4xl font-black">{count}</span>
                            </div>
                        </div>
                    )}

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

                    {phase === 'done' && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-3xl">{emoji}</span>
                                <div>
                                    <p className="text-white font-bold text-lg">O'qish natijasi</p>
                                    <p className="text-white/40 text-xs">{ertak.title}</p>
                                </div>
                            </div>

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