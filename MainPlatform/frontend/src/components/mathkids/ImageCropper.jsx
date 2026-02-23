import React, { useState, useRef, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_MATH_API_URL
  ? import.meta.env.VITE_MATH_API_URL
  : (import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/mathkids`
    : "/api/v1/mathkids");

function ImageCropper({ onTextExtracted }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const cropContainerRef = useRef(null);

  // Video streamni sozlash
  useEffect(() => {
    if (stream && videoRef.current) {
      try {
        videoRef.current.srcObject = stream;
      } catch (e) {
        console.warn('Video stream sozlanmadi', e);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Boshlang'ich crop o'rnatish
  useEffect(() => {
    if (imageSrc && imgRef.current && crop.width === 0) {
      const img = imgRef.current;
      const rect = img.getBoundingClientRect();
      setCrop({
        x: rect.width * 0.05,
        y: rect.height * 0.1,
        width: rect.width * 0.9,
        height: rect.height * 0.3
      });
    }
  }, [imageSrc]);

  // Rasm yuklash
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result);
        setShowCamera(false);
        setRotation(0);
        setCrop({ x: 0, y: 0, width: 0, height: 0 });
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Rasmni chapga aylantirish
  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  // Rasmni o'ngga aylantirish
  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Kamerani to'liq ekranda ochish
  const handleOpenCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Kamera qo'llab-quvvatlanmaydi (browser mediaDevices yo'q).");
        return;
      }

      if (!window.isSecureContext) {
        alert("Kameradan foydalanish uchun xavfsiz kontekst (HTTPS yoki localhost) kerak.");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      setImageSrc(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Kamera ochishda xato:', err);
      const errorName = err?.name;
      if (errorName === 'NotAllowedError') {
        alert("Kamera ruxsati berilmadi yoki yopib yuborildi. Browser sozlamalaridan kameraga ruxsat bering (lock ikonka → Camera → Allow).\nAgar oldin 'Block' qilgan bo'lsangiz, sahifani qayta yuklang.");
      } else if (errorName === 'NotFoundError') {
        alert("Kamera topilmadi. Qurilmada kamera borligini tekshiring.");
      } else if (errorName === 'NotReadableError') {
        alert("Kamerani ishga tushirib bo'lmadi. Boshqa ilova kameradan foydalanmayotganini tekshiring.");
      } else {
        alert("Kamera ochib bo'lmadi. Iltimos, ruxsat va qurilma sozlamalarini tekshiring.");
      }
    }
  };

  // Rasmga olish
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg');
    setImageSrc(imageData);
    handleCloseCamera();
    setRotation(0);
  };

  // Kamerani yopish
  const handleCloseCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setShowCamera(false);
  };

  // Rasm yuklanganda avtomatik masala o'qish
  useEffect(() => {
    if (imageSrc) {
      handleExtractProblem();
    }
  }, [imageSrc]);
  const handleExtractProblem = async () => {
    if (!imageSrc) {
      return;
    }

    setLoading(true);

    try {
      // Base64 stringni Blob ga o'tkazish
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');

      const res = await fetch(`${API_BASE_URL}/image/read`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server xatosi: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success && data.text) {
        if (onTextExtracted) {
          onTextExtracted(data.text);
        }
      } else {
        console.error('Masala o\'qish xatosi:', data.error);
      }
    } catch (err) {
      console.error('Xato:', err);
      alert("Serverga ulanib bo'lmadi. Agar localhostda ishlayotgan bo'lsangiz, API manzilini '/api/v1' orqali (Vite proxy) ishlatish kerak.");
    } finally {
      setLoading(false);
    }
  };

  // Rasmni reset qilish
  const handleResetImage = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0, width: 0, height: 0 });
    setRotation(0);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setShowCamera(false);
  };

  return (
    <div>
      {/* Asosiy tugmalar */}
      {!showCamera && (
        <div className="flex flex-row flex-nowrap gap-4 justify-center mb-6">
          <button 
            onClick={handleOpenCamera}
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
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
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
            ✕
          </button>

          {/* Suratga olish tugmasi - pastda markazda */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center" style={{ paddingBottom: '110px' }}>
            <button 
              onClick={handleCapture}
              className="w-20 h-20 bg-gradient-to-r from-green-400 to-cyan-400 text-white text-3xl rounded-full shadow-2xl hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
            >
              ⏺
            </button>
          </div>
        </div>
      )}

   
      {imageSrc && !showCamera && (
        <div className="space-y-5 pb-20">
                    
          {/* Loading holati */}
          {loading && (
            <div className="text-center mt-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="text-gray-600 mt-4 text-lg">🔄 Matn aniqlanmoqda...</p>
            </div>
          )}
          
          {/* Tugmalar paneli */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={handleResetImage}
              className="px-8 py-3 bg-white text-purple-600 border-2 border-purple-600 font-bold rounded-xl shadow-md hover:bg-purple-600 hover:text-white transform hover:-translate-y-1 transition-all duration-300"
            >
              🔄 Yangidan boshlash
            </button>
          </div>
        </div>
      )}

      {/* Yashirin canvaslar */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={captureCanvasRef} className="hidden" />
    </div>
  );
}

export default ImageCropper;
