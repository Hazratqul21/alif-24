import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const TOAST_DURATION = 4000;

const ToastManager = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handleAppAlert = (e) => {
      const msg = e.detail?.message || '';
      const lower = msg.toLowerCase();
      let type = 'info';
      if (lower.includes('xatolik') || lower.includes('error') || lower.includes('xato')) type = 'error';
      else if (lower.includes('muvaffaqiyat') || lower.includes('success') || lower.includes('saqlandi')) type = 'success';
      else if (lower.includes('ogohlantirish') || lower.includes('warning') || lower.includes('diqqat')) type = 'warning';
      addToast(msg, type);
    };

    window.addEventListener('appAlert', handleAppAlert);
    return () => window.removeEventListener('appAlert', handleAppAlert);
  }, [addToast]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />,
  };

  const bgColors = {
    success: 'bg-emerald-900/90 border-emerald-500/50',
    error: 'bg-red-900/90 border-red-500/50',
    warning: 'bg-amber-900/90 border-amber-500/50',
    info: 'bg-blue-900/90 border-blue-500/50',
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl animate-slide-in-right ${bgColors[toast.type]}`}
        >
          {icons[toast.type]}
          <p className="text-sm text-white font-medium flex-1 break-words">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/60 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ToastManager;
