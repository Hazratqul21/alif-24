import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, Camera, X, Barcode, CheckCircle2, RefreshCw, ImageIcon, ScanLine, Zap } from "lucide-react";

interface Props {
  onDetected: (isbn: string) => void;
  onClose: () => void;
}

function extractIsbn(raw: string): string | null {
  const trimmed = raw.trim();
  const stripped = trimmed.replace(/^isbn[:\s]*/i, "").replace(/[-\s]/g, "");
  if (/^\d{13}$/.test(stripped)) return stripped;
  if (/^\d{10}$/.test(stripped)) return stripped;
  if (/^\d{9}[\dXx]$/.test(stripped)) return stripped.toUpperCase();
  const m = trimmed.match(/(?:isbn[:\s]*)?(97[89][\d\-]{10,}|\d{9}[\dXx]|\d{10})/i);
  if (m) return m[1].replace(/[-\s]/g, "");
  return null;
}

type Status = "loading" | "live" | "detected" | "error" | "fallback";

export default function IsbnScannerModal({ onDetected, onClose }: Props) {
  const liveDivId = useRef("isbn-live-" + Math.random().toString(36).slice(2)).current;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [detectedIsbn, setDetectedIsbn] = useState("");
  const [detectedRaw, setDetectedRaw] = useState("");
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIdx, setCameraIdx] = useState(0);
  const [fileScanning, setFileScanning] = useState(false);

  function stopScanner() {
    const sc = scannerRef.current;
    if (sc?.isScanning) sc.stop().catch(() => {});
    scannerRef.current = null;
  }

  function startLive(camId?: string) {
    const el = document.getElementById(liveDivId);
    if (!el) return;

    const scanner = new Html5Qrcode(liveDivId, { verbose: false });
    scannerRef.current = scanner;

    const cameraConfig = camId ?? { facingMode: "environment" };

    scanner
      .start(
        cameraConfig,
        { fps: 15, qrbox: { width: 260, height: 120 }, aspectRatio: 1.6 },
        (text) => {
          const isbn = extractIsbn(text);
          if (isbn) {
            stopScanner();
            setDetectedRaw(text);
            setDetectedIsbn(isbn);
            setStatus("detected");
          }
        },
        () => {}
      )
      .then(() => setStatus("live"))
      .catch((err: unknown) => {
        const msg = String(err);
        // Camera blocked by browser/iframe → offer fallback silently
        if (
          msg.includes("NotAllowedError") ||
          msg.includes("getUserMedia") ||
          msg.includes("Permission") ||
          msg.includes("not allowed")
        ) {
          setStatus("fallback");
        } else {
          setErrorMsg(
            msg
              .replace("NotFoundError:", "Kamera topilmadi.")
              .replace("NotReadableError:", "Kamera band.")
          );
          setStatus("error");
        }
      });
  }

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devs) => {
        if (devs.length > 0) setCameras(devs);
      })
      .catch(() => {});

    // Small timeout so the div is fully in the DOM
    const t = setTimeout(() => startLive(), 80);
    return () => {
      clearTimeout(t);
      stopScanner();
    };
  }, []);

  function switchCamera() {
    stopScanner();
    const nextIdx = (cameraIdx + 1) % (cameras.length || 1);
    setCameraIdx(nextIdx);
    setStatus("loading");
    setTimeout(() => startLive(cameras[nextIdx]?.id), 300);
  }

  // ---- File / photo fallback ----
  async function handleFile(file: File) {
    setFileScanning(true);
    const tempId = "isbn-scan-" + Date.now();
    const div = document.createElement("div");
    div.id = tempId;
    div.style.display = "none";
    document.body.appendChild(div);
    try {
      const sc = new Html5Qrcode(tempId, { verbose: false });
      const result = await sc.scanFileV2(file, false);
      document.body.removeChild(div);
      const isbn = extractIsbn(result.decodedText);
      if (isbn) {
        setDetectedRaw(result.decodedText);
        setDetectedIsbn(isbn);
        setStatus("detected");
      } else {
        setErrorMsg(`"${result.decodedText}" — ISBN emas. Qayta urinib ko'ring.`);
        setStatus("error");
      }
    } catch {
      if (document.getElementById(tempId)) document.body.removeChild(div);
      setErrorMsg("Shtrix-kod topilmadi. Barcode ni to'g'ri suratga oling.");
      setStatus("error");
    } finally {
      setFileScanning(false);
    }
  }

  function openCamera() {
    if (!fileRef.current) return;
    fileRef.current.setAttribute("capture", "environment");
    fileRef.current.click();
  }

  function openGallery() {
    if (!fileRef.current) return;
    fileRef.current.removeAttribute("capture");
    fileRef.current.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";
    handleFile(file);
  }

  function handleConfirm() {
    onDetected(detectedIsbn);
    onClose();
  }

  function retryLive() {
    setStatus("loading");
    setErrorMsg("");
    setDetectedIsbn("");
    setDetectedRaw("");
    setTimeout(() => startLive(), 80);
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Barcode className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">ISBN skanerlash</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {cameras.length > 1 && status === "live" && (
              <button
                onClick={switchCamera}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                title="Kamerani almashtirish"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => { stopScanner(); onClose(); }}
              className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">

          {/* LOADING */}
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Kamera yuklanmoqda...</p>
              {/* Hidden div for live scanner — must stay in DOM */}
              <div id={liveDivId} style={{ width: 1, height: 1, overflow: "hidden" }} />
            </div>
          )}

          {/* LIVE CAMERA */}
          {status === "live" && (
            <>
              <div className="relative rounded-xl overflow-hidden bg-black">
                {/* html5-qrcode renders video here */}
                <div id={liveDivId} style={{ width: "100%" }} />
                {/* Corner bracket overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-28 relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-teal-400 rounded-tl-sm" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-teal-400 rounded-tr-sm" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-teal-400 rounded-bl-sm" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-teal-400 rounded-br-sm" />
                    <div className="absolute inset-x-0 top-1/2 h-px bg-teal-400/60 animate-[scanline_1.8s_ease-in-out_infinite]" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Kitob orqa tomonidagi <strong>shtrix-kodini</strong> kamera oldiga tuting
              </p>
              <p className="text-center text-xs text-primary/60">EAN-13 · ISBN · Code-128 · QR</p>
              {/* Fallback to photo */}
              <button
                onClick={openCamera}
                className="w-full py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Rasm olish usulida skaner
              </button>
            </>
          )}

          {/* FALLBACK — camera blocked, show photo options */}
          {status === "fallback" && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <Zap className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Brauzer kamera ruxsatini bermadi. Rasm olish usulida ISBN skanerlang:
                </p>
              </div>
              <button
                onClick={openCamera}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" /> Kamera bilan rasm olish
              </button>
              <button
                onClick={openGallery}
                className="w-full py-2.5 bg-muted border border-border rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" /> Galereyadan tanlash
              </button>
              <button
                onClick={retryLive}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
              >
                <ScanLine className="w-3.5 h-3.5" /> Live skanerni qayta urinish
              </button>
            </>
          )}

          {/* FILE SCANNING */}
          {fileScanning && (
            <div className="flex flex-col items-center py-6 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Tahlil qilinmoqda...</p>
            </div>
          )}

          {/* DETECTED */}
          {status === "detected" && !fileScanning && (
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6 text-teal-600" />
              </div>
              <p className="font-bold text-sm mb-2">Topildi!</p>
              <div className="bg-muted rounded-xl px-3 py-2.5 mb-3">
                <p className="text-xs text-muted-foreground mb-0.5">ISBN:</p>
                <p className="font-mono font-bold text-primary text-xl tracking-wider">{detectedIsbn}</p>
                {detectedRaw !== detectedIsbn && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{detectedRaw}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={retryLive}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Qayta
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Ishlatish
                </button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {status === "error" && !fileScanning && (
            <div className="text-center py-2">
              <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-destructive font-medium mb-1">Aniqlanmadi</p>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{errorMsg}</p>
              <div className="space-y-2">
                <button
                  onClick={retryLive}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <ScanLine className="w-4 h-4" /> Live skanerni ochish
                </button>
                <button
                  onClick={openCamera}
                  className="w-full py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Rasm olish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for photo fallback */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-40px); opacity: 0.3; }
          50% { transform: translateY(40px); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
