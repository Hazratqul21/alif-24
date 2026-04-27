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
  const [oauthError, setOauthError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_error')) {
      setOauthError("Google orqali kirishda xatolik. Qaytadan urinib ko'ring.");
      params.delete('oauth_error');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

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
      // Backend automatically sets HttpOnly Cookies now.

      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect');

      if (redirectUrl) {
        try {
          const parsed = new URL(redirectUrl, window.location.origin);
          const ALLOWED_HOSTS = ['alif24.uz', 'www.alif24.uz', 'olimp.alif24.uz', 'harf.alif24.uz', 'games.alif24.uz', 'testai.alif24.uz', 'lessions.alif24.uz', 'localhost', '127.0.0.1'];
          if (ALLOWED_HOSTS.includes(parsed.hostname)) {
            window.location.href = redirectUrl;
            return;
          }
        } catch { /* invalid URL, ignore */ }
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
        try {
          const parsed = new URL(redirectUrl, window.location.origin);
          const ALLOWED_HOSTS = ['alif24.uz', 'www.alif24.uz', 'olimp.alif24.uz', 'harf.alif24.uz', 'games.alif24.uz', 'testai.alif24.uz', 'lessions.alif24.uz', 'localhost', '127.0.0.1'];
          if (ALLOWED_HOSTS.includes(parsed.hostname)) {
            window.location.href = redirectUrl;
            return;
          }
        } catch { /* invalid URL, ignore */ }
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
          {oauthError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              {oauthError}
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
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
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
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center tracking-[0.5em] text-lg text-gray-900"
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
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
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
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

            {/* Google OAuth — kids (PIN) can't use Google */}
            {loginType !== 'child' && (
              <>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-gray-400">yoki</span>
                  </div>
                </div>
                <a
                  href="/api/v1/auth/google/login"
                  className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-0.792 2.237-2.231 4.166-4.087 5.571c0.001-0.001 0.002-0.001 0.003-0.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-0.138-2.65-0.389-3.917z"/>
                  </svg>
                  Google bilan kirish
                </a>
              </>
            )}

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
