import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';
import { authService } from '../services/authService';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, Save, ArrowLeft,
  Camera, Shield, Bell, LogOut, Calendar, Users as UsersIcon,
  GraduationCap, School, Globe, Check, AlertCircle, Loader2,
  BadgeCheck, XCircle
} from 'lucide-react';

const SECTIONS = [
  { id: 'info',           label: "Shaxsiy ma'lumotlar", icon: User },
  { id: 'contact',        label: 'Aloqa ma\'lumotlari', icon: Mail },
  { id: 'security',       label: 'Xavfsizlik',          icon: Shield },
  { id: 'notifications',  label: 'Bildirishnomalar',    icon: Bell },
];

const ROLE_LABELS = {
  student: "O'quvchi",
  teacher: "O'qituvchi",
  parent: "Ota-ona",
  moderator: "Moderator",
  organization: "Tashkilot",
};

const LANGUAGES = [
  { value: 'uz', label: "O'zbekcha" },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t: _t } = useLanguage();
  const { user, updateProfile, refreshUser, logout } = useAuth();

  const [activeSection, setActiveSection] = useState('info');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [completeness, setCompleteness] = useState(null);

  // ---- Profile form ----
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    grade: '',
    school_name: '',
    language: 'uz',
    timezone: 'Asia/Tashkent',
  });

  const [contact, setContact] = useState({
    email: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false, new: false, confirm: false,
  });

  const [notifications, setNotifications] = useState({
    marketing_emails_enabled: true,
    telegram_enabled: true,       // UI only for now
    achievements_enabled: true,   // UI only for now
    weekly_digest_enabled: true,  // UI only for now
  });

  const loadCompleteness = useCallback(async () => {
    try {
      const c = await authService.getCompleteness();
      setCompleteness(c);
    } catch {/* non-fatal */}
  }, []);

  useEffect(() => {
    if (!user) return;
    // Prefill forms whenever `user` changes.
    setProfile({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      date_of_birth: user.date_of_birth || '',
      gender: user.gender || '',
      grade: user.student_profile?.grade || user.grade || '',
      school_name: user.student_profile?.school_name || user.school_name || '',
      language: user.language || 'uz',
      timezone: user.timezone || 'Asia/Tashkent',
    });
    setContact({ email: user.email || '', phone: user.phone || '' });
    setNotifications((prev) => ({
      ...prev,
      marketing_emails_enabled: typeof user.marketing_emails_enabled === 'boolean'
        ? user.marketing_emails_enabled : true,
    }));
    loadCompleteness();
  }, [user, loadCompleteness]);

  const flash = (type, text, ms = 3000) => {
    setMessage({ type, text });
    if (ms) setTimeout(() => setMessage(null), ms);
  };

  const onProfileChange = (field, value) =>
    setProfile((prev) => ({ ...prev, [field]: value }));
  const onContactChange = (field, value) =>
    setContact((prev) => ({ ...prev, [field]: value }));
  const onPasswordChange = (field, value) =>
    setPasswordData((prev) => ({ ...prev, [field]: value }));

  // ---- Save handlers ----------------------------------------------------
  const saveProfile = async () => {
    setLoading(true);
    try {
      const payload = {
        firstName: profile.first_name.trim(),
        lastName:  profile.last_name.trim(),
        dateOfBirth: profile.date_of_birth || undefined,
        gender: profile.gender || undefined,
        language: profile.language,
        timezone: profile.timezone,
      };
      if (user?.role === 'student') {
        if (profile.grade?.trim())       payload.grade = profile.grade.trim();
        if (profile.school_name?.trim()) payload.schoolName = profile.school_name.trim();
      }
      await updateProfile(payload);
      await refreshUser?.();
      await loadCompleteness();
      flash('success', 'Profil muvaffaqiyatli yangilandi');
    } catch (err) {
      flash('error', err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const saveContact = async () => {
    setLoading(true);
    try {
      const payload = {};
      if (contact.email && contact.email !== user?.email) payload.email = contact.email;
      if (contact.phone && contact.phone !== user?.phone) payload.phone = contact.phone;
      if (Object.keys(payload).length === 0) {
        flash('info', "O'zgarish yo'q");
        return;
      }
      await updateProfile(payload);
      await refreshUser?.();
      await loadCompleteness();
      flash('success', "Aloqa ma'lumotlari yangilandi. Tasdiqlash uchun \"Tasdiqlash\" tugmasini bosing.");
    } catch (err) {
      flash('error', err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      flash('error', 'Yangi parollar mos kelmaydi');
      return;
    }
    if (passwordData.new_password.length < 6) {
      flash('error', 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword(
        passwordData.current_password,
        passwordData.new_password
      );
      flash('success', 'Parol o\'zgartirildi!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      flash('error', err.message || 'Parol o\'zgartirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const saveNotifications = async () => {
    setLoading(true);
    try {
      await updateProfile({
        marketingEmailsEnabled: !!notifications.marketing_emails_enabled,
      });
      flash('success', 'Bildirishnoma sozlamalari saqlandi');
    } catch (err) {
      flash('error', err.message || 'Xatolik');
    } finally {
      setLoading(false);
    }
  };

  const initials = useMemo(() => {
    const f = (user?.first_name || 'U').charAt(0).toUpperCase();
    const l = (user?.last_name || '').charAt(0).toUpperCase();
    return f + l;
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span>Ortga</span>
        </button>

        {/* HERO */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/10"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
              {/* Avatar upload is wired up in Step 4 */}
              <button
                type="button"
                disabled
                title="Avatar yuklash (tez orada)"
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white border-2 border-[#1a1a2e] cursor-not-allowed"
              >
                <Camera size={14} />
              </button>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">
                {user?.first_name} {user?.last_name}
              </h2>
              <p className="text-white/60 text-sm">{user?.email || user?.phone}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="bg-[#4b30fb]/20 text-[#4b30fb] px-3 py-0.5 rounded-full text-xs font-medium">
                  {ROLE_LABELS[user?.role] || user?.role}
                </span>
                {user?.email_verified ? (
                  <span className="inline-flex items-center gap-1 bg-green-500/15 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full text-xs">
                    <BadgeCheck size={12} /> Email tasdiqlangan
                  </span>
                ) : user?.email ? (
                  <span className="inline-flex items-center gap-1 bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded-full text-xs">
                    <AlertCircle size={12} /> Email tasdiqlanmagan
                  </span>
                ) : null}
                {user?.id && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.id);
                      flash('success', 'ID nusxalandi', 2000);
                    }}
                    className="bg-white/10 text-white/60 hover:text-white px-2 py-0.5 rounded-full text-xs font-mono cursor-pointer border border-white/10 hover:border-white/30 transition-all"
                    title="ID ni nusxalash"
                  >
                    🆔 {user.id}
                  </button>
                )}
              </div>
            </div>

            {completeness && (
              <div className="md:w-64">
                <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                  <span>Profil to'liqligi</span>
                  <span className="font-semibold text-[#a78bfa]">{completeness.percent}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#4b30fb] to-[#a78bfa] transition-[width] duration-500"
                    style={{ width: `${completeness.percent}%` }}
                  />
                </div>
                {completeness.missing?.length > 0 && (
                  <p className="text-[11px] text-white/40 mt-1">
                    To'ldirilmagan: {completeness.missing.slice(0, 3).map((m) => m.label).join(', ')}
                    {completeness.missing.length > 3 ? '…' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Message banner */}
        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-start gap-2 ${
            message.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30'
            : message.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30'
            : 'bg-white/10 text-white/80 border border-white/20'
          }`}>
            {message.type === 'success' ? <Check size={16} className="mt-0.5" />
              : message.type === 'error' ? <XCircle size={16} className="mt-0.5" />
              : <AlertCircle size={16} className="mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border-none cursor-pointer ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white shadow-lg shadow-purple-500/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5 bg-transparent'
                }`}
              >
                <section.icon size={18} />
                {section.label}
              </button>
            ))}

            <button
              onClick={() => { logout(); navigate('/'); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all border-none cursor-pointer bg-transparent mt-4"
            >
              <LogOut size={18} />
              Chiqish
            </button>
          </div>

          {/* Main panel */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            {activeSection === 'info' && (
              <section className="space-y-5">
                <Heading icon={<User size={18} />} title="Shaxsiy ma'lumotlar"
                  subtitle="Bu ma'lumotlar olimpiadalar, sertifikatlar va reyting uchun ishlatiladi." />

                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Ism" required>
                    <input
                      type="text"
                      value={profile.first_name}
                      onChange={(e) => onProfileChange('first_name', e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Familiya" required>
                    <input
                      type="text"
                      value={profile.last_name}
                      onChange={(e) => onProfileChange('last_name', e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Tug'ilgan sana" icon={<Calendar size={14} />} required>
                    <input
                      type="date"
                      value={profile.date_of_birth}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => onProfileChange('date_of_birth', e.target.value)}
                      className={`${inputCls} [color-scheme:dark]`}
                    />
                  </Field>
                  <Field label="Jins" icon={<UsersIcon size={14} />}>
                    <select
                      value={profile.gender}
                      onChange={(e) => onProfileChange('gender', e.target.value)}
                      className={inputCls}
                    >
                      <option value="" className="bg-[#1a1a2e]">Tanlang…</option>
                      <option value="male" className="bg-[#1a1a2e]">O'g'il bola</option>
                      <option value="female" className="bg-[#1a1a2e]">Qiz bola</option>
                    </select>
                  </Field>
                </div>

                {user?.role === 'student' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Sinf" icon={<GraduationCap size={14} />}>
                      <input
                        type="text"
                        value={profile.grade}
                        onChange={(e) => onProfileChange('grade', e.target.value)}
                        placeholder="Masalan: 7-sinf"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Maktab" icon={<School size={14} />}>
                      <input
                        type="text"
                        value={profile.school_name}
                        onChange={(e) => onProfileChange('school_name', e.target.value)}
                        placeholder="Maktab nomi"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Til" icon={<Globe size={14} />}>
                    <select
                      value={profile.language}
                      onChange={(e) => onProfileChange('language', e.target.value)}
                      className={inputCls}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value} className="bg-[#1a1a2e]">
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Vaqt zonasi" icon={<Globe size={14} />}>
                    <input
                      type="text"
                      value={profile.timezone}
                      onChange={(e) => onProfileChange('timezone', e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <SaveButton loading={loading} onClick={saveProfile} />
              </section>
            )}

            {activeSection === 'contact' && (
              <section className="space-y-5">
                <Heading icon={<Mail size={18} />} title="Aloqa ma'lumotlari"
                  subtitle="Yangi qiymat kiritsangiz, eski tasdiqlangan status bekor qilinadi va qaytadan tasdiqlash kerak bo'ladi." />

                <Field label="Email" icon={<Mail size={14} />}
                  hint={user?.email_verified
                    ? <span className="text-green-400 inline-flex items-center gap-1"><BadgeCheck size={12} /> Tasdiqlangan</span>
                    : user?.email ? <span className="text-yellow-400 inline-flex items-center gap-1"><AlertCircle size={12} /> Tasdiqlanmagan</span>
                    : null}
                >
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => onContactChange('email', e.target.value)}
                    placeholder="siz@example.com"
                    className={inputCls}
                  />
                </Field>

                {user?.email && !user?.email_verified && (
                  <button
                    type="button"
                    disabled
                    title="Email tasdiqlash 3-qadamda ishga tushadi"
                    className="text-xs text-white/50 underline cursor-not-allowed"
                  >
                    Tasdiqlash kodini yuborish (tez orada)
                  </button>
                )}

                <Field label="Telefon" icon={<Phone size={14} />}
                  hint={user?.phone_verified
                    ? <span className="text-green-400 inline-flex items-center gap-1"><BadgeCheck size={12} /> Tasdiqlangan</span>
                    : user?.phone ? <span className="text-yellow-400 inline-flex items-center gap-1"><AlertCircle size={12} /> Tasdiqlanmagan</span>
                    : null}
                >
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => onContactChange('phone', e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className={inputCls}
                  />
                </Field>

                <SaveButton loading={loading} onClick={saveContact} />
              </section>
            )}

            {activeSection === 'security' && (
              <section className="space-y-5">
                <Heading icon={<Shield size={18} />} title="Xavfsizlik"
                  subtitle="Parolingizni muntazam yangilab turing." />

                {['current_password', 'new_password', 'confirm_password'].map((field) => {
                  const labels = {
                    current_password: 'Joriy parol',
                    new_password: 'Yangi parol',
                    confirm_password: 'Yangi parolni tasdiqlang',
                  };
                  const key = field === 'current_password' ? 'current'
                    : field === 'new_password' ? 'new' : 'confirm';
                  return (
                    <Field key={field} label={labels[field]}>
                      <div className="relative w-full">
                        <input
                          type={showPasswords[key] ? 'text' : 'password'}
                          value={passwordData[field]}
                          onChange={(e) => onPasswordChange(field, e.target.value)}
                          className={`${inputCls} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white bg-transparent border-none cursor-pointer"
                        >
                          {showPasswords[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>
                  );
                })}

                <button
                  onClick={savePassword}
                  disabled={loading}
                  className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-6 py-2.5 rounded-xl border-none cursor-pointer hover:scale-[1.02] transition-transform font-medium disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  {loading ? 'O\'zgartirilmoqda…' : 'Parolni o\'zgartirish'}
                </button>
              </section>
            )}

            {activeSection === 'notifications' && (
              <section className="space-y-5">
                <Heading icon={<Bell size={18} />} title="Bildirishnoma sozlamalari"
                  subtitle="Qaysi bildirishnomalarni olishni tanlang." />

                <ToggleRow
                  label="Marketing xabarlar (email)"
                  desc="Yangiliklar, aksiyalar va tavsiyalar"
                  checked={notifications.marketing_emails_enabled}
                  onChange={(v) => setNotifications((p) => ({ ...p, marketing_emails_enabled: v }))}
                />
                <ToggleRow
                  label="Tranzaksion xabarlar (email)"
                  desc="Ro'yxatdan o'tish, parol, to'lov — har doim yoqilgan"
                  checked
                  disabled
                />
                <ToggleRow
                  label="Telegram bildirishnomalar"
                  desc="Telegram bot orqali xabarlar (tez orada)"
                  checked={notifications.telegram_enabled}
                  onChange={(v) => setNotifications((p) => ({ ...p, telegram_enabled: v }))}
                  disabled
                />
                <ToggleRow
                  label="Yutuqlar haqida"
                  desc="Yangi yutuqlar erishilganda xabar (tez orada)"
                  checked={notifications.achievements_enabled}
                  onChange={(v) => setNotifications((p) => ({ ...p, achievements_enabled: v }))}
                  disabled
                />
                <ToggleRow
                  label="Haftalik hisobot"
                  desc="Har hafta o'quv natijalari (tez orada)"
                  checked={notifications.weekly_digest_enabled}
                  onChange={(v) => setNotifications((p) => ({ ...p, weekly_digest_enabled: v }))}
                  disabled
                />

                <SaveButton loading={loading} onClick={saveNotifications} />
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// UI helpers
// -------------------------------------------------------------------------

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#4b30fb] transition-colors placeholder:text-white/30';

function Heading({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-2">
      <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#a78bfa] shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {subtitle && <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Field({ label, required, icon, hint, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm text-white/70 mb-1.5">
        {icon && <span className="text-white/40">{icon}</span>}
        {label}
        {required && <span className="text-red-400">*</span>}
        {hint && <span className="ml-auto text-xs">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function SaveButton({ loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-6 py-2.5 rounded-xl border-none cursor-pointer hover:scale-[1.02] transition-transform font-medium disabled:opacity-50"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      {loading ? 'Saqlanmoqda…' : 'Saqlash'}
    </button>
  );
}

function ToggleRow({ label, desc, checked, onChange, disabled }) {
  return (
    <div className={`flex items-center justify-between p-4 bg-white/5 rounded-xl ${disabled ? 'opacity-60' : ''}`}>
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        {desc && <div className="text-xs text-white/40 mt-0.5">{desc}</div>}
      </div>
      <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={!!checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-white/20 rounded-full peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4b30fb]" />
      </label>
    </div>
  );
}
