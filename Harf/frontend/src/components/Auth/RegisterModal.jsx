import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/authService';
import { Eye, EyeOff, Mail, Phone, User, Lock, Shield, GraduationCap, Users, BookOpen, Building, ArrowLeft, Send } from 'lucide-react';

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { register, clearError } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState('form'); // 'form', 'verify'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role: 'student'
  });

  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginType, setLoginType] = useState('phone'); // Default to phone as requested

  const roles = [
    {
      value: 'student',
      label: t('auth_role_student'),
      icon: <BookOpen className="w-5 h-5" />,
      description: t('auth_role_student_desc')
    },
    {
      value: 'teacher',
      label: t('auth_role_teacher'),
      icon: <GraduationCap className="w-5 h-5" />,
      description: t('auth_role_teacher_desc')
    },
    {
      value: 'parent',
      label: t('auth_role_parent'),
      icon: <Users className="w-5 h-5" />,
      description: t('auth_role_parent_desc')
    },
    {
      value: 'organization',
      label: "Ta'lim tashkiloti",
      icon: <Building className="w-5 h-5" />,
      description: "Maktab yoki o'quv markazi uchun"
    }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const handleSendCode = async () => {
    if (!formData.phone) {
      setError("Telefon raqam kiritilmagan");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Send verification code
      const response = await authService.sendVerificationCode(formData.phone);

      if (response.success) {
        setStep('verify');
      } else {
        setError(response.message || "Kod yuborishda xatolik");
      }
    } catch (err) {
      // Handle specifically "not linked" error
      if (err.message && err.message.includes("Telegram botga ulanmagan")) {
        setError(
          <span>
            Telefon raqam Telegram botga ulanmagan. Iltimos, avval{" "}
            <a href="https://t.me/Alif24Bot" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              @Alif24Bot
            </a>{" "}
            ga kirib <b>/start</b> tugmasini bosing va raqamingizni yuboring.
          </span>
        );
      } else {
        setError(err.message || "Kod yuborishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      setError("Tasdiqlash kodini kiriting");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Verify code
      const verifyResponse = await authService.verifyCode(formData.phone, verificationCode);

      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message || "Noto'g'ri kod");
      }

      // 2. Register user
      const submitData = {
        ...formData,
        [loginType]: formData[loginType]
      };

      // Map 'admin' selection to 'moderator' for backend
      if (submitData.role === 'admin') {
        submitData.role = 'moderator';
      }

      // Cleanup empty fields
      if (!submitData.email || submitData.email.trim() === '') delete submitData.email;
      if (!submitData.phone || submitData.phone.trim() === '') delete submitData.phone;

      await register(submitData);
      onClose();

      // Redirect based on role
      const role = submitData.role;
      switch (role) {
        case 'admin':
        case 'moderator':
        case 'organization':
          navigate('/organization-dashboard');
          break;
        case 'teacher':
          navigate('/teacher-dashboard');
          break;
        case 'parent':
          navigate('/parent-dashboard');
          break;
        case 'student':
          navigate('/student-dashboard');
          break;
        default:
          navigate('/dashboard');
      }

    } catch (err) {
      setError(err.message || "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = { ...formData };
      if (submitData.role === 'admin') submitData.role = 'moderator';

      // Cleanup
      delete submitData.phone;

      await register(submitData);
      onClose();

      // Redirect logic same as above
      const role = submitData.role;
      /* ... same switch ... */
      if (role === 'moderator' || role === 'organization') navigate('/organization-dashboard');
      else if (role === 'teacher') navigate('/teacher-dashboard');
      else if (role === 'parent') navigate('/parent-dashboard');
      else if (role === 'student') navigate('/student-dashboard');
      else navigate('/dashboard');

    } catch (err) {
      setError(err.message || "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = () => {
    if (step === 'verify') {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Tasdiqlash kodi</h3>
            <p className="text-sm text-gray-500 mt-1">
              {formData.phone} raqamiga Telegram orqali yuborilgan 6 xonali kodni kiriting
            </p>
          </div>

          <div className="flex justify-center my-6">
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="w-48 text-center text-2xl tracking-[0.5em] py-2 border-b-2 border-indigo-500 focus:outline-none bg-transparent"
              placeholder="000000"
              autoFocus
            />
          </div>

          <button
            onClick={handleVerifyAndRegister}
            disabled={loading || verificationCode.length !== 6}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Tasdiqlanmoqda..." : "Tasdiqlash va Kirish"}
          </button>

          <button
            onClick={() => setStep('form')}
            className="w-full text-gray-600 py-2 hover:text-gray-900 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Ortga qaytish
          </button>
        </div>
      );
    }

    // Default 'form' step
    return (
      <form onSubmit={(e) => {
        if (loginType === 'phone') {
          e.preventDefault();
          handleSendCode();
        } else {
          handleEmailRegister(e);
        }
      }} className="space-y-4">
        {/* Name fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth_first_name_label')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder={t('auth_first_name_placeholder')}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth_last_name_label')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder={t('auth_last_name_placeholder')}
                required
              />
            </div>
          </div>
        </div>

        {/* Login type toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setLoginType('phone')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${loginType === 'phone'
              ? 'bg-white shadow-sm text-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Phone className="w-4 h-4" />
            {t('auth_phone')}
          </button>
          <button
            type="button"
            onClick={() => setLoginType('email')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${loginType === 'email'
              ? 'bg-white shadow-sm text-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
        </div>

        {/* Email or Phone field */}
        {loginType === 'email' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth_phone_number_label')}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="+998 90 123 45 67"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              * Tasdiqlash kodi Telegram orqali yuboriladi
            </p>
          </div>
        )}

        {/* Password fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth_password_label')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('auth_password_placeholder')}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth_confirm_password_label')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={t('auth_confirm_password_placeholder2')}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Role selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('auth_your_role')}
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {roles.map((role) => (
              <label
                key={role.value}
                className={`
                  flex items-start p-3 border rounded-lg cursor-pointer transition-all
                  ${formData.role === role.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={formData.role === role.value}
                  onChange={handleChange}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {role.icon}
                    <span className="font-medium">{role.label}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
          ) : (
            <>
              {loginType === 'phone' ? (
                <>
                  <Send className="w-4 h-4" />
                  Kod yuborish
                </>
              ) : t('auth_register_button')}
            </>
          )}
        </button>

        {/* Switch to login */}
        <div className="text-center text-sm text-gray-600">
          {t('auth_already_have_account')}{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {t('auth_login_button')}
          </button>
        </div>
      </form>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {step === 'verify' ? "Telefon raqamni tasdiqlash" : t('auth_register_title')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {getStepContent()}
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
