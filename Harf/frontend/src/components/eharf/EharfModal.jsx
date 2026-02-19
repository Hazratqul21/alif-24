/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Volume2, RotateCcw, Mic, Check } from "lucide-react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import "../harf/HarfModal.css";

// Set `VITE_EHARF_DEBUG=1` (or `VITE_HARF_DEBUG=1`) to enable verbose logs.
const EHARF_DEBUG =
  (import.meta.env?.VITE_EHARF_DEBUG || "") === "1" ||
  (import.meta.env?.VITE_HARF_DEBUG || "") === "1";
const eharfDebug = (...args) => {
  if (EHARF_DEBUG) console.debug(...args);
};

const EharfModal = ({ isOpen, onClose, card, externalTranscript, onAskStateChange, onTranscriptConsumed, onComplete }) => {
  const [modalState, setModalState] = useState('initial');
  const [aiResponse, setAiResponse] = useState('');
  const [childTranscript, setChildTranscript] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [earnedStars, setEarnedStars] = useState(0);

  const audioQueueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);

  // TTS
  const synthesizerRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const htmlAudioRef = useRef(null);
  const htmlAudioUrlRef = useRef(null);

  // STT
  const [isListening, setIsListening] = useState(false);
  const [sttError, setSttError] = useState('');
  const speechConfigRef = useRef(null);
  const recognizerRef = useRef(null);
  const speechInitPromiseRef = useRef(null);

  // Keep latest callbacks without effect re-triggers
  const onAskStateChangeRef = useRef(null);
  const onTranscriptConsumedRef = useRef(null);

  // Prevent re-processing the same transcript
  const lastHandledTranscriptKeyRef = useRef(null);

  useEffect(() => {
    onAskStateChangeRef.current = onAskStateChange;
    onTranscriptConsumedRef.current = onTranscriptConsumed;
  }, [onAskStateChange, onTranscriptConsumed]);

  const SMARTKIDS_API_BASE = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/smartkids`
    : "/api/v1/smartkids";

  const SPEECH_TOKEN_ENDPOINT = `${SMARTKIDS_API_BASE}/speech-token`;

  const ensureSpeechConfig = useCallback(async () => {
    if (speechConfigRef.current) return true;

    if (speechInitPromiseRef.current) {
      try {
        await speechInitPromiseRef.current;
      } catch (_) {}
      return !!speechConfigRef.current;
    }

    const initPromise = (async () => {
      const resp = await fetch(SPEECH_TOKEN_ENDPOINT);
      if (!resp.ok) throw new Error(`speech-token failed: ${resp.status}`);
      const data = await resp.json();
      const cfg = SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
      cfg.speechRecognitionLanguage = 'en-US';
      cfg.speechSynthesisVoiceName = 'en-US-AriaNeural';
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
      console.error('❌ [EharfModal] Speech config init failed:', e);
      setSttError("Speech init failed.");
      return false;
    } finally {
      speechInitPromiseRef.current = null;
    }
  }, [SPEECH_TOKEN_ENDPOINT]);

  const hardStopTts = useCallback(() => {
    try {
      if (audioSourceRef.current) {
        try { audioSourceRef.current.onended = null; } catch (_) {}
        try { audioSourceRef.current.stop(0); } catch (_) {}
        try { audioSourceRef.current.disconnect(); } catch (_) {}
      }
    } catch (_) {}
    audioSourceRef.current = null;

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
      if (htmlAudioUrlRef.current) URL.revokeObjectURL(htmlAudioUrlRef.current);
    } catch (_) {}
    htmlAudioUrlRef.current = null;

    const currentSynth = synthesizerRef.current;
    if (currentSynth) {
      try {
        if (typeof currentSynth.stopSpeakingAsync === 'function') {
          currentSynth.stopSpeakingAsync(
            () => { try { currentSynth.close(); } catch (_) {} },
            () => { try { currentSynth.close(); } catch (_) {} }
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
    try { recognizerRef.current?.stopContinuousRecognitionAsync?.(); } catch (_) {}
    try { recognizerRef.current?.close?.(); } catch (_) {}
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
            setSttError("No speech detected. Try again.");
            return;
          }
          setSttError("Speech recognition error.");
        },
        (err) => {
          console.error('❌ [EharfModal] STT error:', err);
          setIsListening(false);
          try { recognizer.close(); } catch (_) {}
          if (recognizerRef.current === recognizer) recognizerRef.current = null;
          setSttError("Microphone/STT error.");
        }
      );
    } catch (e) {
      console.error('❌ [EharfModal] startListeningOnce failed:', e);
      setIsListening(false);
      setSttError("Microphone permission error.");
    }
  }, [ensureSpeechConfig, isListening, modalState]);

  function normalizeEnglishForTTS(text) {
    return (text || '').toString().trim();
  }

  function getQuestionText(letterUpper) {
    const l = (letterUpper || '').toString().trim();
    return `What words do you know that start with the letter ${l}?`;
  }

  const processAudioQueue = useCallback(async () => {
    eharfDebug('processAudioQueue', { len: audioQueueRef.current.length, processing: isProcessingQueueRef.current });

    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;
    setIsPlaying(true);

    let { text, onStart, onEnd } = audioQueueRef.current.shift();
    text = normalizeEnglishForTTS(text);

    try {
      if (onStart) onStart();

      const ok = await ensureSpeechConfig();
      if (!ok || !speechConfigRef.current) throw new Error('Speech config not initialized');

      hardStopTts();

      const pullStream = SpeechSDK.AudioOutputStream.createPullStream();
      const sdkAudioConfig = SpeechSDK.AudioConfig.fromStreamOutput(pullStream);
      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfigRef.current, sdkAudioConfig);
      synthesizerRef.current = synthesizer;

      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="en-US-AriaNeural">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</voice></speak>`;

      const audioArrayBuffer = await new Promise((resolve, reject) => {
        synthesizer.speakSsmlAsync(
          ssml,
          (result) => {
            try { synthesizer.close(); } catch (_) {}
            if (synthesizerRef.current === synthesizer) synthesizerRef.current = null;

            const data = result?.audioData;
            if (!data) return reject(new Error('Empty audioData'));
            if (data instanceof ArrayBuffer) return resolve(data.slice(0));
            if (data?.buffer instanceof ArrayBuffer) return resolve(data.buffer.slice(0));
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
      } catch (_) {
        // fallback
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
        console.error('❌ [EharfModal] HTMLAudio play blocked/failed:', playErr);
        try { URL.revokeObjectURL(url); } catch (_) {}
        if (htmlAudioUrlRef.current === url) htmlAudioUrlRef.current = null;
        if (htmlAudioRef.current === audio) htmlAudioRef.current = null;
        isProcessingQueueRef.current = false;
        setIsPlaying(false);
        setTimeout(() => processAudioQueue(), 200);
      }
    } catch (error) {
      console.error('❌ [EharfModal] TTS error:', error?.message || error);
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
      text: normalizeEnglishForTTS(text),
      onStart,
      onEnd,
    });
    if (!isProcessingQueueRef.current) processAudioQueue();
  }, [processAudioQueue]);

  const startReadingSequence = useCallback(() => {
    if (!card) return;

    setModalState('reading');
    audioQueueRef.current = [];
    isProcessingQueueRef.current = false;

    const parts = (card.label || '').split(' ');
    const bigLetter = (parts[0] || '').trim();

    // Speak just the letter (e.g., "F"), not "Letter F".
    speakText(`${bigLetter}`, () => setCurrentIndex(-1));

    if (!card.examples || card.examples.length === 0) return;

    card.examples.forEach((example, index) => {
      speakText(
        example,
        () => setCurrentIndex(index),
        index === card.examples.length - 1 ? () => {
          setCurrentIndex(-1);
          const q = getQuestionText(bigLetter);
          speakText(q, null, () => {
            setIsPlaying(false);
            setModalState('asking');
            try { onAskStateChangeRef.current?.(false); } catch (_) {}
          });
        } : null
      );
    });
  }, [card, speakText]);

  useEffect(() => {
    if (isOpen && card) {
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

      ensureSpeechConfig();
      const timer = setTimeout(() => startReadingSequence(), 100);
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

  useEffect(() => {
    return () => {
      stopRecognizer();
      hardStopTts();
    };
  }, [stopRecognizer, hardStopTts]);

  useEffect(() => {
    const incoming = childTranscript || externalTranscript;
    if (modalState === 'asking' && incoming && card) {
      const transcript = incoming.trim();
      const key = `${card.label}::${transcript}`;
      if (lastHandledTranscriptKeyRef.current === key) return;
      lastHandledTranscriptKeyRef.current = key;

      const parts = (card.label || '').split(' ');
      const targetUpper = (parts[0] || '').trim();
      const target = targetUpper.toLowerCase();

      const words = transcript
        .split(/[\s,.;:!?]+/)
        .map(w => w.trim())
        .filter(Boolean);

      const isCorrect = words.some(w => (w[0] || '').toLowerCase() === target);
      const stars = isCorrect ? 3 : 1;
      setEarnedStars(stars);

      // Save stars
      try {
        const currentTotal = parseInt(localStorage.getItem('eharfModal_totalStars') || '0');
        localStorage.setItem('eharfModal_totalStars', String(currentTotal + stars));

        const history = JSON.parse(localStorage.getItem('eharfModal_starsHistory') || '[]');
        history.push({
          letter: card.label,
          stars,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem('eharfModal_starsHistory', JSON.stringify(history));
      } catch (_) {}

      const responseText = isCorrect
        ? 'Great job!'
        : `Try again. Say a word that starts with ${targetUpper}.`;

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
            const big = p[0] || '';
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
            title={isPlaying ? 'Playing' : 'Replay'}
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
                      <span style={{ fontSize: 32 }}>{card.exampleImages[index]}</span>
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
              title={isListening ? "Listening" : "Speak"}
            >
              <Mic size={20} />
            </button>
          </div>

          {modalState === 'asking' && (
            <div className="complete-row">
              <button
                className="complete-button"
                onClick={() => { if (onComplete) onComplete(); }}
              >
                <Check size={18} /> Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EharfModal;
