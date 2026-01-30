/* eslint-disable react-hooks/exhaustive-deps */
// eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import axios from 'axios';
import "./HarfrModal.css";
import VoiceAssistant from "../components/VoiceAssistant";

const HarfrModal = ({ isOpen, onClose, card, externalTranscript, onAskStateChange, onTranscriptConsumed, onComplete }) => {
    const [modalState, setModalState] = useState('initial');
    const [aiResponse, setAiResponse] = useState('');
    const [childTranscript, setChildTranscript] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [earnedStars, setEarnedStars] = useState(0);

    const audioQueueRef = useRef([]);
    const isProcessingQueueRef = useRef(false);
    const audioContextRef = useRef(null);

    // Функция для чтения русского текста с правильным произношением
    function readRussianText(text) {
        if (!text) return text;
        
        // Замены для правильного произношения букв
        const replacements = {
            'а': 'а', 'б': 'бэ', 'в': 'вэ', 'г': 'гэ', 'д': 'дэ',
            'е': 'йе', 'ё': 'йо', 'ж': 'жэ', 'з': 'зэ', 'и': 'и',
            'й': 'и краткое', 'к': 'ка', 'л': 'эль', 'м': 'эм', 'н': 'эн',
            'о': 'о', 'п': 'пэ', 'р': 'эр', 'с': 'эс', 'т': 'тэ',
            'у': 'у', 'ф': 'эф', 'х': 'ха', 'ц': 'цэ', 'ч': 'че',
            'ш': 'ша', 'щ': 'ща', 'ъ': 'твёрдый знак', 'ы': 'ы',
            'ь': 'мягкий знак', 'э': 'э', 'ю': 'ю', 'я': 'я'
        };
        
        let result = '';
        for (let char of text.toLowerCase()) {
            if (replacements[char]) {
                result += replacements[char] + ' ';
            } else {
                result += char;
            }
        }
        return result.trim();
    }

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
        // Для ъ, ь, ы — особая формулировка
        if (['ъ', 'ь', 'ы'].includes(l)) {
            return `Назови слово, в котором участвует ${l}.`;
        }
        // В остальных случаях — начинается на букву
        return `Назови слово, которое начинается на букву ${l}.`;
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
    function detectAudioMime(arrayBuffer) {
        try {
            const bytes = new Uint8Array(arrayBuffer.slice(0, 12));
            const str4 = (i) => String.fromCharCode(bytes[i], bytes[i+1], bytes[i+2], bytes[i+3]);
            if (str4(0) === 'RIFF' && str4(8) === 'WAVE') return 'audio/wav';
            if (str4(0) === 'OggS') return 'audio/ogg';
            // MP3: ID3 tag or MPEG frame sync (0xFF 0xFB)
            if (str4(0) === 'ID3' || (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)) return 'audio/mpeg';
            return 'audio/wav';
        } catch { return 'audio/wav'; }
    }

    // Обработка аудио очереди
    async function processAudioQueue() {
        if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) {
            return;
        }
        isProcessingQueueRef.current = true;
        setIsPlaying(true);

        let { text, onStart, onEnd } = audioQueueRef.current.shift();
        
        // Нормализуем русский текст для TTS
        text = normalizeRussianForTTS(text);

        try {
            const RHARF_API_BASE = import.meta.env.VITE_RHARF_API_BASE || 'http://localhost:8000/r';
            
            if (!RHARF_API_BASE) {
                throw new Error('Базовый URL API не настроен. Установите VITE_HARF_API_BASE в frontend/.env');
            }
            
            const response = await axios.post(
                `${RHARF_API_BASE}/text-to-speech`,
                { 
                    text: text,
                    language: 'ru-RU'
                },
                { 
                    responseType: 'arraybuffer', 
                    timeout: 10000, 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'audio/wav, audio/mpeg, audio/ogg' 
                    } 
                }
            );
            
            const arrayBuffer = response.data;

            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume().catch(() => { return; });
            }

            try {
                const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);

                if (onStart) onStart();

                source.onended = () => {
                    console.log('🎵 [HarfrModal] Audio ended, waiting 300ms before next');
                    if (onEnd) onEnd();
                    isProcessingQueueRef.current = false;
                    setTimeout(() => processAudioQueue(), 300);
                };
                source.start(0);
            } catch (decodeErr) {
                console.debug('Ошибка декодирования WebAudio, используем fallback <audio>');
                try {
                    const mime = detectAudioMime(arrayBuffer);
                    const blob = new Blob([arrayBuffer], { type: mime });
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio();
                    audio.preload = 'auto';
                    audio.src = url;
                    
                    if (onStart) onStart();
                    
                    const cleanup = () => { 
                        try { URL.revokeObjectURL(url); } catch { /* noop */ } 
                    };
                    
                    audio.addEventListener('ended', () => {
                        console.log('🎵 [HarfrModal] Audio ended (HTML5), waiting 300ms before next');
                        cleanup();
                        if (onEnd) onEnd();
                        isProcessingQueueRef.current = false;
                        setTimeout(() => processAudioQueue(), 300);
                    });
                    
                    audio.addEventListener('error', () => {
                        console.error('🎵 [HarfrModal] Audio error, waiting 300ms before next');
                        cleanup();
                        isProcessingQueueRef.current = false;
                        setTimeout(() => processAudioQueue(), 300);
                    });
                    
                    await new Promise((resolve) => {
                        const onReady = () => { 
                            audio.removeEventListener('canplaythrough', onReady); 
                            resolve(); 
                        };
                        audio.addEventListener('canplaythrough', onReady);
                        try { audio.load(); } catch { /* noop */ }
                    });
                    
                    await audio.play();
                } catch (htmlErr) {
                    console.error('🎵 [HarfrModal] HTML audio playback error:', htmlErr);
                    isProcessingQueueRef.current = false;
                    setTimeout(() => processAudioQueue(), 300);
                }
            }

        } catch (error) {
            console.error('🎵 [HarfrModal] TTS synthesis error:', error);
            isProcessingQueueRef.current = false;
            setTimeout(() => processAudioQueue(), 300);
        }
    }

    const speakText = useCallback((text, onStart, onEnd) => {
        audioQueueRef.current.push({ 
            text: text, 
            onStart, 
            onEnd 
        });
        
        if (!isProcessingQueueRef.current) {
            processAudioQueue();
        }
    }, []);

    // Основная последовательность чтения
    const startReadingSequence = useCallback(() => {
        if (!card) return;

        console.log('🔵 [HarfrModal] Starting reading sequence for:', card);
        setModalState('reading');
        audioQueueRef.current = [];
        
        const parts = (card.label || '').split(' ');
        const smallLetter = (parts.length > 1 ? parts[1] : parts[0]);
        const letterPronunciation = getLetterPronunciation(smallLetter);

        console.log('🎵 TTS Queue (ru): Starting with letter:', smallLetter, 'pronunciation:', readRussianText(smallLetter));
        
        // Произносим букву
        speakText(
            readRussianText(smallLetter), 
            () => setCurrentIndex(-1)
        );

        console.log('🔵 [HarfrModal] Examples array:', card.examples);
        console.log('🔵 [HarfrModal] Examples count:', card.examples?.length || 0);

        // Произносим примеры
        card.examples.forEach((example, index) => {
            console.log(`🎵 TTS Queue (ru): Adding example ${index + 1}:`, example);
            speakText(
                example,
                () => {
                    console.log(`▶️ [HarfrModal] Playing example ${index + 1}:`, example);
                    setCurrentIndex(index);
                },
                index === card.examples.length - 1 ? () => {
                    console.log('✅ [HarfrModal] All examples completed, asking question');
                    setCurrentIndex(-1);
                    const question = getQuestionText(smallLetter);
                    console.log('❓ [HarfrModal] Question:', question);
                    speakText(question, null, () => {
                        console.log('✅ [HarfrModal] Question completed, switching to asking mode');
                        setIsPlaying(false);
                        setModalState('asking');
                        if (onAskStateChange) onAskStateChange(true, smallLetter);
                    });
                } : null
            );
        });
        
        console.log('📋 [HarfrModal] Total items in queue:', audioQueueRef.current.length);
    }, [card, speakText, onAskStateChange]);

    // Эффекты
    useEffect(() => {
        if (isOpen && card) {
            // Подготавливаем AudioContext
            try {
                if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume().catch(() => { /* noop */ });
                }
            } catch { /* noop */ }

            startReadingSequence();
            return () => {};
        }
        
        if (!isOpen) {
            audioQueueRef.current = [];
            isProcessingQueueRef.current = false;
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            
            setTimeout(() => {
                setModalState('initial');
                setAiResponse('');
                setChildTranscript('');
                setIsPlaying(false);
                setCurrentIndex(-1);
                setEarnedStars(0);
                if (onAskStateChange) onAskStateChange(false);
            }, 0);
        }
    }, [isOpen, card?.label]);

    // Обработка транскрипции
    useEffect(() => {
        const incoming = childTranscript || externalTranscript;
        if (modalState === 'asking' && incoming) {
            const transcript = incoming.trim();
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
                        letter: targetLetter || 'unknown',
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
                if (onAskStateChange) onAskStateChange(true, targetLetter);
                setChildTranscript('');
                if (onTranscriptConsumed) {
                    try { onTranscriptConsumed(); } catch { /* noop */ }
                }
            });
        }
    }, [childTranscript, externalTranscript, modalState, card, onAskStateChange, onTranscriptConsumed, speakText]);

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
                    >
                        🔄 Повторить
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
                                        {currentIndex === index && isPlaying && <div className="playing-indicator">🔊</div>}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="ai-interaction-section">
                    <h4 className="ai-title">Вопрос/Ответ</h4>
                    <div className="ai-response-box">
                        {modalState === 'asking' && (() => {
                            const p = (card.label || '').split(' ');
                            const s = p.length > 1 ? p[1] : p[0];
                            const q = getQuestionText(s);
                            return <p>{q}</p>;
                        })()}
                    </div>
                    
                    {childTranscript && (
                        <div className="child-transcript-box">
                            <p><b>Ребёнок:</b> <i>{childTranscript}</i></p>
                        </div>
                    )}
                    
                    {aiResponse && (
                        <div className="ai-response-box">
                            <p>{aiResponse}</p>
                            {earnedStars > 0 && (
                                <div className="stars-earned" style={{ marginTop: '10px', fontSize: '24px' }}>
                                    {[...Array(earnedStars)].map((_, i) => <span key={i}>⭐</span>)}
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="assistant-inline">
                        <VoiceAssistant
                            enabled={modalState === 'asking'}
                            onTranscript={(t) => setChildTranscript(t)}
                            language="ru-RU"
                            apiBase={import.meta.env.VITE_RHARF_API_BASE || 'http://localhost:8000/r'}
                        />
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
                                ✔️ Готово
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HarfrModal;