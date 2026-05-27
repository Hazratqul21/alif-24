import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Props {
  value: string;
  size?: number;
  className?: string;
}

export default function QrCodeDisplay({ value, size = 128, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 1,
        color: { dark: "#1a1a1a", light: "#ffffff" },
      }).catch(() => {});
    }
  }, [value, size]);

  return <canvas ref={canvasRef} className={className} width={size} height={size} />;
}
