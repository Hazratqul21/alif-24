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
  
  const API_BASE_URL = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/v1', '/smartkids') 
    : "http://localhost:8000/api/smartkids";
  
  useEffect(() => {  
    if (showCamera && stream && videoRef.current) {  
      videoRef.current.srcObject = stream;  
    }  
  }, [showCamera, stream]);  
  
  const openCamera = async () => {  
    try {  
      const s = await navigator.mediaDevices.getUserMedia({ video: true });  
      setStream(s);  
      setShowCamera(true);  
    } catch (err) {  
      console.error(err);  
      window.appAlert("Kamera ochilmadi. Ruxsatlarni tekshiring.");  
    }  
  };  
  
  const closeCamera = () => {  
    if (stream) {  
      stream.getTracks().forEach((t) => t.stop());  
      setStream(null);  
    }  
    setShowCamera(false);  
  };  
  
  const capturePhoto = () => {  
    const canvas = canvasRef.current;  
    const video = videoRef.current;  
  
    canvas.width = video.videoWidth;  
    canvas.height = video.videoHeight;  
  
    const ctx = canvas.getContext("2d");  
    ctx.drawImage(video, 0, 0);  
  
    canvas.toBlob((blob) => {  
      setPreview(URL.createObjectURL(blob));  
      sendToServer(blob, "image");  
      closeCamera();  
    }, "image/jpeg");  
  };  
  
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
        window.appAlert(data.error);  
      } else {
        setText(data.text || data.result || data.content || JSON.stringify(data));
      }
    } catch (err) {  
      console.error("Xato:", err);  
      window.appAlert(`Server bilan xatolik: ${err.message}`);  
    } finally {  
      setLoading(false);  
    }  
  };  
  
  const handleFile = (e) => {  
    const file = e.target.files?.[0];  
    if (!file) return;  
  
    setPreview(URL.createObjectURL(file));  
  
    const ext = file.name.split(".").pop().toLowerCase();  
    if (["jpg", "jpeg", "png"].includes(ext)) {  
      sendToServer(file, "image");  
    } else {  
      sendToServer(file, "file");  
    }  
  };  
  
  const openFile = () => {  
    inputRef.current.click();  
  };  


  
  return (  
    <div style={{ textAlign: "center", marginTop: 30, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>  
      <h2 style={{color: "blue", marginBottom: 20, fontSize: 30, fontWeight: "bold"}}>📘 AI bilan kitob o'qish</h2>

      
      {!showCamera ? (  
        <div className="w-[350px] border-2 border-dashed border-blue-500 rounded-xl items-center justify-center p-4" >   
          <div className="flex items-center gap-1 padding-2" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <button onClick={openCamera} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg border-2 border-blue-600 hover:bg-blue-600 active:bg-blue-700 transition-colors duration-200 shadow-md">
              <span>📷</span>
              <span>Kamera</span>
            </button>  
            <button onClick={openFile} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg border-2 border-blue-600 hover:bg-blue-600 active:bg-blue-700 transition-colors duration-200 shadow-md">
              <span>📁</span>
              <span>Fayl yuklash</span> 
            </button>  
          </div>
          <input  
            ref={inputRef}  
            type="file"  
            accept="image/*,.pdf,.doc,.docx,.txt"  
            onChange={handleFile}  
            style={{ display: "none" }}  
          />  
  
          <p className="hint" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>Rasm, PDF yoki Word fayl yuklang</p>  
        </div>  
      ) : (  
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-white">📷 Kamera</h3>
              <button 
                onClick={closeCamera}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-4">
              <div className="flex justify-center mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full max-w-md rounded-lg border-2 border-gray-300"
                />
              </div>             
            
            </div>
            
            <div className="flex gap-3 p-4 border-t border-gray-200">
              <button
                onClick={capturePhoto}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                <span className="text-xl">📸</span>
                <span>Rasmga tushirish</span>
              </button>
              
              <button
                onClick={closeCamera}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                <span className="text-xl">❌</span>
                <span>Bekor qilish</span>
              </button>
            </div>
          </div>
        </div>
      )}  
  
      {loading && <p style={{ color: "#666", marginTop: 20 }}>🔄 Matn aniqlanmoqda...</p>}  
  

  
      <div style={{ width: "420px", maxWidth: "100%", padding: "10px", borderRadius: "10px", overflowWrap: "break-word", wordBreak: "break-word", overflowX: "auto", marginTop: 20 }}> 
        {text && <StoryReader storyText={text} age={age} />}  
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>  
  );  
}
