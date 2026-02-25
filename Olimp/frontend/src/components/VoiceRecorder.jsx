import { useState, useRef, useEffect } from 'react';

export default function VoiceRecorder({
    onRecordingComplete,
    onError,
    disabled = false,
    className = ""
}) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [uploading, setUploading] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(100); // Collect data every 100ms
            setIsRecording(true);
            setRecordingTime(0);

            // Timer
            timerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);

        } catch (err) {
            console.error('Microphone error:', err);
            onError?.('Mikrofonga kirish mumkin emas. Iltimos, ruxsat bering.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const handleUpload = async () => {
        if (!audioBlob) return;

        setUploading(true);
        try {
            await onRecordingComplete(audioBlob, recordingTime);
        } catch (err) {
            onError?.(err.message || 'Yuklashda xatolik');
        } finally {
            setUploading(false);
        }
    };

    const resetRecording = () => {
        setAudioBlob(null);
        setRecordingTime(0);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Recording state
    if (isRecording) {
        return (
            <div className={`flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl ${className}`}>
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 font-mono text-xl font-bold">
                        {formatTime(recordingTime)}
                    </span>
                </div>
                <button
                    onClick={stopRecording}
                    disabled={disabled}
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                    🛑 Stop
                </button>
            </div>
        );
    }

    // Audio recorded, ready to upload
    if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);

        return (
            <div className={`space-y-3 ${className}`}>
                {/* Audio player */}
                <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                    <audio
                        src={audioUrl}
                        controls
                        className="w-full h-10"
                        onLoadedMetadata={(e) => {
                            // Check if duration is close to recording time
                        }}
                    />
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                    <button
                        onClick={handleUpload}
                        disabled={uploading || disabled}
                        className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all"
                    >
                        {uploading ? "Yuklanmoqda..." : "✅ Yuborish"}
                    </button>
                    <button
                        onClick={resetRecording}
                        disabled={uploading || disabled}
                        className="px-4 py-3 bg-gray-700 text-gray-300 font-bold rounded-xl hover:bg-gray-600 disabled:opacity-50 transition-all"
                    >
                        🔄
                    </button>
                </div>
            </div>
        );
    }

    // Initial state - show record button
    return (
        <button
            onClick={startRecording}
            disabled={disabled}
            className={`w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white text-lg font-bold rounded-2xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/20 active:scale-95 ${className}`}
        >
            🎤 Ovoz yozib olish
        </button>
    );
}
