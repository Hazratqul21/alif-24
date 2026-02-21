import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Common/Navbar';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, Save, ArrowLeft,
  Camera, Shield, Bell, Globe, LogOut, ChevronRight, Edit
} from 'lucide-react';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, updateProfile, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('info');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    language: user?.language || 'uz',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        language: formData.language,
      });
      setMessage({ type: 'success', text: 'Profil yangilandi!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Xatolik yuz berdi' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'Yangi parollar mos kelmaydi' });
      return;
    }
    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { authService } = await import('../services/authService');
      await authService.changePassword(passwordData.current_password, passwordData.new_password);
      setMessage({ type: 'success', text: 'Parol o\'zgartirildi!' });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Parol o\'zgartirishda xatolik' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const sections = [
    { id: 'info', label: 'Shaxsiy ma\'lumotlar', icon: User },
    { id: 'security', label: 'Xavfsizlik', icon: Shield },
    { id: 'notifications', label: 'Bildirishnomalar', icon: Bell },
  ];

  const roleLabels = {
    student: "O'quvchi",
    teacher: "O'qituvchi",
    parent: "Ota-ona",
    moderator: "Moderator",
    organization: "Tashkilot",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span>Ortga</span>
        </button>

        {/* Profile Header */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user?.first_name?.charAt(0) || 'U'}{user?.last_name?.charAt(0) || ''}
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white border-2 border-[#1a1a2e] cursor-pointer hover:bg-white/30 transition-colors">
                <Camera size={14} />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user?.first_name} {user?.last_name}</h2>
              <p className="text-white/60 text-sm">{user?.email || user?.phone}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-[#4b30fb]/20 text-[#4b30fb] px-3 py-0.5 rounded-full text-xs font-medium">
                  {roleLabels[user?.role] || user?.role}
                </span>
                {user?.id && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(user.id); setMessage({ type: 'success', text: 'ID nusxalandi!' }); setTimeout(() => setMessage(null), 2000); }}
                    className="bg-white/10 text-white/50 hover:text-white px-2 py-0.5 rounded-full text-xs font-mono cursor-pointer border border-white/10 hover:border-white/30 transition-all flex items-center gap-1"
                    title="ID ni nusxalash"
                  >
                    🆔 {user.id}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid md:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border-none cursor-pointer ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white'
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

          {/* Content */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            {activeSection === 'info' && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-white mb-4">Shaxsiy ma'lumotlar</h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Ism</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#4b30fb] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Familiya</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#4b30fb] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/40 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1">Telefon</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/40 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1">Til</label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#4b30fb]"
                  >
                    <option value="uz">O'zbekcha</option>
                    <option value="ru">Русский</option>
                  </select>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-6 py-2.5 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform font-medium disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-white mb-4">Parolni o'zgartirish</h3>

                {['current_password', 'new_password', 'confirm_password'].map((field) => {
                  const labels = {
                    current_password: 'Joriy parol',
                    new_password: 'Yangi parol',
                    confirm_password: 'Yangi parolni tasdiqlang',
                  };
                  const key = field === 'current_password' ? 'current' : field === 'new_password' ? 'new' : 'confirm';
                  return (
                    <div key={field}>
                      <label className="block text-sm text-white/60 mb-1">{labels[field]}</label>
                      <div className="relative">
                        <input
                          type={showPasswords[key] ? 'text' : 'password'}
                          name={field}
                          value={passwordData[field]}
                          onChange={handlePasswordChange}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white focus:outline-none focus:border-[#4b30fb]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white bg-transparent border-none cursor-pointer"
                        >
                          {showPasswords[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="flex items-center gap-2 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white px-6 py-2.5 rounded-xl border-none cursor-pointer hover:scale-105 transition-transform font-medium disabled:opacity-50"
                >
                  <Lock size={16} />
                  {loading ? 'O\'zgartirilmoqda...' : 'Parolni o\'zgartirish'}
                </button>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold text-white mb-4">Bildirishnoma sozlamalari</h3>
                {[
                  { label: 'Email bildirishnomalar', desc: 'Muhim yangiliklar email orqali' },
                  { label: 'Telegram bildirishnomalar', desc: 'Telegram bot orqali xabarlar' },
                  { label: 'Yutuqlar haqida', desc: 'Yangi yutuqlar erishilganda xabar' },
                  { label: 'Haftalik hisobot', desc: 'Har hafta o\'quv natijalari' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="text-xs text-white/40">{item.desc}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4b30fb]"></div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
