import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, Camera, X } from "lucide-react";

interface Props {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: Props) {
  const divId = "qr-reader-" + Math.random().toString(36).slice(2);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(divId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (text) => {
        onScan(text);
        scanner.stop().catch(() => {});
      },
      () => {}
    ).then(() => setStarted(true)).catch((err) => {
      setError(String(err));
    });

    return () => {
      scanner.isScanning && scanner.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">QR-kod skanerlash</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <Camera className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">Kamera ruxsatini tekshiring</p>
            </div>
          ) : (
            <>
              <div id={divId} className="rounded-xl overflow-hidden" style={{ width: "100%" }} />
              {!started && (
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Kamera yuklanmoqda...
                </div>
              )}
              <p className="text-center text-xs text-muted-foreground mt-3">
                QR-kodni kamera oldiga tuting
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
