import { useEffect, useRef, useState } from 'react';
import apiService from '../../services/apiService';
import { X, Mail, Loader2, Check, AlertCircle } from 'lucide-react';

/**
 * VerifyEmailModal
 *
 * Handles two flows:
 *   - purpose=verify_existing → confirm the user's current email
 *   - purpose=change_email    → confirm a brand-new email before we overwrite
 *
 * Props:
 *   isOpen      : boolean
 *   onClose     : () => void
 *   onVerified  : (updatedUser) => void
 *   initialEmail: string, optional — when set, triggers change_email flow
 *                 (typically the value the user typed into Settings → Contact)
 *   currentEmail: string, optional — the user's existing email (for UI)
 */
export default function VerifyEmailModal({
    isOpen,
    onClose,
    onVerified,
    initialEmail,
    currentEmail,
}) {
    const [step, setStep] = useState('request'); // 'request' | 'enter'
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [info, setInfo] = useState(null);
    const [code, setCode] = useState('');
    const [expiresIn, setExpiresIn] = useState(0);
    const [resendCooldown, setResendCooldown] = useState(0);

    const tickRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        setStep('request');
        setCode('');
        setError(null);
        setInfo(null);
        setEmail(initialEmail || currentEmail || '');
    }, [isOpen, initialEmail, currentEmail]);

    // Countdown for expiry + resend cooldown
    useEffect(() => {
        if (!isOpen) return;
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = setInterval(() => {
            setExpiresIn((s) => (s > 0 ? s - 1 : 0));
            setResendCooldown((s) => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => clearInterval(tickRef.current);
    }, [isOpen]);

    const handleSend = async () => {
        setError(null); setInfo(null); setSending(true);
        try {
            const payload = {};
            // Only include email if it actually differs from currentEmail —
            // otherwise backend treats it as verify_existing anyway.
            if (email && email.trim().toLowerCase() !== (currentEmail || '').toLowerCase()) {
                payload.email = email.trim();
            }
            const res = await apiService.post('/auth/email/send-code', payload);
            if (res?.already_verified) {
                setInfo('Email allaqachon tasdiqlangan.');
                setTimeout(() => { onVerified?.(null); onClose?.(); }, 1200);
                return;
            }
            setExpiresIn(res?.expires_in || 900);
            setResendCooldown(30); // small cooldown before user can request a new one
            setStep('enter');
        } catch (err) {
            setError(err.message || 'Kod yuborishda xatolik');
        } finally {
            setSending(false);
        }
    };

    const handleVerify = async () => {
        if (code.length !== 6) return;
        setError(null); setVerifying(true);
        try {
            const res = await apiService.post('/auth/email/verify-code', { code });
            const updated = res?.data || res;
            onVerified?.(updated);
            onClose?.();
        } catch (err) {
            setError(err.message || 'Kod noto\'g\'ri');
        } finally {
            setVerifying(false);
        }
    };

    const fmt = (s) => {
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#4b30fb]/20 flex items-center justify-center text-[#a78bfa]">
                            <Mail size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Email tasdiqlash</h3>
                            <p className="text-sm text-white/50 mt-0.5">
                                {step === 'request'
                                    ? 'Email manziliga 6 xonali kod yuboramiz.'
                                    : 'Email manziliga yuborilgan 6 xonali kodni kiriting.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/50 hover:text-white p-1 rounded bg-transparent border-none cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-sm text-red-200">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    {info && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/15 border border-green-500/30 text-sm text-green-200">
                            <Check size={16} className="mt-0.5 shrink-0" />
                            <span>{info}</span>
                        </div>
                    )}

                    {step === 'request' && (
                        <>
                            <div>
                                <label className="block text-sm text-white/70 mb-1.5">Email manzil</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="siz@example.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#4b30fb]"
                                />
                                {currentEmail && email && email.toLowerCase() !== currentEmail.toLowerCase() && (
                                    <p className="text-xs text-yellow-300/80 mt-1.5">
                                        Yangi email. Tasdiqlansa, akkauntingizga shu manzil ulanadi.
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={sending || !email}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white py-2.5 rounded-xl font-medium border-none cursor-pointer hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                                {sending ? 'Yuborilmoqda…' : 'Kod yuborish'}
                            </button>
                        </>
                    )}

                    {step === 'enter' && (
                        <>
                            <div>
                                <label className="block text-sm text-white/70 mb-1.5">6 xonali kod</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="\d*"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="123456"
                                    autoFocus
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.4em] font-semibold outline-none focus:border-[#4b30fb]"
                                />
                                <div className="flex items-center justify-between mt-2 text-xs text-white/50">
                                    <span>Kodning amal qilish muddati: <span className="font-mono text-white">{fmt(expiresIn)}</span></span>
                                    <button
                                        type="button"
                                        onClick={handleSend}
                                        disabled={resendCooldown > 0 || sending}
                                        className="text-[#a78bfa] hover:text-white disabled:text-white/30 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
                                    >
                                        {resendCooldown > 0 ? `Qayta yuborish ${resendCooldown}s` : 'Qayta yuborish'}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleVerify}
                                disabled={verifying || code.length !== 6 || expiresIn === 0}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white py-2.5 rounded-xl font-medium border-none cursor-pointer hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {verifying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {verifying ? 'Tekshirilmoqda…' : 'Tasdiqlash'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
