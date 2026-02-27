/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Volume2, RotateCcw, Mic, Check } from "lucide-react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import "./HarfModal.css";

// Set `VITE_HARF_DEBUG=1` to enable verbose Harf logs in the browser console.
const HARF_DEBUG = (import.meta.env?.VITE_HARF_DEBUG || "") === "1";
const harfLog = (...args) => {
    if (HARF_DEBUG) console.log(...args);
};
const harfWarn = (...args) => {
    if (HARF_DEBUG) console.warn(...args);
};
const harfDebug = (...args) => {
    if (HARF_DEBUG) console.debug(...args);
};

const HarfModal = ({ isOpen, onClose, card, externalTranscript, onAskStateChange, onTranscriptConsumed, onComplete }) => {
    const [modalState, setModalState] = useState('initial');
    const [aiResponse, setAiResponse] = useState('');
    const [childTranscript, setChildTranscript] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [earnedStars, setEarnedStars] = useState(0);

    const audioQueueRef = useRef([]);
    const isProcessingQueueRef = useRef(false);

    // Fast TTS (Azure Speech SDK)
    const synthesizerRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioSourceRef = useRef(null);
    const htmlAudioRef = useRef(null);
    const htmlAudioUrlRef = useRef(null);

    // Fast STT (Azure Speech SDK)
    const [isListening, setIsListening] = useState(false);
    const [sttError, setSttError] = useState('');
    const speechConfigRef = useRef(null);
    const recognizerRef = useRef(null);
    const speechInitInProgressRef = useRef(false);
    const speechInitPromiseRef = useRef(null);

    // Keep latest callbacks without re-triggering effects on identity changes
    const onAskStateChangeRef = useRef(null);
    const onTranscriptConsumedRef = useRef(null);

    // Prevent re-processing the same transcript (avoid repeating Barakalla)
    const lastHandledTranscriptKeyRef = useRef(null);

    useEffect(() => {
        onAskStateChangeRef.current = onAskStateChange;
        onTranscriptConsumedRef.current = onTranscriptConsumed;
    }, [onAskStateChange, onTranscriptConsumed]);

    // --- API endpoints ---
    const SMARTKIDS_API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '')
        ? `${(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '')}/smartkids`
        : "/api/v1/smartkids";

    const SPEECH_TOKEN_ENDPOINT = `${SMARTKIDS_API_BASE}/speech-token`;

    const ensureSpeechConfig = useCallback(async () => {
        if (speechConfigRef.current) return true;

        // If an init is already in-flight, await it instead of failing.
        if (speechInitPromiseRef.current) {
            try {
                await speechInitPromiseRef.current;
            } catch (_) {
                // ignore, handled below by checking speechConfigRef
            }
            return !!speechConfigRef.current;
        }

        speechInitInProgressRef.current = true;
        const initPromise = (async () => {
            const resp = await fetch(SPEECH_TOKEN_ENDPOINT);
            if (!resp.ok) throw new Error(`speech-token failed: ${resp.status}`);
            const data = await resp.json();
            const cfg = SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
            cfg.speechRecognitionLanguage = 'uz-UZ';
            cfg.speechSynthesisVoiceName = 'uz-UZ-MadinaNeural';
            // Prefer MP3 output for broad browser playback support and smaller payload.
            try {
                cfg.setSpeechSynthesisOutputFormat(
                    SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3
                );
            } catch (_) {}
            speechConfigRef.current = cfg;
        })();

        speechInitPromiseRef.current = initPromise;
        try {
            await initPromise;
            return true;
        } catch (e) {
            console.error('❌ Speech config init failed:', e);
            setSttError("Ovozli tanish ishlamadi (speech token).");
            return false;
        } finally {
            speechInitPromiseRef.current = null;
            speechInitInProgressRef.current = false;
        }
    }, [SPEECH_TOKEN_ENDPOINT]);

    const hardStopTts = useCallback(() => {
        // Stop WebAudio playback
        try {
            if (audioSourceRef.current) {
                try { audioSourceRef.current.onended = null; } catch (_) {}
                try { audioSourceRef.current.stop(0); } catch (_) {}
                try { audioSourceRef.current.disconnect(); } catch (_) {}
            }
        } catch (_) {}
        audioSourceRef.current = null;

        // Stop HTMLAudio playback
        try {
            const a = htmlAudioRef.current;
            if (a) {
                try { a.pause(); } catch (_) {}
                try { a.currentTime = 0; } catch (_) {}
                try { a.src = ''; } catch (_) {}
            }
        } catch (_) {}
        htmlAudioRef.current = null;
        try {
            if (htmlAudioUrlRef.current) {
                URL.revokeObjectURL(htmlAudioUrlRef.current);
            }
        } catch (_) {}
        htmlAudioUrlRef.current = null;

        const currentSynth = synthesizerRef.current;
        if (currentSynth) {
            try {
                if (typeof currentSynth.stopSpeakingAsync === 'function') {
                    currentSynth.stopSpeakingAsync(
                        () => {
                            try { currentSynth.close(); } catch (_) {}
                        },
                        () => {
                            try { currentSynth.close(); } catch (_) {}
                        }
                    );
                } else {
                    currentSynth.close();
                }
            } catch (_) {
                try { currentSynth.close(); } catch (_) {}
            }
            synthesizerRef.current = null;
        }
    }, []);

    function detectAudioMimeFromTextToSpeech() {
        // We configure MP3 output above.
        return 'audio/mpeg';
    }

    const stopRecognizer = useCallback(() => {
        try {
            recognizerRef.current?.stopContinuousRecognitionAsync?.();
        } catch (_) {}
        try {
            recognizerRef.current?.close?.();
        } catch (_) {}
        recognizerRef.current = null;
        setIsListening(false);
    }, []);

    const startListeningOnce = useCallback(async () => {
        if (modalState !== 'asking') return;
        if (isListening) return;

        setSttError('');
        setChildTranscript('');
        lastHandledTranscriptKeyRef.current = null;
        const ok = await ensureSpeechConfig();
        if (!ok || !speechConfigRef.current) return;

        try {
            setIsListening(true);

            // Close previous recognizer if any
            try { recognizerRef.current?.close?.(); } catch (_) {}
            recognizerRef.current = null;

            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfigRef.current, audioConfig);
            recognizerRef.current = recognizer;

            recognizer.recognizeOnceAsync(
                (result) => {
                    setIsListening(false);
                    try { recognizer.close(); } catch (_) {}
                    if (recognizerRef.current === recognizer) recognizerRef.current = null;

                    const text = (result?.text || '').trim();
                    if (result?.reason === SpeechSDK.ResultReason.RecognizedSpeech && text) {
                        setChildTranscript(text);
                        return;
                    }

                    if (result?.reason === SpeechSDK.ResultReason.NoMatch) {
                        setSttError("Ovoz aniqlanmadi. Qaytadan urinib ko'ring.");
                        return;
                    }

                    setSttError("Ovoz tanishda xatolik.");
                },
                (err) => {
                    console.error('❌ STT recognizeOnceAsync error:', err);
                    setIsListening(false);
                    try { recognizer.close(); } catch (_) {}
                    if (recognizerRef.current === recognizer) recognizerRef.current = null;
                    setSttError("Mikrofon yoki STT xatoligi.");
                }
            );
        } catch (e) {
            console.error('❌ startListeningOnce failed:', e);
            setIsListening(false);
            setSttError("Mikrofon ochilmadi. Ruxsatni tekshiring.");
        }
    }, [ensureSpeechConfig, isListening, modalState]);

    // --- Text normalization ---
    function normalizeUzForTTS(text) {
        if (!text) return text;

        // IMPORTANT: For Uzbek Latin, keep the special letters `gʻ` and `oʻ` intact.
        // Converting them to g'/o' makes TTS read them as plain g/o.
        // Normalize apostrophe-like characters to the Uzbek modifier letter apostrophe: U+02BB (ʻ)
        const UZ_APOS = "ʻ";
        return text
            .replace(/[ʼ'`]/g, UZ_APOS)
            // Keep existing "ʻ" as-is (do not convert to plain apostrophe)
            .replace(/sh/gi, "sh")
            .replace(/ch/gi, "ch")
            .replace(/ng/gi, "ng");
    }

    function getLetterPronunciation(letter) {
        const pronunciations = {
            "v": "vi",
            "l": "l'",
            "x": "xi",
            "y": "ye",
            "m": "m'",
            "n": "n'",
            "q": "q'",
            "gʻ": "gʻi",
            "oʻ": "oʻ", 
            "sh": "shi",
            "ch": "chi",
            "ng": "ng",
            "'": "tutuq belgisi"
        };
        return pronunciations[letter.toLowerCase()] || letter;
    }

    function getQuestionText(letter) {
        const l = (letter || '').toLowerCase();

        // In Uzbek, words do not start with "ng" or the apostrophe (tutuq belgisi).
        // Ask about words that CONTAIN these instead of "start with".
        if (l === 'ng') {
            return "Qani aytchi, ng harf birikmasi mavjud bo'lgan qanday soʻzlarni bilasan?";
        }
        if (l === "'") {
            return "Qani aytchi, tutuq belgisi mavjud bo'lgan qanday soʻzlarni bilasan?";
        }

        const pronunciations = {
            "gʻ": "gʻ harfi",
            "oʻ": "oʻ harfi",
            "sh": "sh harfi",
            "ch": "ch harfi"
        };
        const target = pronunciations[l] || `${letter} harfi`;
        return `Qani aytchi, ${target}dan boshlanadigan qanday soʻzlarni bilasan?`;
    }

    const hasNg = (w) => /ng/i.test(w);
    const hasApostrophe = (w) => /[ʼʻ'`]|gʻ|Gʻ/.test(w);

    // --- TTS function ---
    const processAudioQueue = useCallback(async () => {
        harfDebug('🔄 processAudioQueue', {
            queueLength: audioQueueRef.current.length,
            isProcessing: isProcessingQueueRef.current,
        });

        if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) {
            harfDebug('⏸️ Skipping - already processing or queue empty');
            return;
        }
        isProcessingQueueRef.current = true;
        setIsPlaying(true);

        let { text, onStart, onEnd } = audioQueueRef.current.shift();
        text = normalizeUzForTTS(text);

        try {
            if (onStart) onStart();

            const ok = await ensureSpeechConfig();
            if (!ok || !speechConfigRef.current) throw new Error('Speech config not initialized');

            // Stop any previous speech to avoid overlaps
            hardStopTts();

            harfLog('📤 Azure Speech SDK TTS:', text);

            // Use stream output so SDK does NOT auto-play; we will play ourselves and advance queue on ended.
            const pullStream = SpeechSDK.AudioOutputStream.createPullStream();
            const sdkAudioConfig = SpeechSDK.AudioConfig.fromStreamOutput(pullStream);
            const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfigRef.current, sdkAudioConfig);
            synthesizerRef.current = synthesizer;

            const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="uz-UZ"><voice name="uz-UZ-MadinaNeural">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</voice></speak>`;

            const audioArrayBuffer = await new Promise((resolve, reject) => {
                synthesizer.speakSsmlAsync(
                    ssml,
                    (result) => {
                        try { synthesizer.close(); } catch (_) {}
                        if (synthesizerRef.current === synthesizer) synthesizerRef.current = null;

                        const data = result?.audioData;
                        if (!data) {
                            reject(new Error('Empty audioData'));
                            return;
                        }
                        // audioData can be ArrayBuffer or Uint8Array-like
                        if (data instanceof ArrayBuffer) {
                            resolve(data.slice(0));
                            return;
                        }
                        if (data?.buffer instanceof ArrayBuffer) {
                            resolve(data.buffer.slice(0));
                            return;
                        }
                        reject(new Error('Unknown audioData type'));
                    },
                    (err) => {
                        try { synthesizer.close(); } catch (_) {}
                        if (synthesizerRef.current === synthesizer) synthesizerRef.current = null;
                        reject(err || new Error('TTS failed'));
                    }
                );
            });

            // Play via WebAudio first (low latency), fallback to <audio>.
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContextRef.current.state === 'suspended') {
                try { await audioContextRef.current.resume(); } catch (_) {}
            }

            try {
                const decoded = await audioContextRef.current.decodeAudioData(audioArrayBuffer.slice(0));
                const src = audioContextRef.current.createBufferSource();
                src.buffer = decoded;
                src.connect(audioContextRef.current.destination);
                audioSourceRef.current = src;

                src.onended = () => {
                    if (audioSourceRef.current === src) audioSourceRef.current = null;
                    try { if (onEnd) onEnd(); } catch (_) {}
                    isProcessingQueueRef.current = false;
                    setIsPlaying(false);
                    setTimeout(() => processAudioQueue(), 200);
                };
                src.start(0);
                return;
            } catch (decodeErr) {
                harfDebug('WebAudio decode failed, falling back to HTMLAudio', decodeErr);
            }

            const mime = detectAudioMimeFromTextToSpeech();
            const blob = new Blob([audioArrayBuffer], { type: mime });
            const url = URL.createObjectURL(blob);
            htmlAudioUrlRef.current = url;

            const audio = new Audio();
            htmlAudioRef.current = audio;
            audio.preload = 'auto';
            audio.src = url;
            audio.onended = () => {
                try { URL.revokeObjectURL(url); } catch (_) {}
                if (htmlAudioUrlRef.current === url) htmlAudioUrlRef.current = null;
                if (htmlAudioRef.current === audio) htmlAudioRef.current = null;
                try { if (onEnd) onEnd(); } catch (_) {}
                isProcessingQueueRef.current = false;
                setIsPlaying(false);
                setTimeout(() => processAudioQueue(), 200);
            };
            audio.onerror = () => {
                try { URL.revokeObjectURL(url); } catch (_) {}
                if (htmlAudioUrlRef.current === url) htmlAudioUrlRef.current = null;
                if (htmlAudioRef.current === audio) htmlAudioRef.current = null;
                isProcessingQueueRef.current = false;
                setIsPlaying(false);
                setTimeout(() => processAudioQueue(), 200);
            };

            try {
                await audio.play();
            } catch (playErr) {
                console.error('❌ HTMLAudio play blocked/failed:', playErr);
                // unblock queue
                try { URL.revokeObjectURL(url); } catch (_) {}
                if (htmlAudioUrlRef.current === url) htmlAudioUrlRef.current = null;
                if (htmlAudioRef.current === audio) htmlAudioRef.current = null;
                isProcessingQueueRef.current = false;
                setIsPlaying(false);
                setTimeout(() => processAudioQueue(), 200);
            }

        } catch (error) {
            console.error('❌ TTS error:', error?.message || error);

            // Browser TTS fallback intentionally disabled.
            // Backend TTS ishlamasa, brauzer TTS ishlamasin.
            try {
                if (onStart) onStart();
                if (onEnd) onEnd();
            } catch (_) {}

            isProcessingQueueRef.current = false;
            setIsPlaying(false);
            // Queue'ni bloklab qo'ymaslik uchun keyingisini davom ettiramiz (jim)
            setTimeout(() => processAudioQueue(), 300);
        }
    }, [ensureSpeechConfig, hardStopTts]);

    const speakText = useCallback((text, onStart, onEnd) => {
        harfDebug('➕ Adding to queue:', text);
        audioQueueRef.current.push({ 
            text: normalizeUzForTTS(text), 
            onStart, 
            onEnd 
        });
        harfDebug('📊 Queue size after add:', audioQueueRef.current.length);
        if (!isProcessingQueueRef.current) {
            harfDebug('▶️ Starting queue processing...');
            processAudioQueue();
        } else {
            harfDebug('⏸️ Queue already processing, waiting...');
        }
    }, [processAudioQueue]);

    // --- Main sequence ---
    const startReadingSequence = useCallback(() => {
        if (!card) return;

        harfDebug('🎬 Starting reading sequence for:', card.label);
        setModalState('reading');
        audioQueueRef.current = [];
        isProcessingQueueRef.current = false;
        
        const parts = (card.label || '').split(' ');
        const smallLetter = (parts.length > 1 ? parts[1] : parts[0]);
        const letterPronunciation = getLetterPronunciation(smallLetter);

        harfDebug('🎵 TTS Queue: Starting with letter:', letterPronunciation);
        
        speakText(`${letterPronunciation}`, () => setCurrentIndex(-1));

        if (!card.examples || card.examples.length === 0) {
            harfWarn('⚠️ No examples found in card!');
            return;
        }

        card.examples.forEach((example, index) => {
            harfDebug(`🎵 TTS Queue: Adding example ${index + 1}:`, example);
            speakText(example,
                () => {
                    harfDebug(`▶️ Playing example ${index + 1}:`, example);
                    setCurrentIndex(index);
                },
                index === card.examples.length - 1 ? () => {
                    harfDebug('✅ All examples completed, asking question');
                    setCurrentIndex(-1);
                    const question = getQuestionText(smallLetter);
                    harfDebug('❓ Question:', question);
                    speakText(question, null, () => {
                        harfDebug('🎤 Ready for answer');
                        setIsPlaying(false);
                        setModalState('asking');
                        try { onAskStateChangeRef.current?.(false); } catch (_) {}
                    });
                } : null
            );
        });

        harfDebug('📋 Total items in queue:', audioQueueRef.current.length);
    }, [card, speakText]);

    // --- Effects ---
    useEffect(() => {
        if (isOpen && card) {
            harfDebug('🎬 Modal opened with card:', card.label);
            // Reset states first
            setModalState('initial');
            setAiResponse('');
            setChildTranscript('');
            setIsPlaying(false);
            setCurrentIndex(-1);
            setEarnedStars(0);
            audioQueueRef.current = [];
            isProcessingQueueRef.current = false;
            setChildTranscript('');
            setSttError('');
            setIsListening(false);
            lastHandledTranscriptKeyRef.current = null;
            // Warm up speech config in background (faster mic start)
            ensureSpeechConfig();
            
            // Start sequence after a brief delay
            const timer = setTimeout(() => {
                startReadingSequence();
            }, 100);
            
            return () => clearTimeout(timer);
        }
        
        if (!isOpen) {
            audioQueueRef.current = [];
            isProcessingQueueRef.current = false;
            setModalState('initial');
            setAiResponse('');
            setChildTranscript('');
            setIsPlaying(false);
            setCurrentIndex(-1);
            setEarnedStars(0);
            stopRecognizer();
            hardStopTts();
            try { onAskStateChangeRef.current?.(false); } catch (_) {}
            lastHandledTranscriptKeyRef.current = null;
        }
    }, [isOpen, card?.label, ensureSpeechConfig, stopRecognizer, hardStopTts]);

    // Unmount cleanup
    useEffect(() => {
        return () => {
            stopRecognizer();
            hardStopTts();
        };
    }, [stopRecognizer, hardStopTts]);

    // --- Transcript processing ---
    useEffect(() => {
        const incoming = childTranscript || externalTranscript;
        if (modalState === 'asking' && incoming) {
            const transcript = incoming.trim();
            const key = `${card?.label || ''}::${transcript}`;
            if (lastHandledTranscriptKeyRef.current === key) {
                return;
            }
            lastHandledTranscriptKeyRef.current = key;

            const partsForTarget = (card?.label || '').split(' ');
            const targetLetter = (partsForTarget.length > 1 ? partsForTarget[1] : partsForTarget[0]).toLowerCase();
            
            if (!targetLetter || !transcript) return;

            const words = transcript
                .split(/[\s,.;:!?]+/)
                .map(w => w.trim())
                .filter(Boolean);

            let isCorrect = false;
            const letterPronunciation = getLetterPronunciation(targetLetter);

            if (targetLetter === 'ng') {
                isCorrect = words.some(hasNg);
            } else if (targetLetter === "'") {
                isCorrect = words.some(hasApostrophe);
            } else {
                isCorrect = words.some(w => w[0]?.toLowerCase() === targetLetter);
            }

            const stars = isCorrect ? 3 : 1;
            setEarnedStars(stars);
            
            // Save stars to localStorage
            if (stars > 0) {
                try {
                    const currentTotal = parseInt(localStorage.getItem('harfModal_totalStars') || '0');
                    localStorage.setItem('harfModal_totalStars', String(currentTotal + stars));
                    
                    const history = JSON.parse(localStorage.getItem('harfModal_starsHistory') || '[]');
                    history.push({
                        letter: card?.label || 'unknown',
                        stars: stars,
                        timestamp: new Date().toISOString()
                    });
                    localStorage.setItem('harfModal_starsHistory', JSON.stringify(history));
                } catch (error) {
                    console.error('Error saving stars to localStorage:', error);
                }
            }

            let responseText = '';
            if (isCorrect) {
                responseText = 'Barakalla!';
            } else if (targetLetter === 'ng') {
                responseText = "Qayta urinib ko'ring: 'ng' bor so'z ayting.";
            } else if (targetLetter === "'") {
                responseText = "Qayta urinib ko'ring: tutuq belgisi (') bor so'z ayting.";
            } else {
                responseText = `Qayta urinib ko'ring: ${letterPronunciation} bilan boshlanadigan so'z ayting.`;
            }

            setAiResponse(responseText);
            speakText(responseText, null, () => {
                setModalState('asking');
                try { onAskStateChangeRef.current?.(false); } catch (_) {}
                try { onTranscriptConsumedRef.current?.(); } catch (_) {}
            });
        }
    }, [childTranscript, externalTranscript, modalState, card, speakText]);

    if (!isOpen || !card) return null;

    return (
        <div className="harf-modal" onClick={onClose}>
            <div className="harf-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="harf-modal-close" onClick={onClose}>
                    <X size={24} />
                </button>
                
                <div className="harf-modal-letters">
                    {(() => {
                        const p = (card.label || '').split(' ');
                        const big = p.length > 1 ? p[0] : p[0];
                        const small = p.length > 1 ? p[1] : p[0];
                        return (
                            <>
                                <div className="big-letter">{big}</div>
                                <div className="small-letter">{small}</div>
                            </>
                        );
                    })()}
                </div>

                <div className="audio-controls">
                    <button 
                        className="reread-button" 
                        onClick={startReadingSequence} 
                        disabled={isPlaying}
                        title={isPlaying ? 'Tinglanmoqda' : 'Qayta tinglash'}
                    >
                        {isPlaying ? <Volume2 size={20} /> : <RotateCcw size={20} />}
                    </button>
                </div>

                <div className="harf-examples-container">
                    {[0, 1].map(row => (
                        <div className="harf-examples-row" key={row}>
                            {card.examples.slice(row * 2, row * 2 + 2).map((example, idx) => {
                                const index = row * 2 + idx;
                                return (
                                    <div 
                                        key={index}
                                        className={`example-card ${currentIndex === index && isPlaying ? 'active' : ''}`}
                                        onClick={() => { if (!isPlaying) speakText(example); }}
                                    >
                                        <div className="example-emoji">
                                            {(() => {
                                                const ex = card.exampleImages[index];
                                                if (typeof ex === 'string' && (ex.startsWith('/') || ex.startsWith('http'))) {
                                                    return (
                                                        <img 
                                                            src={ex} 
                                                            alt="" 
                                                            style={{ width: 48, height: 48, objectFit: 'contain' }} 
                                                        />
                                                    );
                                                }
                                                return <span style={{ fontSize: 32 }}>{ex}</span>;
                                            })()}
                                        </div>
                                        <div className="example-text">{example}</div>
                                        {currentIndex === index && isPlaying && (
                                            <div className="playing-indicator"><Volume2 size={16} /></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="ai-interaction-section">
                    {earnedStars > 0 && (
                        <div className="stars-earned" style={{ fontSize: '48px', margin: '10px 0' }}>
                            {[...Array(earnedStars)].map((_, i) => (
                                <span key={i}>⭐</span>
                            ))}
                        </div>
                    )}
                    
                    <div className="assistant-inline">
                        <button
                            type="button"
                            onClick={startListeningOnce}
                            disabled={modalState !== 'asking' || isListening}
                            className="reread-button"
                            title={isListening ? "Eshitilmoqda" : "Gapirish"}
                        >
                            <Mic size={20} />
                        </button>
                    </div>
                    
                    {modalState === 'asking' && (
                        <div className="complete-row">
                            <button 
                                className="complete-button" 
                                onClick={() => { 
                                    if (onComplete) onComplete(); 
                                }}
                            >
                                <Check size={18} /> Tayyor
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HarfModal;