/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import axios from 'axios';
import "./HarfModal.css";
import VoiceAssistant from "../components/VoiceAssistant";

const HarfModal = ({ isOpen, onClose, card, externalTranscript, onAskStateChange, onTranscriptConsumed, onComplete }) => {
    const [modalState, setModalState] = useState('initial');
    const [aiResponse, setAiResponse] = useState('');
    const [childTranscript, setChildTranscript] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [earnedStars, setEarnedStars] = useState(0);

    const audioQueueRef = useRef([]);
    const isProcessingQueueRef = useRef(false);
    const audioContextRef = useRef(null);

    // --- API endpoints ---
    const HARF_API_BASE = import.meta.env.VITE_HARF_API_BASE || 
                         import.meta.env.VITE_HARF_API_URL || 
                         'http://localhost:8000/harf';
    
    const TTS_ENDPOINT = `${HARF_API_BASE}/text-to-speech`;
    const STT_ENDPOINT = `${HARF_API_BASE}/speech-to-text`;

    // --- Text normalization ---
    function normalizeUzForTTS(text) {
        if (!text) return text;
        return text
            .replace(/[ʼʻ'`]/g, "'")
            .replace(/gʻ/gi, "g'")
            .replace(/oʻ/gi, "o'")
            .replace(/sh/gi, "sh")
            .replace(/ch/gi, "ch")
            .replace(/ng/gi, "ng");
    }

    function getLetterPronunciation(letter) {
        const pronunciations = {
            "v": "vi",
            "l": "l'",
            "x": "x'",
            "y": "ye",
            "gʻ": "gʻi",
            "oʻ": "oʻ", 
            "sh": "she",
            "ch": "che",
            "ng": "ng",
            "'": "tutuq belgisi"
        };
        return pronunciations[letter.toLowerCase()] || letter;
    }

    function getQuestionText(letter) {
        const pronunciations = {
            "ng": "en gee harf birikmasi",
            "'": "tutuq belgisi",
            "gʻ": "gʻ harfi", 
            "oʻ": "oʻ harfi",
            "sh": "sh harfi",
            "ch": "ch harfi"
        };
        const target = pronunciations[letter.toLowerCase()] || `${letter} harfi`;
        return `Qani aytchi, ${target}dan boshlanadigan qanday soʻzlarni bilasan?`;
    }

    const hasNg = (w) => /ng/i.test(w);
    const hasApostrophe = (w) => /[ʼʻ'`]|gʻ|Gʻ/.test(w);

    // --- TTS function ---
    const processAudioQueue = useCallback(async () => {
        console.log('🔄 processAudioQueue called, queue length:', audioQueueRef.current.length);
        console.log('🔒 isProcessing:', isProcessingQueueRef.current);
        
        if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) {
            console.log('⏸️ Skipping - already processing or queue empty');
            return;
        }
        isProcessingQueueRef.current = true;
        setIsPlaying(true);

        let { text, onStart, onEnd } = audioQueueRef.current.shift();
        text = normalizeUzForTTS(text);

        try {
            console.log('📤 TTS Request to:', TTS_ENDPOINT);
            console.log('📝 Text:', text);

            // 1. Try backend TTS first
            const response = await axios.post(
                TTS_ENDPOINT,
                { 
                    text,
                    language: 'uz-UZ'
                },
                { 
                    responseType: 'blob',
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg'
                    }
                }
            );
            
            console.log('✅ TTS Response status:', response.status);
            console.log('🎵 Queue remaining after this:', audioQueueRef.current.length);
            
            // 2. Play audio from backend
            const audioUrl = URL.createObjectURL(response.data);
            const audio = new Audio(audioUrl);
            
            if (onStart) onStart();
            
            audio.onended = () => {
                console.log('🎵 Audio ended, cleaning up...');
                URL.revokeObjectURL(audioUrl);
                if (onEnd) onEnd();
                isProcessingQueueRef.current = false;
                setIsPlaying(false);
                console.log('⏭️ Processing next in queue...');
                setTimeout(() => processAudioQueue(), 300);
            };
            
            audio.onerror = (error) => {
                console.error('Audio playback error:', error);
                URL.revokeObjectURL(audioUrl);
                isProcessingQueueRef.current = false;
                setIsPlaying(false);
                setTimeout(() => processAudioQueue(), 300);
            };
            
            console.log('▶️ Starting audio playback...');
            await audio.play();
            
        } catch (error) {
            console.error('❌ Backend TTS error:', error.message);
            
            // 3. Fallback to Web Speech API if backend fails
            if ('speechSynthesis' in window) {
                console.log('🔤 Using Web Speech API fallback');
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'uz-UZ';
                utterance.rate = 0.8;
                
                if (onStart) onStart();
                
                utterance.onend = () => {
                    if (onEnd) onEnd();
                    isProcessingQueueRef.current = false;
                    setIsPlaying(false);
                    setTimeout(() => processAudioQueue(), 300);
                };
                
                utterance.onerror = (event) => {
                    console.error('Speech synthesis error:', event);
                    isProcessingQueueRef.current = false;
                    setIsPlaying(false);
                    setTimeout(() => processAudioQueue(), 300);
                };
                
                window.speechSynthesis.speak(utterance);
            } else {
                // No TTS available
                console.warn('⚠️ No TTS available');
                isProcessingQueueRef.current = false;
                setIsPlaying(false);
                setTimeout(() => processAudioQueue(), 300);
            }
        }
    }, [TTS_ENDPOINT]);

    const speakText = useCallback((text, onStart, onEnd) => {
        console.log('➕ Adding to queue:', text);
        audioQueueRef.current.push({ 
            text: normalizeUzForTTS(text), 
            onStart, 
            onEnd 
        });
        console.log('📊 Queue size after add:', audioQueueRef.current.length);
        if (!isProcessingQueueRef.current) {
            console.log('▶️ Starting queue processing...');
            processAudioQueue();
        } else {
            console.log('⏸️ Queue already processing, waiting...');
        }
    }, [processAudioQueue]);

    // --- Main sequence ---
    const startReadingSequence = useCallback(() => {
        if (!card) return;

        console.log('🎬 Starting reading sequence for:', card.label);
        setModalState('reading');
        audioQueueRef.current = [];
        isProcessingQueueRef.current = false;
        
        const parts = (card.label || '').split(' ');
        const smallLetter = (parts.length > 1 ? parts[1] : parts[0]);
        const letterPronunciation = getLetterPronunciation(smallLetter);

        console.log('🎵 TTS Queue: Starting with letter:', letterPronunciation);
        console.log('📦 Card data:', card);
        console.log('📝 Examples array:', card.examples);
        console.log('📊 Examples length:', card.examples?.length);
        
        speakText(`${letterPronunciation}`, () => setCurrentIndex(-1));

        if (!card.examples || card.examples.length === 0) {
            console.warn('⚠️ No examples found in card!');
            return;
        }

        card.examples.forEach((example, index) => {
            console.log(`🎵 TTS Queue: Adding example ${index + 1}:`, example);
            speakText(example,
                () => {
                    console.log(`▶️ Playing example ${index + 1}:`, example);
                    setCurrentIndex(index);
                },
                index === card.examples.length - 1 ? () => {
                    console.log('✅ All examples completed, asking question');
                    setCurrentIndex(-1);
                    const question = getQuestionText(smallLetter);
                    console.log('❓ Question:', question);
                    speakText(question, null, () => {
                        console.log('🎤 Ready for answer');
                        setIsPlaying(false);
                        setModalState('asking');
                        if (onAskStateChange) onAskStateChange(true, smallLetter);
                    });
                } : null
            );
        });
        
        console.log('📋 Total items in queue:', audioQueueRef.current.length);
    }, [card, speakText, onAskStateChange]);

    // --- Effects ---
    useEffect(() => {
        if (isOpen && card) {
            console.log('🎬 Modal opened with card:', card.label);
            // Reset states first
            setModalState('initial');
            setAiResponse('');
            setChildTranscript('');
            setIsPlaying(false);
            setCurrentIndex(-1);
            setEarnedStars(0);
            audioQueueRef.current = [];
            isProcessingQueueRef.current = false;
            
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
            if (onAskStateChange) onAskStateChange(false);
        }
    }, [isOpen, card?.label]);

    // --- Transcript processing ---
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

            // Generate response based on target letter
            if (targetLetter === 'ng') {
                const ngWords = words.filter(hasNg);
                const otherWords = words.filter(w => !hasNg(w));
                correctCount = ngWords.length;
                if (ngWords.length > 0) {
                    responseText += `Barakalla ${ngWords.join(', ')} soʻzlarida en gee bor`;
                }
                if (otherWords.length > 0) {
                    const prefix = ngWords.length > 0 ? ", " : "";
                    responseText += `${prefix}${otherWords.join(', ')} soʻzlarida en gee yoʻq`;
                }
            } else if (targetLetter === "'") {
                const aposWords = words.filter(hasApostrophe);
                const otherWords = words.filter(w => !hasApostrophe(w));
                correctCount = aposWords.length;
                if (aposWords.length > 0) {
                    responseText += `Barakalla ${aposWords.join(', ')} soʻzlarida tutuq belgisi bor`;
                }
                if (otherWords.length > 0) {
                    const prefix = aposWords.length > 0 ? ", " : "";
                    responseText += `${prefix}${otherWords.join(', ')} soʻzlarida tutuq belgisi yoʻq`;
                }
            } else {
                const matches = words.filter(w => w[0]?.toLowerCase() === targetLetter);
                const nonMatches = words.filter(w => w[0]?.toLowerCase() !== targetLetter);
                correctCount = matches.length;
                if (matches.length > 0) {
                    responseText += `Barakalla ${matches.join(', ')} ${letterPronunciation}dan boshlanadi`;
                }
                if (nonMatches.length > 0) {
                    const prefix = matches.length > 0 ? ", " : "";
                    responseText += `${prefix}${nonMatches.join(', ')} esa boshqa harf`;
                }
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

            if (!responseText) {
                if (targetLetter === 'ng') {
                    responseText = `Yaxshi urinding, en gee birikmasi bor soʻz aytib ko'r`;
                } else if (targetLetter === "'") {
                    responseText = `Yaxshi urinding, tutuq belgisi qatnashgan soʻz aytib ko'r`;
                } else {
                    responseText = `Yaxshi urinding, ${letterPronunciation} bilan boshlanadigan soʻz aytib ko'r`;
                }
            }

            setAiResponse(responseText);
            speakText(responseText, null, () => {
                setModalState('asking');
                if (onAskStateChange) onAskStateChange(true, targetLetter);
                setChildTranscript('');
                if (onTranscriptConsumed) {
                    onTranscriptConsumed();
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
                        {isPlaying ? '🔊 Tinglanmoqda...' : '🔄 Qayta tinglash'}
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
                                            <div className="playing-indicator">🔊</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="ai-interaction-section">
                    <h4 className="ai-title">Savol/Javob</h4>
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
                            <p><b>Bola:</b> <i>{childTranscript}</i></p>
                        </div>
                    )}
                    
                    {aiResponse && (
                        <div className="ai-response-box">
                            <p>{aiResponse}</p>
                            {earnedStars > 0 && (
                                <div className="stars-earned" style={{ marginTop: '10px', fontSize: '24px' }}>
                                    {[...Array(earnedStars)].map((_, i) => (
                                        <span key={i}>⭐</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="assistant-inline">
                        <VoiceAssistant
                            enabled={modalState === 'asking'}
                            onTranscript={(t) => setChildTranscript(t)}
                            apiEndpoint={STT_ENDPOINT}
                        />
                    </div>
                    
                    {modalState === 'asking' && (
                        <div className="complete-row">
                            <button 
                                className="complete-button" 
                                onClick={() => { 
                                    if (onComplete) onComplete(); 
                                }}
                            >
                                ✔️ Tayyor
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HarfModal;