import React, { useEffect, useRef, useState } from "react";
import StoryReader from "./StoryReader"; 



export default function SmartReaderTTS() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [age, setAge] = useState(7);
  
  const API_BASE_URL = import.meta.env.VITE_SMART_API_URL || 
    (import.meta.env.VITE_API_URL 
      ? `${import.meta.env.VITE_API_URL}/smartkids`
      : "/api/v1/smartkids");
  
  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [showCamera, stream]);
  
  const openCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(s);
      setShowCamera(true);
    } catch (err) {
      console.error("Camera error:", err);
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(s);
        setShowCamera(true);
      } catch (fallbackErr) {
        console.error("Fallback camera error:", fallbackErr);
        alert("Kamera ochilmadi. Ruxsatlarni tekshiring va qayta urinib ko'ring.");
      }
    }
  };
  
  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleCloseCamera = closeCamera;
  
  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) {
        console.error("Failed to create blob from canvas");
        alert("Rasm yaratishda xatolik. Qayta urinib ko'ring.");
        return;
      }
      
      setPreview(URL.createObjectURL(blob));
      sendToServer(blob, "image");
      closeCamera();
    }, "image/jpeg", 0.8);
  };
  
  const handleCapture = capturePhoto;
  
  const sendToServer = async (file, type = "file") => {
    setLoading(true);
    setText("");
  
    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = type === "image"
        ? `${API_BASE_URL}/image/read`
        : `${API_BASE_URL}/file/read`;

      console.log("Sending to:", endpoint);
      
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server xatosi: ${res.status}`);
      }
      
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setText(data.text || data.result || data.content || JSON.stringify(data));
      }
    } catch (err) {
      console.error("Xato:", err);
      alert(`Server bilan xatolik: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("Fayl hajmi juda katta. Iltimos, 50MB dan kichik fayl tanlang.");
      return;
    }

    setPreview(URL.createObjectURL(file));

    const ext = file.name.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
      sendToServer(file, "image");
    } else if (["pdf", "doc", "docx", "txt"].includes(ext)) {
      sendToServer(file, "file");
    } else {
      alert("Qo'llab-quvvatlanmaydigan fayl formati. Rasm, PDF yoki Word fayl yuklang.");
    }
  };
  
  const openFile = () => {
    inputRef.current.click();
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-4xl font-bold text-center mb-8 text-blue-600 leading-tight">
          📘 AI bilan kitob o'qish
        </h2>

        {!showCamera && (
        <div className="flex flex-row flex-nowrap gap-4 justify-center mb-6">
          <button 
            onClick={openCamera}
            aria-label="Kamera"
            title="Kamera"
            className="px-5 py-3 sm:px-8 bg-gradient-to-r from-blue-400 to-cyan-400 text-white text-2xl sm:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <span className="sm:hidden">📷</span>
            <span className="hidden sm:inline">📷 Kamera</span>
          </button>
          <label
            aria-label="Fayl yuklash"
            title="Fayl yuklash"
            className="px-5 py-3 sm:px-8 bg-white text-purple-600 text-2xl sm:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center"
          >
            <span className="sm:hidden">📁</span>
            <span className="hidden sm:inline">📁 Fayl yuklash</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFile}
              className="hidden"
              capture="environment"
            />
          </label>
        </div>
      )}

      {/* To'liq ekran kamera */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="flex-1 w-full h-full object-cover"
          />
          
{/* Yopish tugmasi - tepa ung burchakda */}
    <button 
      onClick={handleCloseCamera}
      className="absolute top-0 right-0 text-white text-lg font-bold rounded-full shadow-lg hover:bg-red-600 transition-all duration-300"
      style={{ paddingTop: '15px', paddingRight: '15px', margin: '15px' }}
    >
      ❌
    </button>

    {/* Suratga olish tugmasi - pastda markazda */}
    <div className="absolute bottom-0 left-0 right-0 flex justify-center" style={{ paddingBottom: '110px' }}>
      <button 
        onClick={handleCapture}
        className="w-20 h-20 bg-gradient-to-r from-green-400 to-cyan-400 text-white text-3xl rounded-full shadow-2xl hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
      >
        📸
      </button>
    </div>
        </div>
      )}

        {loading && (
          <div className="text-center mt-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600 mt-4 text-lg">🔄 Matn aniqlanmoqda...</p>
          </div>
        )}

   

        {text && (
          <div className="mt-8">
            <StoryReader storyText={text} age={age} />
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}