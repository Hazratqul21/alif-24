import { useEffect, useMemo, useState } from 'react';
import { X, Check, User, Calendar, Users as UsersIcon, GraduationCap, School, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../../services/apiService';

/**
 * ProfileCompletionModal — shown when a blocked action (olympiad registration,
 * etc.) needs profile fields the user hasn't filled yet.
 *
 * Props:
 *   isOpen        : boolean
 *   onClose       : () => void                       — user dismissed
 *   onCompleted   : (updatedUser) => void | Promise  — fields saved; caller should re-try the blocked action
 *   requiredOnly  : boolean (default true) — only ask for fields that block core flows (DOB, name)
 *   title         : string, optional                  — override header text
 *   message       : string, optional                  — override body text
 */
export default function ProfileCompletionModal({
    isOpen,
    onClose,
    onCompleted,
    requiredOnly = true,
    title,
    message,
}) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [completeness, setCompleteness] = useState(null);
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        grade: '',
        schoolName: '',
    });

    // Fetch current state + prefill whenever the modal opens.
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const [me, comp] = await Promise.all([
                    apiService.get('/auth/me'),
                    apiService.get('/auth/me/completeness'),
                ]);
                if (cancelled) return;
                const u = me?.data || me?.user || me || {};
                setForm((prev) => ({
                    ...prev,
                    firstName: u.first_name || u.firstName || '',
                    lastName: u.last_name || u.lastName || '',
                    dateOfBirth: u.date_of_birth || u.dateOfBirth || '',
                    gender: u.gender || '',
                }));
                setCompleteness(comp?.data || null);
            } catch (e) {
                setError(e.message || 'Profil ma\'lumotlari yuklanmadi');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen]);

    const missingFields = useMemo(() => {
        if (!completeness) return [];
        return requiredOnly
            ? completeness.required_missing || []
            : completeness.missing || [];
    }, [completeness, requiredOnly]);

    // Decide which form rows to render based on `missing`.
    const showField = (name) => {
        if (!completeness) return true; // until loaded, show everything
        if (!requiredOnly) return true;
        return missingFields.some((m) => m.field === name);
    };

    const isStudentFormUseful = showField('grade') || showField('school_name');

    const canSubmit = useMemo(() => {
        if (requiredOnly) {
            // All required_missing fields must now be filled in the form.
            return missingFields.every((m) => {
                switch (m.field) {
                    case 'first_name': return !!form.firstName.trim();
                    case 'last_name':  return !!form.lastName.trim();
                    case 'date_of_birth': return !!form.dateOfBirth;
                    default: return true;
                }
            });
        }
        return true;
    }, [missingFields, form, requiredOnly]);

    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit || saving) return;
        setSaving(true);
        setError(null);
        try {
            const payload = {};
            if (form.firstName.trim())   payload.firstName = form.firstName.trim();
            if (form.lastName.trim())    payload.lastName  = form.lastName.trim();
            if (form.dateOfBirth)        payload.dateOfBirth = form.dateOfBirth;
            if (form.gender)             payload.gender = form.gender;
            if (form.grade.trim())       payload.grade = form.grade.trim();
            if (form.schoolName.trim())  payload.schoolName = form.schoolName.trim();

            const res = await apiService.patch('/auth/me', payload);
            const updated = res?.data || res;
            onCompleted?.(updated);
        } catch (err) {
            setError(err.message || 'Saqlashda xatolik');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-lg bg-[#1a1a2e] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden"
                    initial={{ y: 30, scale: 0.96, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 20, scale: 0.96, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-xl font-bold text-white">
                                {title || 'Profilingizni to\'ldiring'}
                            </h3>
                            <p className="text-sm text-slate-300 mt-1">
                                {message ||
                                    'Olimpiadaga qo\'shilish uchun quyidagi ma\'lumotlar talab qilinadi. Bu bir martalik — keyin avtomatik davom etasiz.'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
                            aria-label="Yopish"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Progress bar */}
                    {completeness && (
                        <div className="px-6 pt-4">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                                <span>Profil to'liqligi</span>
                                <span className="font-semibold text-indigo-300">{completeness.percent}%</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-[width] duration-500"
                                    style={{ width: `${completeness.percent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Body */}
                    <div className="px-6 py-5">
                        {loading ? (
                            <div className="flex items-center justify-center py-10 text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Yuklanmoqda…
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-200">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {showField('first_name') && (
                                    <FormRow
                                        label="Ism"
                                        icon={<User className="w-4 h-4" />}
                                        required
                                    >
                                        <input
                                            type="text"
                                            value={form.firstName}
                                            onChange={(e) => handleChange('firstName', e.target.value)}
                                            placeholder="Masalan: Nurmuhammad"
                                            className="flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
                                            autoFocus
                                        />
                                    </FormRow>
                                )}

                                {showField('last_name') && (
                                    <FormRow
                                        label="Familiya"
                                        icon={<User className="w-4 h-4" />}
                                        required
                                    >
                                        <input
                                            type="text"
                                            value={form.lastName}
                                            onChange={(e) => handleChange('lastName', e.target.value)}
                                            placeholder="Masalan: Yo'ldoshev"
                                            className="flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
                                        />
                                    </FormRow>
                                )}

                                {showField('date_of_birth') && (
                                    <FormRow
                                        label="Tug'ilgan sana"
                                        icon={<Calendar className="w-4 h-4" />}
                                        required
                                        hint="Olimpiadaga qo'shilish uchun kerak"
                                    >
                                        <input
                                            type="date"
                                            value={form.dateOfBirth}
                                            max={new Date().toISOString().slice(0, 10)}
                                            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                                            className="flex-1 bg-transparent text-white outline-none [color-scheme:dark]"
                                        />
                                    </FormRow>
                                )}

                                {!requiredOnly && showField('gender') && (
                                    <FormRow label="Jins" icon={<UsersIcon className="w-4 h-4" />}>
                                        <select
                                            value={form.gender}
                                            onChange={(e) => handleChange('gender', e.target.value)}
                                            className="flex-1 bg-transparent text-white outline-none"
                                        >
                                            <option value="" className="bg-[#1a1a2e]">Tanlang…</option>
                                            <option value="male" className="bg-[#1a1a2e]">O'g'il bola</option>
                                            <option value="female" className="bg-[#1a1a2e]">Qiz bola</option>
                                            <option value="other" className="bg-[#1a1a2e]">Boshqa</option>
                                        </select>
                                    </FormRow>
                                )}

                                {!requiredOnly && isStudentFormUseful && (
                                    <>
                                        {showField('grade') && (
                                            <FormRow label="Sinf" icon={<GraduationCap className="w-4 h-4" />}>
                                                <input
                                                    type="text"
                                                    value={form.grade}
                                                    onChange={(e) => handleChange('grade', e.target.value)}
                                                    placeholder="Masalan: 7-sinf"
                                                    className="flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
                                                />
                                            </FormRow>
                                        )}
                                        {showField('school_name') && (
                                            <FormRow label="Maktab" icon={<School className="w-4 h-4" />}>
                                                <input
                                                    type="text"
                                                    value={form.schoolName}
                                                    onChange={(e) => handleChange('schoolName', e.target.value)}
                                                    placeholder="Maktab nomi"
                                                    className="flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
                                                />
                                            </FormRow>
                                        )}
                                    </>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5"
                                    >
                                        Keyinroq
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!canSubmit || saving}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-500/40 transition-shadow"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                        {saving ? 'Saqlanmoqda…' : 'Saqlash va davom etish'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function FormRow({ label, icon, required, hint, children }) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-1.5">
                {label}
                {required && <span className="text-red-400">*</span>}
                {hint && <span className="text-slate-500 font-normal">· {hint}</span>}
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg focus-within:border-indigo-400/50 focus-within:bg-white/[0.07] transition-colors">
                <span className="text-slate-400">{icon}</span>
                {children}
            </div>
        </div>
    );
}
