import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Eye, EyeOff, Mail, Phone, User, Lock, Shield, GraduationCap, Users, BookOpen } from 'lucide-react';

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role: 'student'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginType, setLoginType] = useState('email'); // 'email' or 'phone'

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
      value: 'admin',
      label: t('auth_role_admin'),
      icon: <Shield className="w-5 h-5" />,
      description: t('auth_role_admin_desc')
    }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        [loginType]: formData[loginType]
      };

      // Ensure unused or empty fields are strictly removed
      if (!submitData.email || submitData.email.trim() === '') {
        delete submitData.email;
      }
      if (!submitData.phone || submitData.phone.trim() === '') {
        delete submitData.phone;
      }

      await register(submitData);
      onClose();

      // Redirect based on role
      const role = submitData.role;
      switch (role) {
        case 'admin':
          navigate('/admin');
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
      // Error is handled by AuthContext
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('auth_register_title')}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                onClick={() => setLoginType('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${loginType === 'email'
                    ? 'bg-white shadow-sm text-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
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
                    placeholder="+998 90 827 83 58"
                  />
                </div>
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
              <div className="space-y-2">
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
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth_registering') : t('auth_register_button')}
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
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
