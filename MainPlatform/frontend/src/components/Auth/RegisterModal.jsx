import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authService } from '../../services/authService';
import { Eye, EyeOff, Mail, Phone, User, Lock, Shield, GraduationCap, Users, BookOpen, Building, ArrowLeft, ArrowRight, Send, Calendar, MapPin, Briefcase, School, ChevronRight, Check } from 'lucide-react';

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { register, clearError } = useAuth();
  const { t } = useLanguage();

  // Steps: 'form' -> 'details' -> 'verify' (phone) or direct register (email)
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role: 'student',
    // Step 2 fields
    date_of_birth: '',
    gender: '',
    grade: '',
    school_name: '',
    specialty: '',
    experience_years: '',
    organization_name: '',
    organization_type: '',
    organization_address: '',
    organization_role: '',
  });

  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginType, setLoginType] = useState('phone');

  const roles = [
    {
      value: 'student',
      label: t('auth_role_student') || "O'quvchi",
      icon: <BookOpen className="w-5 h-5" />,
      description: t('auth_role_student_desc') || "O'quvchi sifatida o'rganish"
    },
    {
      value: 'teacher',
      label: t('auth_role_teacher') || "O'qituvchi",
      icon: <GraduationCap className="w-5 h-5" />,
      description: t('auth_role_teacher_desc') || "O'qituvchi sifatida dars berish"
    },
    {
      value: 'parent',
      label: t('auth_role_parent') || "Ota-ona",
      icon: <Users className="w-5 h-5" />,
      description: t('auth_role_parent_desc') || "Bolangizning progressini kuzatish"
    },
    {
      value: 'organization',
      label: "Ta'lim tashkiloti",
      icon: <Building className="w-5 h-5" />,
      description: "Maktab yoki o'quv markazi uchun"
    }
  ];

  const grades = [
    '1-sinf', '2-sinf', '3-sinf', '4-sinf', '5-sinf',
    '6-sinf', '7-sinf', '8-sinf', '9-sinf', '10-sinf', '11-sinf'
  ];

  const specialties = [
    "Matematika", "Fizika", "Kimyo", "Biologiya", "Informatika",
    "Ona tili", "Adabiyot", "Ingliz tili", "Tarix", "Geografiya",
    "Boshlang'ich sinf", "Boshqa"
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  // Step 1 validation — go to Step 2 (details)
  const goToDetails = () => {
    if (!formData.first_name.trim() || formData.first_name.trim().length < 2) {
      setError("Ism kamida 2 ta harfdan iborat bo'lishi kerak");
      return;
    }
    if (!formData.last_name.trim() || formData.last_name.trim().length < 2) {
      setError("Familiya kamida 2 ta harfdan iborat bo'lishi kerak");
      return;
    }
    if (loginType === 'phone' && !formData.phone.trim()) {
      setError("Telefon raqam kiritilmagan");
      return;
    }
    if (loginType === 'email' && !formData.email.trim()) {
      setError("Email kiritilmagan");
      return;
    }
    if (formData.password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError("Parollar mos kelmaydi");
      return;
    }
    setError(null);
    setStep('details');
  };

  // Step 2 — proceed to verify or register
  const goToVerifyOrRegister = async () => {
    setError(null);
    if (loginType === 'phone') {
      await handleSendCode();
    } else {
      await handleEmailRegister();
    }
  };

  const handleSendCode = async () => {
    if (!formData.phone) {
      setError("Telefon raqam kiritilmagan");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.sendVerificationCode(formData.phone);

      if (response.success) {
        setStep('verify');
      } else {
        setError(response.message || "Kod yuborishda xatolik");
      }
    } catch (err) {
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

  const buildSubmitData = () => {
    const submitData = { ...formData };
    if (submitData.role === 'admin') submitData.role = 'moderator';

    // Cleanup empty fields
    if (!submitData.email || submitData.email.trim() === '') delete submitData.email;
    if (!submitData.phone || submitData.phone.trim() === '') delete submitData.phone;
    if (!submitData.date_of_birth) delete submitData.date_of_birth;
    if (!submitData.gender) delete submitData.gender;
    if (!submitData.grade) delete submitData.grade;
    if (!submitData.school_name || !submitData.school_name.trim()) delete submitData.school_name;
    if (!submitData.specialty) delete submitData.specialty;
    if (!submitData.experience_years) delete submitData.experience_years;
    else submitData.experience_years = parseInt(submitData.experience_years);
    if (!submitData.organization_name || !submitData.organization_name.trim()) delete submitData.organization_name;
    if (!submitData.organization_type) delete submitData.organization_type;
    if (!submitData.organization_address || !submitData.organization_address.trim()) delete submitData.organization_address;

    delete submitData.confirm_password;
    return submitData;
  };

  const redirectByRole = (role) => {
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
      const verifyResponse = await authService.verifyCode(formData.phone, verificationCode);
      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message || "Noto'g'ri kod");
      }

      const submitData = buildSubmitData();
      await register(submitData);
      onClose();
      redirectByRole(submitData.role);
    } catch (err) {
      setError(err.message || "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = buildSubmitData();
      delete submitData.phone;

      await register(submitData);
      onClose();
      redirectByRole(submitData.role);
    } catch (err) {
      setError(err.message || "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  // ======================== STEP INDICATORS ========================
  const stepNames = ['form', 'details', 'verify'];
  const stepLabels = ["Ma'lumotlar", "Qo'shimcha", "Tasdiqlash"];
  const currentStepIndex = stepNames.indexOf(step);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {stepLabels.map((label, i) => {
        const isActive = i === currentStepIndex;
        const isDone = i < currentStepIndex;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${isActive ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300' :
                isDone ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-400'
              }`}>
              {isDone ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              <span>{label}</span>
            </div>
            {i < stepLabels.length - 1 && (
              <ChevronRight className={`w-3 h-3 ${isDone ? 'text-green-400' : 'text-gray-300'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  // ======================== STEP 1: FORM ========================
  const renderFormStep = () => (
    <div className="space-y-4">
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth_first_name_label') || 'Ism'}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder={t('auth_first_name_placeholder') || 'Ismingiz'}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth_last_name_label') || 'Familiya'}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder={t('auth_last_name_placeholder') || 'Familiyangiz'}
              required
            />
          </div>
        </div>
      </div>

      {/* Login type toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setLoginType('phone')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-sm ${loginType === 'phone'
            ? 'bg-white shadow-sm text-indigo-600 font-medium'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <Phone className="w-4 h-4" />
          {t('auth_phone') || 'Telefon'}
        </button>
        <button
          type="button"
          onClick={() => setLoginType('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-sm ${loginType === 'email'
            ? 'bg-white shadow-sm text-indigo-600 font-medium'
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="email@example.com"
              required
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth_phone_number_label') || 'Telefon raqam'}
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="+998 90 123 45 67"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">* Tasdiqlash kodi Telegram orqali yuboriladi</p>
        </div>
      )}

      {/* Password fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth_password_label') || 'Parol'}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Kamida 6 ta belgi"
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
            {t('auth_confirm_password_label') || 'Tasdiqlash'}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Parolni takrorlang"
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
      </div>

      {/* Role selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('auth_your_role') || 'Rolingiz'}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {roles.map((role) => (
            <label
              key={role.value}
              className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${formData.role === role.value
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <input
                type="radio"
                name="role"
                value={role.value}
                checked={formData.role === role.value}
                onChange={handleChange}
                className="sr-only"
              />
              <div className={`p-1.5 rounded-lg ${formData.role === role.value ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                {role.icon}
              </div>
              <div>
                <span className="text-sm font-medium block">{role.label}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{role.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={goToDetails}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
      >
        Davom etish
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Switch to login */}
      <div className="text-center text-sm text-gray-600">
        {t('auth_already_have_account') || "Akkauntingiz bormi?"}{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          {t('auth_login_button') || 'Kirish'}
        </button>
      </div>
    </div>
  );

  // ======================== STEP 2: DETAILS ========================
  const renderDetailsStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm text-gray-500">
          {formData.role === 'student' && "O'quvchi ma'lumotlarini to'ldiring"}
          {formData.role === 'teacher' && "O'qituvchi ma'lumotlarini to'ldiring"}
          {formData.role === 'parent' && "Ota-ona ma'lumotlarini to'ldiring"}
          {formData.role === 'organization' && "Tashkilot ma'lumotlarini to'ldiring"}
        </p>
      </div>

      {/* Date of Birth & Gender — faqat student va teacher uchun */}
      {(formData.role === 'student' || formData.role === 'teacher') && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Tug'ilgan sana
            </label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jins</label>
            <div className="flex gap-2">
              <label className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border rounded-xl cursor-pointer transition-all text-sm ${formData.gender === 'male' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={handleChange} className="sr-only" />
                <span>Erkak</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border rounded-xl cursor-pointer transition-all text-sm ${formData.gender === 'female' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={handleChange} className="sr-only" />
                <span>Ayol</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Student-specific fields */}
      {formData.role === 'student' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <School className="w-3.5 h-3.5 inline mr-1" />
              Sinf
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {grades.map(g => (
                <label key={g} className={`flex items-center justify-center py-2 border rounded-lg cursor-pointer transition-all text-xs font-medium ${formData.grade === g ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}>
                  <input type="radio" name="grade" value={g} checked={formData.grade === g} onChange={handleChange} className="sr-only" />
                  {g}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Maktab nomi (ixtiyoriy)
            </label>
            <input
              type="text"
              name="school_name"
              value={formData.school_name}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Masalan: 1-son umumiy o'rta ta'lim maktabi"
            />
          </div>
        </>
      )}

      {/* Teacher-specific fields */}
      {formData.role === 'teacher' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="w-3.5 h-3.5 inline mr-1" />
              Mutaxassislik
            </label>
            <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
              {specialties.map(s => (
                <label key={s} className={`flex items-center justify-center py-2 px-1 border rounded-lg cursor-pointer transition-all text-xs font-medium ${formData.specialty === s ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}>
                  <input type="radio" name="specialty" value={s} checked={formData.specialty === s} onChange={handleChange} className="sr-only" />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ish tajribasi (yil)</label>
            <input
              type="number"
              name="experience_years"
              value={formData.experience_years}
              onChange={handleChange}
              min="0"
              max="50"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Masalan: 5"
            />
          </div>
        </>
      )}

      {/* Parent-specific fields — minimal, just common fields above */}
      {formData.role === 'parent' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-700">
            Ro'yxatdan o'tganingizdan keyin, bolangizni profilingizga qo'shishingiz mumkin bo'ladi.
          </p>
        </div>
      )}

      {/* Organization-specific fields (B2B) */}
      {formData.role === 'organization' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Building className="w-3.5 h-3.5 inline mr-1" />
              Tashkilot nomi *
            </label>
            <input
              type="text"
              name="organization_name"
              value={formData.organization_name}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Masalan: Bilim Ziyo o'quv markazi"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tashkilot turi *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'maktab', label: 'Maktab' },
                { value: 'oquv_markazi', label: "O'quv markazi" },
                { value: 'boshqa', label: 'Boshqa' }
              ].map(t => (
                <label key={t.value} className={`flex items-center justify-center py-2.5 border rounded-xl cursor-pointer transition-all text-sm font-medium ${formData.organization_type === t.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <input type="radio" name="organization_type" value={t.value} checked={formData.organization_type === t.value} onChange={handleChange} className="sr-only" />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="w-3.5 h-3.5 inline mr-1" />
              Tashkilotdagi lavozimingiz *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'direktor', label: 'Direktor/Mudir' },
                { value: 'oqituvchi', label: "O'qituvchi" },
                { value: 'administrator', label: 'Administrator' },
                { value: 'boshqa', label: 'Boshqa' }
              ].map(r => (
                <label key={r.value} className={`flex items-center justify-center py-2.5 border rounded-xl cursor-pointer transition-all text-sm font-medium ${formData.organization_role === r.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <input type="radio" name="organization_role" value={r.value} checked={formData.organization_role === r.value} onChange={handleChange} className="sr-only" />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Manzil (ixtiyoriy)
            </label>
            <input
              type="text"
              name="organization_address"
              value={formData.organization_address}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Toshkent sh., Chilonzor t."
            />
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <p className="text-xs text-indigo-700">
              📋 Ro'yxatdan o'tuvchi: <strong>{formData.first_name} {formData.last_name}</strong>
            </p>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => { setStep('form'); setError(null); }}
          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Ortga
        </button>
        <button
          type="button"
          onClick={goToVerifyOrRegister}
          disabled={loading}
          className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
          ) : loginType === 'phone' ? (
            <>
              <Send className="w-4 h-4" />
              Kod yuborish
            </>
          ) : (
            <>
              Ro'yxatdan o'tish
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  // ======================== STEP 3: VERIFY ========================
  const renderVerifyStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Phone className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Tasdiqlash kodi</h3>
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-medium text-gray-700">{formData.phone}</span> raqamiga Telegram orqali 6 xonali kod yuborildi
        </p>
      </div>

      <div className="flex justify-center my-4">
        <input
          type="text"
          maxLength={6}
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
          className="w-52 text-center text-2xl tracking-[0.5em] py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50"
          placeholder="000000"
          autoFocus
        />
      </div>

      <button
        onClick={handleVerifyAndRegister}
        disabled={loading || verificationCode.length !== 6}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Tasdiqlash va ro'yxatdan o'tish
          </>
        )}
      </button>

      <button
        onClick={() => { setStep('details'); setError(null); }}
        className="w-full text-gray-600 py-2 hover:text-gray-900 flex items-center justify-center gap-2 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Ortga qaytish
      </button>
    </div>
  );

  // ======================== RENDER ========================
  if (!isOpen) return null;

  const stepTitles = {
    form: t('auth_register_title') || "Ro'yxatdan o'tish",
    details: "Qo'shimcha ma'lumotlar",
    verify: "Telefon tasdiqlash"
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl relative">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">{stepTitles[step]}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          {renderStepIndicator()}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Step content */}
          {step === 'form' && renderFormStep()}
          {step === 'details' && renderDetailsStep()}
          {step === 'verify' && renderVerifyStep()}
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
