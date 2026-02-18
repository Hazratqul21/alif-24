/* eslint-disable react-hooks/exhaustive-deps */
// eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Volume2, RotateCcw, Mic, Check } from "lucide-react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import "./HarfrModal.css";

// Set `VITE_RHARF_DEBUG=1` (or `VITE_HARF_DEBUG=1`) to enable verbose logs.
const RHARF_DEBUG =
    (import.meta.env?.VITE_RHARF_DEBUG || "") === "1" ||
    (import.meta.env?.VITE_HARF_DEBUG || "") === "1";
const rharfLog = (...args) => {
    if (RHARF_DEBUG) console.log(...args);
};
const rharfWarn = (...args) => {
    if (RHARF_DEBUG) console.warn(...args);
};
const rharfDebug = (...args) => {
    if (RHARF_DEBUG) console.debug(...args);
};

const HarfrModal = ({ isOpen, onClose, card, externalTranscript, onAskStateChange, onTranscriptConsumed, onComplete }) => {
    const [modalState, setModalState] = useState('initial');
    const [aiResponse, setAiResponse] = useState('');
    const [childTranscript, setChildTranscript] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [earnedStars, setEarnedStars] = useState(0);

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

    // Prevent re-processing the same transcript
    const lastHandledTranscriptKeyRef = useRef(null);

    const audioQueueRef = useRef([]);
    const isProcessingQueueRef = useRef(false);
    const synthesizerRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioSourceRef = useRef(null);
    const htmlAudioRef = useRef(null);
    const htmlAudioUrlRef = useRef(null);

    useEffect(() => {
        onAskStateChangeRef.current = onAskStateChange;
        onTranscriptConsumedRef.current = onTranscriptConsumed;
    }, [onAskStateChange, onTranscriptConsumed]);

    // --- API endpoints ---
    const SMARTKIDS_API_BASE = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/smartkids`
        : "/api/v1/smartkids";

    const SPEECH_TOKEN_ENDPOINT = `${SMARTKIDS_API_BASE}/speech-token`;

    const ensureSpeechConfig = useCallback(async () => {
        if (speechConfigRef.current) return true;

        if (speechInitPromiseRef.current) {
            try {
                await speechInitPromiseRef.current;
            } catch (_) {
                // ignore
            }
            return !!speechConfigRef.current;
        }

        speechInitInProgressRef.current = true;
        const initPromise = (async () => {
            const resp = await fetch(SPEECH_TOKEN_ENDPOINT);
            if (!resp.ok) throw new Error(`speech-token failed: ${resp.status}`);
            const data = await resp.json();
            const cfg = SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
            cfg.speechRecognitionLanguage = 'ru-RU';
            cfg.speechSynthesisVoiceName = 'ru-RU-SvetlanaNeural';
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
            console.error('❌ [HarfrModal] Speech config init failed:', e);
            setSttError("Не удалось инициализировать распознавание речи.");
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
                        setSttError("Речь не распознана. Попробуйте ещё раз.");
                        return;
                    }
                    setSttError("Ошибка распознавания речи.");
                },
                (err) => {
                    console.error('❌ [HarfrModal] STT recognizeOnceAsync error:', err);
                    setIsListening(false);
                    try { recognizer.close(); } catch (_) {}
                    if (recognizerRef.current === recognizer) recognizerRef.current = null;
                    setSttError("Ошибка микрофона или STT.");
                }
            );
        } catch (e) {
            console.error('❌ [HarfrModal] startListeningOnce failed:', e);
            setIsListening(false);
            setSttError("Не удалось открыть микрофон. Проверьте разрешения.");
        }
    }, [ensureSpeechConfig, isListening, modalState]);

    // Функция для нормализации русского текста для TTS
    function normalizeRussianForTTS(text) {
        try {
            if (!text) return '';
            
            // Заменяем специальные символы и делаем текст читаемым
            let normalized = String(text)
             
            
            return normalized;
        } catch {
            return '';
        }
    }

    // Функция для получения произношения буквы
    function getLetterPronunciation(letter) {
        const l = (letter || '').toLowerCase();
        const map = {
            'а': 'а', 'б': 'бэ', 'в': 'вэ', 'г': 'гэ', 'д': 'дэ',
            'е': 'йе', 'ё': 'йо', 'ж': 'жэ', 'з': 'зэ', 'и': 'и',
            'й': 'и краткое', 'к': 'ка', 'л': 'эль', 'м': 'эм', 'н': 'эн',
            'о': 'о', 'п': 'пэ', 'р': 'эр', 'с': 'эс', 'т': 'тэ',
            'у': 'у', 'ф': 'эф', 'х': 'ха', 'ц': 'цэ', 'ч': 'че',
            'ш': 'ша', 'щ': 'ща', 'ъ': 'твёрдый знак', 'ы': 'ы',
            'ь': 'мягкий знак', 'э': 'э', 'ю': 'ю', 'я': 'я'
        };
        return map[l] || letter;
    }

    // Функция для получения текста вопроса
    function getQuestionText(letter) {
        const l = (letter || '').toLowerCase();
        const spoken = getLetterPronunciation(l);
        // Для ъ, ь, ы — особая формулировка
        if (['ъ', 'ь', 'ы'].includes(l)) {
            return `Назови слово, в котором участвует ${spoken}.`;
        }
        // В остальных случаях — начинается на букву
        return `Назови слово, которое начинается на букву ${spoken}.`;
    }

    // Функция для проверки, начинается ли слово с нужной буквы
    function checkRussianWord(word, targetLetter) {
        if (!word || !targetLetter) return false;
        
        const firstChar = word[0].toLowerCase();
        const target = targetLetter.toLowerCase();
        
        // Особые случаи для русского языка
        if (target === 'е' && ['е', 'ё'].includes(firstChar)) return true;
        if (target === 'ё' && ['е', 'ё'].includes(firstChar)) return true;
        if (target === 'и' && ['и', 'й'].includes(firstChar)) return true;
        // Для ъ, ь, ы требуется участие буквы в слове (не обязательно в начале)
        if (['ъ', 'ь', 'ы'].includes(target)) {
            return word.toLowerCase().includes(target);
        }
        return firstChar === target;
    }

    // Детекция типа аудио
    const processAudioQueue = useCallback(async () => {
        rharfDebug('🔄 [HarfrModal] processAudioQueue', {
            queueLength: audioQueueRef.current.length,
            isProcessing: isProcessingQueueRef.current,
        });

        if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) {
            return;
        }
        isProcessingQueueRef.current = true;
        setIsPlaying(true);

        let { text, onStart, onEnd } = audioQueueRef.current.shift();
        text = normalizeRussianForTTS(text);

        try {
            if (onStart) onStart();

            const ok = await ensureSpeechConfig();
            if (!ok || !speechConfigRef.current) throw new Error('Speech config not initialized');

            hardStopTts();

            rharfLog('📤 [HarfrModal] Azure Speech SDK TTS:', text);

            const pullStream = SpeechSDK.AudioOutputStream.createPullStream();
            const sdkAudioConfig = SpeechSDK.AudioConfig.fromStreamOutput(pullStream);
            const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfigRef.current, sdkAudioConfig);
            synthesizerRef.current = synthesizer;

            const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ru-RU"><voice name="ru-RU-SvetlanaNeural">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</voice></speak>`;

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
                rharfDebug('[HarfrModal] WebAudio decode failed, fallback to HTMLAudio', decodeErr);
            }

            const blob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' });
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
                console.error('❌ [HarfrModal] HTMLAudio play blocked/failed:', playErr);
                try { URL.revokeObjectURL(url); } catch (_) {}
                if (htmlAudioUrlRef.current === url) htmlAudioUrlRef.current = null;
                if (htmlAudioRef.current === audio) htmlAudioRef.current = null;
                isProcessingQueueRef.current = false;
                setIsPlaying(false);
                setTimeout(() => processAudioQueue(), 200);
            }
        } catch (error) {
            console.error('❌ [HarfrModal] TTS error:', error?.message || error);

            try {
                if (onStart) onStart();
                if (onEnd) onEnd();
            } catch (_) {}

            isProcessingQueueRef.current = false;
            setIsPlaying(false);
            setTimeout(() => processAudioQueue(), 300);
        }
    }, [ensureSpeechConfig, hardStopTts]);

    const speakText = useCallback((text, onStart, onEnd) => {
        audioQueueRef.current.push({ 
            text: text, 
            onStart, 
            onEnd 
        });
        
        if (!isProcessingQueueRef.current) {
            processAudioQueue();
        }
    }, [processAudioQueue]);

    // Основная последовательность чтения
    const startReadingSequence = useCallback(() => {
        if (!card) return;

        rharfDebug('🎬 [HarfrModal] Starting reading sequence for:', card?.label);
        setModalState('reading');
        audioQueueRef.current = [];
        isProcessingQueueRef.current = false;
        
        const parts = (card.label || '').split(' ');
        const smallLetter = (parts.length > 1 ? parts[1] : parts[0]);
        const letterPronunciation = getLetterPronunciation(smallLetter);
        
        // Произносим букву
        speakText(
            `${letterPronunciation}`, 
            () => setCurrentIndex(-1)
        );

        if (!card.examples || card.examples.length === 0) {
            rharfWarn('⚠️ [HarfrModal] No examples in card');
            return;
        }

        // Произносим примеры
        card.examples.forEach((example, index) => {
            rharfDebug(`🎵 [HarfrModal] Adding example ${index + 1}:`, example);
            speakText(
                example,
                () => {
                    rharfDebug(`▶️ [HarfrModal] Playing example ${index + 1}:`, example);
                    setCurrentIndex(index);
                },
                index === card.examples.length - 1 ? () => {
                    rharfDebug('✅ [HarfrModal] All examples completed, asking question');
                    setCurrentIndex(-1);
                    const question = getQuestionText(smallLetter);
                    rharfDebug('❓ [HarfrModal] Question:', question);
                    speakText(question, null, () => {
                        rharfDebug('🎤 [HarfrModal] Ready for answer');
                        setIsPlaying(false);
                        setModalState('asking');
                        try { onAskStateChangeRef.current?.(false); } catch (_) {}
                    });
                } : null
            );
        });

        rharfDebug('📋 [HarfrModal] Total items in queue:', audioQueueRef.current.length);
    }, [card, speakText]);

    // Эффекты
    useEffect(() => {
        if (isOpen && card) {
            // Reset states first
            setModalState('initial');
            setAiResponse('');
            setChildTranscript('');
            setIsPlaying(false);
            setCurrentIndex(-1);
            setEarnedStars(0);
            audioQueueRef.current = [];
            isProcessingQueueRef.current = false;
            setSttError('');
            setIsListening(false);
            lastHandledTranscriptKeyRef.current = null;

            // Warm up speech config
            ensureSpeechConfig();

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
    }, [isOpen, card?.label, ensureSpeechConfig, startReadingSequence, stopRecognizer, hardStopTts]);

    // Unmount cleanup
    useEffect(() => {
        return () => {
            stopRecognizer();
            hardStopTts();
        };
    }, [stopRecognizer, hardStopTts]);

    // Обработка транскрипции
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

            let responseText = '';
            const letterPronunciation = getLetterPronunciation(targetLetter);
            let correctCount = 0;
            let totalWords = words.length;

            const matches = words.filter(w => checkRussianWord(w, targetLetter));
            const nonMatches = words.filter(w => !checkRussianWord(w, targetLetter));
            correctCount = matches.length;
            
            if (matches.length > 0) {
                responseText += `Молодец! Слова "${matches.join(', ')}" начинаются на букву ${letterPronunciation}`;
            }
            
            if (nonMatches.length > 0) {
                const prefix = matches.length > 0 ? ". А слова " : "";
                responseText += `${prefix}"${nonMatches.join(', ')}" начинаются на другие буквы`;
            }

            // Yulduzcha hisobini aniqlash
            let stars = 1; // Default: 1 yulduzcha
            if (totalWords > 0) {
                if (correctCount === totalWords) {
                    stars = 3; // Barcha to'g'ri
                } else if (correctCount > 0) {
                    stars = 2; // Qisman to'g'ri
                }
            }
            setEarnedStars(stars);
            
            // Save stars to localStorage
            if (stars > 0) {
                try {
                    const currentTotal = parseInt(localStorage.getItem('harfrModal_totalStars') || '0');
                    localStorage.setItem('harfrModal_totalStars', String(currentTotal + stars));
                    
                    const history = JSON.parse(localStorage.getItem('harfrModal_starsHistory') || '[]');
                    history.push({
                        // IMPORTANT: store by card.label so Harfr.jsx can display stars per card
                        letter: card?.label || 'unknown',
                        stars: stars,
                        timestamp: new Date().toISOString()
                    });
                    localStorage.setItem('harfrModal_starsHistory', JSON.stringify(history));
                } catch (error) {
                    console.error('Error saving stars to localStorage:', error);
                }
            }

            if (!responseText) {
                if (['ъ', 'ь', 'ы'].includes(targetLetter)) {
                    responseText = `Хорошая попытка! Попробуй назвать слово, в котором участвует ${targetLetter}`;
                } else {
                    responseText = `Хорошая попытка! Попробуй назвать слово, которое начинается на букву ${letterPronunciation}`;
                }
            }

            setChildTranscript(transcript);
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
                        title={isPlaying ? 'Воспроизводится' : 'Повторить'}
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
                                        <div className="example-emoji">{card.exampleImages[index]}</div>
                                        <div className="example-text">{example}</div>
                                        {currentIndex === index && isPlaying && <div className="playing-indicator"><Volume2 size={16} /></div>}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="ai-interaction-section">
                    {earnedStars > 0 && (
                        <div className="stars-earned" style={{ fontSize: '48px', margin: '10px 0' }}>
                            {[...Array(earnedStars)].map((_, i) => <span key={i}>⭐</span>)}
                        </div>
                    )}
                    
                    <div className="assistant-inline">
                        <button
                            type="button"
                            onClick={startListeningOnce}
                            disabled={modalState !== 'asking' || isListening}
                            className="reread-button"
                            title={isListening ? "Слушаю" : "Говорить"}
                        >
                            <Mic size={20} />
                        </button>
                    </div>
                    
                    {modalState === 'asking' && (
                        <div className="complete-row">
                            <button 
                                className="complete-button" 
                                onClick={() => { 
                                    try { 
                                        onComplete && onComplete(); 
                                    } catch {}; 
                                }}
                            >
                                <Check size={18} /> Готово
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HarfrModal;