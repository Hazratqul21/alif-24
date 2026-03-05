import { useRef, useState, useEffect } from 'react';
import { Share2, Download, CheckCircle } from 'lucide-react';

export default function ShareCard({ olympiad, result }) {
    const canvasRef = useRef(null);
    const [imageStr, setImageStr] = useState('');
    const [shared, setShared] = useState(false);

    useEffect(() => {
        if (!olympiad || !result) return;
        drawCanvas();
    }, [olympiad, result]);

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Canvas dimensions (Instagram square ratio is good)
        canvas.width = 1080;
        canvas.height = 1080;

        // Background Gradient
        const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
        gradient.addColorStop(0, '#1e1b4b'); // slate-950
        gradient.addColorStop(0.5, '#312e81'); // indigo-900
        gradient.addColorStop(1, '#0f172a'); // slate-900
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1080, 1080);

        // Decorative circles
        ctx.beginPath();
        ctx.arc(1080, 0, 400, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.1)'; // indigo-500
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 1080, 300, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.1)'; // purple-500
        ctx.fill();

        // Logo / Branding
        ctx.font = 'bold 50px sans-serif';
        ctx.fillStyle = '#818cf8'; // indigo-400
        ctx.textAlign = 'center';
        ctx.fillText('ALIF24 PLATFORMA', 540, 120);

        ctx.font = '30px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('olimp.alif24.uz', 540, 170);

        // Title
        ctx.font = 'bold 80px sans-serif';
        ctx.fillStyle = '#ffffff';
        // Simple word wrap
        const titleWords = (olympiad.title || 'Olimpiada').split(' ');
        let titleLine = '';
        let titleY = 320;
        for (let i = 0; i < titleWords.length; i++) {
            let testLine = titleLine + titleWords[i] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > 900 && i > 0) {
                ctx.fillText(titleLine, 540, titleY);
                titleLine = titleWords[i] + ' ';
                titleY += 90;
            } else {
                titleLine = testLine;
            }
        }
        ctx.fillText(titleLine, 540, titleY);

        // Decorative line
        ctx.beginPath();
        ctx.moveTo(340, titleY + 50);
        ctx.lineTo(740, titleY + 50);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Score
        ctx.font = 'bold 160px sans-serif';
        ctx.fillStyle = '#fbbf24'; // amber-400
        ctx.fillText(`${result.total_score || result.score || 0}`, 540, titleY + 280);

        ctx.font = '40px sans-serif';
        ctx.fillStyle = '#a5b4fc'; // indigo-300
        ctx.fillText('To\'plagan balim', 540, titleY + 360);

        // Footer
        ctx.font = 'bold 40px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText("Sen ham o'z bilimingni sina!", 540, 950);

        ctx.font = '35px sans-serif';
        ctx.fillStyle = '#818cf8';
        ctx.fillText("Kirish ➔ olimp.alif24.uz", 540, 1010);

        try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setImageStr(dataUrl);
        } catch (e) {
            console.error(e);
        }
    };

    const handleShare = async () => {
        if (!imageStr) return;

        try {
            const blob = await (await fetch(imageStr)).blob();
            const file = new File([blob], 'alif24-natija.jpg', { type: 'image/jpeg' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Mening natijam!',
                    text: `${olympiad.title} da zo'r natija ko'rsatdim! Siz ham o'zingizni sinab ko'ring: olimp.alif24.uz`,
                    files: [file]
                });
                setShared(true);
            } else {
                // Fallback to download
                handleDownload();
            }
        } catch (error) {
            console.error('Sharing failed', error);
        }
    };

    const handleDownload = () => {
        if (!imageStr) return;
        const a = document.createElement('a');
        a.href = imageStr;
        a.download = `Alif24-Olimpiada-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setShared(true);
    };

    return (
        <div className="mt-8 flex flex-col items-center">
            {/* Hidden canvas for drawing */}
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

            <button
                onClick={handleShare}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:-translate-y-1 w-full max-w-sm"
            >
                {shared ? <CheckCircle className="w-6 h-6 text-green-300" /> : <Share2 className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                <span className="text-lg">{shared ? "Ulashildi!" : "Do'stlarga ulashish"}</span>
            </button>
            <p className="text-indigo-400 text-sm mt-3 opacity-80 flex items-center gap-1 cursor-pointer hover:underline" onClick={handleDownload}>
                <Download className="w-4 h-4" /> yoki rasmni yuklab olish
            </p>
        </div>
    );
}
