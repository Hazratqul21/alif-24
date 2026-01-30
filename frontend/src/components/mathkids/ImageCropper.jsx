import React, { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './ImageCropper.css';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/v1', '/mathkids') 
  : "http://localhost:8000/api/mathkids";

function ImageCropper({ onTextExtracted }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 90,
    height: 30,
    x: 5,
    y: 10
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);

  // Ensure video element receives the media stream when it's available
  useEffect(() => {
    if (stream && videoRef.current) {
      try {
        videoRef.current.srcObject = stream;
      } catch (e) {
        // Some browsers may throw when assigning; fallback handled by re-render
        console.warn('Could not set video srcObject immediately', e);
      }
    }

    // Cleanup when stream changes or component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Rasm yuklash
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result);
        setShowCamera(false);
        setRotation(0); // Reset rotation
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Rasmni chapga aylantirish (90 daraja)
  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  // Rasmni o'ngga aylantirish (90 daraja)
  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Kamerani ochish
  const handleOpenCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setImageSrc(null);
    } catch (err) {
      console.error('Kamera ochishda xato:', err);
        window.appAlert('Kamera ochib bo\'lmadi. Iltimos, ruxsatni tekshiring.');
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

  // Crop qilingan rasmni olish
  const getCroppedImage = (image, crop) => {
    const canvas = canvasRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/jpeg',
        0.95
      );
    });
  };

  // Masalani ajratib olish
  const handleExtractProblem = async () => {
    if (!imageSrc) {
      window.appAlert('Iltimos, avval rasm tanlang!');
      return;
    }

    setLoading(true);

    try {
      let imageBlob;

      // Agar crop qilingan bo'lsa
      if (completedCrop && imgRef.current) {
        imageBlob = await getCroppedImage(imgRef.current, completedCrop);
      } else {
        // To'liq rasmni yuborish
        const response = await fetch(imageSrc);
        imageBlob = await response.blob();
      }

      const formData = new FormData();
      formData.append('image', imageBlob, 'cropped-image.jpg');

      const res = await fetch(`${API_BASE_URL}/image/read`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server xatosi: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success && data.text) {
        // Matnni qaytarish
        if (onTextExtracted) {
          onTextExtracted(data.text);
        }
        window.appAlert('Masala muvaffaqiyatli o\'qildi!');
      } else {
        window.appAlert(data.error || 'Masala o\'qishda xatolik');
      }
    } catch (err) {
      console.error('Xato:', err);
      window.appAlert(`Masala o'qishda xatolik: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Rasmni reset qilish
  const handleResetImage = () => {
    setImageSrc(null);
    setCompletedCrop(null);
    setRotation(0);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setShowCamera(false);
  };

  return (
    <div className="image-cropper">
      <div className="cropper-header">
        <p>Rasmni tanlang, kerakli qismni kesib oling va masalani o'qing</p>
      </div>

      <div className="cropper-controls">
        <button className="camera-btn" onClick={handleOpenCamera}>
          📷 Kamera ochish
        </button>
        <label className="file-upload-btn">
          📁 Fayl tanlash
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {showCamera && (
        <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="camera-video"
              />
          <div className="camera-controls">
            <button className="capture-btn" onClick={handleCapture}>
              📸 Suratga olish
            </button>
            <button className="close-camera-btn" onClick={handleCloseCamera}>
              ❌ Yopish
            </button>
          </div>
        </div>
      )}

      {imageSrc && (
        <div className="crop-section">
          <div className="crop-container">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={undefined}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Yuklangan rasm"
                style={{ 
                  transform: `rotate(${rotation}deg)`,
                  maxWidth: '100%',
                  maxHeight: '500px'
                }}
                onLoad={(e) => {
                  setImageDimensions({
                    width: e.target.naturalWidth,
                    height: e.target.naturalHeight
                  });
                }}
              />
            </ReactCrop>
          </div>

          <div className="crop-actions">
            <button className="rotate-btn" onClick={handleRotateLeft}>
              ↺ Chapga burish
            </button>
            <button className="rotate-btn" onClick={handleRotateRight}>
              ↻ O'ngga burish
            </button>
            <button 
              className="extract-btn" 
              onClick={handleExtractProblem}
              disabled={loading}
            >
              {loading ? '⏳ O\'qilmoqda...' : '🔍 Masalani o\'qish'}
            </button>
            <button className="reset-image-btn" onClick={handleResetImage}>
              🔄 Yangidan boshlash
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default ImageCropper;
