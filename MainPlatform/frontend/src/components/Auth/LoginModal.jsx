import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import apiService from '../../services/apiService';
import { Eye, EyeOff, Mail, Phone, Lock, User } from 'lucide-react';

const LoginModal = ({ isOpen, onClose, onSwitchToRegister }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, clearError } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    username: '',
    pin: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState('email'); // 'email', 'phone', or 'child'
  const [childLoading, setChildLoading] = useState(false);
  const [childError, setChildError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) clearError();
  };

  const handleChildLogin = async (e) => {
    e.preventDefault();
    setChildError(null);
    setChildLoading(true);
    try {
      const res = await apiService.post('/auth/child-login', {
        username: formData.username,
        pin: formData.pin
      });
      const data = res.data;
      localStorage.setItem('accessToken', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);

      // Check for redirect param
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect');

      if (redirectUrl) {
        // We pass the token back to the subdomain
        const urlObj = new URL(redirectUrl);
        urlObj.searchParams.set('token', data.access_token);
        urlObj.searchParams.set('refresh', data.refresh_token);
        window.location.href = urlObj.toString();
        return;
      }

      window.location.href = '/student-dashboard';
    } catch (err) {
      setChildError(err.message || 'Username yoki PIN xato');
    } finally {
      setChildLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loginType === 'child') {
      return handleChildLogin(e);
    }

    try {
      const identifier = loginType === 'email' ? formData.email : formData.phone;
      const password = formData.password;

      if (!identifier || !password) {
        return;
      }

      const response = await login(identifier, password);
      onClose();

      // Check for redirect param
      const urlParams = new URLSearchParams(window.location.search);
      let redirectUrl = urlParams.get('redirect');

      if (!redirectUrl && location && location.search) {
        const locParams = new URLSearchParams(location.search);
        redirectUrl = locParams.get('redirect');
      }

      if (redirectUrl) {
        // We pass the token to the redirect URL
        const urlObj = new URL(redirectUrl);
        urlObj.searchParams.set('token', response.tokens.access_token);
        urlObj.searchParams.set('refresh', response.tokens.refresh_token);
        window.location.href = urlObj.toString();
        return;
      }

      // Redirect based on role
      const role = response.user.role;
      switch (role) {
        case 'admin':
        case 'super_admin':
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
      console.error("Login submit error:", err);
      // Error is handled by AuthContext
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('auth_login_title')}</h2>
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
            {/* Login type toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setLoginType('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-sm ${loginType === 'email'
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
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-sm ${loginType === 'phone'
                  ? 'bg-white shadow-sm text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Phone className="w-4 h-4" />
                {t('auth_phone')}
              </button>
              <button
                type="button"
                onClick={() => setLoginType('child')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-sm ${loginType === 'child'
                  ? 'bg-white shadow-sm text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <User className="w-4 h-4" />
                Bola
              </button>
            </div>

            {/* Child login fields */}
            {loginType === 'child' ? (
              <>
                {childError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {childError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="ali_v1234"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN kod</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="password"
                      name="pin"
                      value={formData.pin}
                      onChange={handleChange}
                      maxLength={6}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center tracking-[0.5em] text-lg"
                      placeholder="••••"
                      required
                    />
                  </div>
                </div>
              </>
            ) : loginType === 'email' ? (
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
                    placeholder={t('auth_email_placeholder')}
                    required={loginType === 'email'}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth_phone_label')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={t('auth_phone_placeholder')}
                    required={loginType === 'phone'}
                  />
                </div>
              </div>
            )}

            {/* Password field (not for child login) */}
            {loginType !== 'child' && <div>
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
            </div>}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(loading || childLoading) ? t('loading') : (loginType === 'child' ? 'Kirish (Bola)' : t('auth_login_button'))}
            </button>

            {/* Switch to register */}
            <div className="text-center text-sm text-gray-600">
              {t('auth_no_account')}{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {t('auth_register_button')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
