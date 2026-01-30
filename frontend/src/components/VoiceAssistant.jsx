/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { Mic, X } from "lucide-react";
import "./VoiceAssistant.css";

export default function VoiceAssistant({ 
  enabled = true, 
  onTranscript, 
  message = "", 
  forceOpen = false,
  language = "uz-UZ",
  apiBase = ''
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const MAX_RETRIES = 2;
  const recognition = useRef(null);
  const isRunning = useRef(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const stopTimerRef = useRef(null);

  const HARF_API_BASE = apiBase || (import.meta.env.VITE_HARF_API_BASE || '');

  const isRu = String(language).toLowerCase().startsWith('ru');
  const uiText = {
    title: isRu ? 'Голосовой помощник' : 'Ovozli Yordamchi',
    ready: isRu ? 'Готов' : 'Tayyor',
    listening: isRu ? 'Слушаю...' : 'Eshitilmoqda...',
    speakPrompt: isRu ? 'Говорите...' : 'Gapiring...',
    startBtn: isRu ? 'Начать говорить' : 'Gapirishni boshlash',
    stopBtn: isRu ? 'Остановить' : 'To‘xtatish',
    retry: isRu ? 'Повтор: ' : 'Qayta urinilmoqda: ',
    disabledHint: isRu ? 'Микрофон работает только когда задан вопрос.' : 'Mikrofon faqat savол берilganda ishlaydi.',
    browserNotSupported: isRu ? 'Браузер не поддерживает распознавание речи.' : 'Brauzer ovozni tanishni qo‘llab-quvватламaydi.',
    micStartError: isRu ? 'Ошибка запуска распознавания.' : 'Ovozni boshlashда xatolik.',
    micPermissionDenied: isRu ? 'Доступ к микрофону запрещён.' : 'Mikrofon ruxsati rad etildi.',
    noSpeechHeard: isRu ? 'Речь не услышана, повторите...' : 'Ovoz eshitilmadi, yana gapiring...',
    noSpeechFinal: isRu ? 'Речь не найдена. Попробуйте снова.' : 'Ovoz topilmadi. Yana urinib ko‘ring.',
    mediaError: isRu ? 'Ошибка получения микрофона' : 'Mikrofonni olishда xatolik',
    sttBackendFailFallback: isRu ? 'Бэкенд STT не сработал, переключение на браузер STT' : 'Backend STT ishlamadi, braузер STTга o‘tildi',
    sttError: isRu ? 'Ошибка распознавания речи' : 'Ovoz tanishda xatolik',
    noAudioRecorded: isRu ? 'Аудио не записано (0 байт). Попробуйте ещё раз.' : 'Ovoz yozilmadi (0 bayt). Yana urinib ko‘ring.'
  };

  const startBackendRecording = async (baseUrl) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      isRunning.current = true;
      setIsListening(true);
      setTranscript(uiText.speakPrompt);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = async () => {
        await new Promise(r => setTimeout(r, 120));
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (!blob || blob.size === 0) {
          setTranscript(uiText.noAudioRecorded);
          try { stream.getTracks().forEach(t => t.stop()); } catch {}
          isRunning.current = false;
          setIsListening(false);
          return;
        }
        const form = new FormData();
        form.append('file', blob, 'speech.webm');
        try {
          const resp = await axios.post(`${baseUrl}/speech-to-text`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 20000,
          });
          const text = resp?.data?.text || resp?.data?.transcript || '';
          setTranscript(text || '');
          if (text && onTranscript) {
            try { onTranscript(text); } catch (e) { console.error('onTranscript error:', e); }
          }
        } catch (err) {
          const hasBrowserSTT = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
          if (hasBrowserSTT) {
            try {
              const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
              const rec = new SR();
              rec.lang = language || 'uz-UZ';
              rec.continuous = false;
              rec.interimResults = false;
              rec.onresult = (ev) => {
                const t = ev?.results?.[0]?.[0]?.transcript || '';
                setTranscript(t);
                if (t && onTranscript) { try { onTranscript(t); } catch(e){} }
              };
              rec.onerror = () => {
                setTranscript(uiText.sttError);
              };
              rec.onend = () => {};
              rec.start();
              setTranscript(uiText.sttBackendFailFallback);
            } catch {
              setTranscript(uiText.sttError);
            }
          } else {
            setTranscript(uiText.sttError);
          }
        }
        try { stream.getTracks().forEach(t => t.stop()); } catch {}
        isRunning.current = false;
        setIsListening(false);
      };

      recorder.start();
      stopTimerRef.current = setTimeout(() => {
        try {
          if (recorder.state !== 'inactive') {
            if (typeof recorder.requestData === 'function') { try { recorder.requestData(); } catch {} }
            recorder.stop();
          }
        } catch {}
      }, 4000);
    } catch {
      setTranscript(uiText.mediaError);
      isRunning.current = false;
      setIsListening(false);
    }
  };

  const isSupported = !!(
    window.SpeechRecognition || window.webkitSpeechRecognition || HARF_API_BASE
  );

  useEffect(() => {
    if (!isSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.current = new SR();
    recognition.current.lang = language || "uz-UZ";
    recognition.current.continuous = false;
    recognition.current.interimResults = false;

    recognition.current.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      onTranscript?.(text);
    };

    recognition.current.onerror = (event) => {
      isRunning.current = false;
      setIsListening(false);
      if (event.error === "no-speech") {
        if (retryCount < MAX_RETRIES) {
          setRetryCount((c) => c + 1);
          setTranscript(uiText.noSpeechHeard);
          setTimeout(() => startRecognition(), 500);
          return;
        }
        setTranscript(uiText.noSpeechFinal);
        return;
      }
      if (event.error === "not-allowed") {
        setTranscript(uiText.micPermissionDenied);
      }
    };

    recognition.current.onend = () => {
      isRunning.current = false;
      setIsListening(false);
    };
  }, []);

  useEffect(() => {
    if (forceOpen && enabled) {
      setIsDialogOpen(true);
    }
  }, [forceOpen, enabled]);

  useEffect(() => {
    if (message && isDialogOpen) {
      setTranscript(message);
    }
  }, [message, isDialogOpen]);

  const startRecognition = () => {
    if (HARF_API_BASE) {
      startBackendRecording(HARF_API_BASE);
      return;
    }
    if (!recognition.current || isRunning.current) return;
    try {
      isRunning.current = true;
      recognition.current.start();
      setIsListening(true);
      setTranscript(uiText.speakPrompt);
    } catch {
      isRunning.current = false;
      setTranscript(uiText.micStartError);
    }
  };

  const stopRecognition = () => {
    if (recognition.current) {
      try { recognition.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        if (typeof mediaRecorderRef.current.requestData === 'function') {
          try { mediaRecorderRef.current.requestData(); } catch {}
        }
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
    isRunning.current = false;
    setIsListening(false);
  };

  const handleMicClick = () => {
    if (!isSupported) {
      setTranscript(uiText.browserNotSupported);
      setIsDialogOpen(true);
      return;
    }
    setIsDialogOpen(true);
    if (!enabled) {
      setTranscript(uiText.disabledHint);
      return;
    }
    if (isListening) {
      stopRecognition();
      return;
    }
    setRetryCount(0);
    startRecognition();
  };

  const closeDialog = () => {
    stopRecognition();
    setIsDialogOpen(false);
  };

  return (
    <div className="voice-assistant">
      <button 
        onClick={handleMicClick} 
        className={`mic-button ${isListening ? "listening" : ""}`}
      >
        <Mic size={20} color="white" />
        {isListening && (
          <>
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
          </>
        )}
      </button>

      {isDialogOpen && (
        <div className="voice-dialog-overlay">
          <div className="voice-dialog">
            <div className="dialog-header">
              <h3>{uiText.title}</h3>
              <button className="close-button" onClick={closeDialog}>
                <X size={20} color="#666" />
              </button>
            </div>

            <div className="dialog-content">
              <div className="status-indicator">
                <div className={`status-dot ${isListening ? "listening" : "idle"}`}></div>
                <span>{isListening ? uiText.listening : uiText.ready}</span>
              </div>

              {transcript && (
                <div className="transcript-box">
                  {transcript}
                </div>
              )}

              <div className="dialog-controls">
                {!isListening ? (
                  <button className="start-listening-btn" onClick={startRecognition}>
                    <Mic size={16} />
                    {uiText.startBtn}
                  </button>
                ) : (
                  <button className="stop-listening-btn" onClick={stopRecognition}>
                    {uiText.stopBtn}
                  </button>
                )}

                {retryCount > 0 && retryCount <= MAX_RETRIES && (
                  <div className="retry-hint">
                    {uiText.retry}{retryCount}/{MAX_RETRIES}
                  </div>
                )}

                {!enabled && (
                  <div className="disabled-hint">
                    {uiText.disabledHint}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
