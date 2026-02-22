import { useState, useEffect, useRef } from 'react';
import { Home, Menu, Trophy, X, Globe, Volume2, User, Users, HandshakeIcon, LogIn, UserPlus, LogOut, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginModal from '../Auth/LoginModal';
import RegisterModal from '../Auth/RegisterModal';
import AchievementsModal from './AchievementsModal';
import { useStarsManager } from '../../hooks/useStarsManager';

/**
 * Navigation Bar Component
 * Responsive navbar with settings and mobile navigation
 */
const Navbar = () => {
  const { t, language, switchLanguage } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [volume, setVolume] = useState(70);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [achievementsModalOpen, setAchievementsModalOpen] = useState(false);
  const languageDropdownRef = useRef(null);

  const { totalStars, starsBreakdown, updateStars, getStarsHistory } = useStarsManager();

  // Language configurations with flags
  const languages = {
    uz: {
      code: 'uz',
      flag: '🇺🇿',

    },
    ru: {
      code: 'ru',
      flag: '🇷🇺',

    },
    en: {
      code: 'en',
      flag: '🇺🇸',

    }
  };

  const currentLanguage = languages[language] || languages.uz;

  const profilePath = isAuthenticated && user ? (
    user.role === 'student' ? '/student-dashboard' :
      user.role === 'teacher' ? '/teacher-dashboard' :
        user.role === 'parent' ? '/parent-dashboard' :
          (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator' || user.role === 'organization') ? '/organization-dashboard' :
            '/profile'
  ) : '/profile';

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleShowLogin = (e) => {
      setLoginModalOpen(true);
    };
    window.addEventListener('showLoginModal', handleShowLogin);
    return () => window.removeEventListener('showLoginModal', handleShowLogin);
  }, []);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setLanguageDropdownOpen(false);
      }
    };

    if (languageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [languageDropdownOpen]);

  const handleProfileClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate(profilePath);
    } else {
      setLoginModalOpen(true);
    }
  };

  const setLanguage = (lang) => {
    switchLanguage(lang);
    setLanguageDropdownOpen(false);
  };

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  const handleLogin = () => {
    setLoginModalOpen(true);
  };

  const handleRegister = () => {
    setRegisterModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeLoginModal = () => {
    setLoginModalOpen(false);
  };

  const closeRegisterModal = () => {
    setRegisterModalOpen(false);
  };

  useEffect(() => {
    const path = location.pathname || '';
    if (path.startsWith('/dashboard')) {
      setActiveTab('home');
    } else if (path.startsWith('/about')) {
      setActiveTab('lessons');
    } else if (path.startsWith('/partners')) {
      setActiveTab('games');
    } else if (path.startsWith('/profile') || (path.includes('dashboard') && path !== '/dashboard')) {
      setActiveTab('profile');
    } else {
      setActiveTab('home');
    }
  }, [location.pathname]);

  return (
    <>
      {/* Desktop/Mobile Navbar */}
      <header className={`flex justify-between items-center px-5 h-[70px] shadow-lg sticky top-0 z-50  bg-[#4b30fbcc] 
      ${isMobile ? 'bg-gradient-to-r from-green-400/50 to-blue-500/50 shadow-none' : ''
        }`}>
        <div className="flex items-center gap-4 ">
          <div
            className="w-[65px] h-[65px] flex items-center gap-2 cursor-pointer"
            onClick={handleLogoClick}
          >
            <img src="/Logo.png" alt="Alifbe Logo" className="w-full h-full" />
          </div>
        </div>

        {!isMobile && (
          <>
            <nav className="flex gap-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-[#dcdcdc] text-lg transition-colors hover:text-white bg-transparent border-none cursor-pointer"
              >
                {t('home') || 'Bosh sahifa'}
              </button>
              <button
                onClick={() => navigate('/partners')}
                className="text-[#dcdcdc] text-lg transition-colors hover:text-white bg-transparent border-none cursor-pointer"
              >
                {t('partner') || 'Hamkorlar'}
              </button>
              <button
                onClick={handleProfileClick}
                className="text-[#dcdcdc] text-lg transition-colors hover:text-white bg-transparent border-none cursor-pointer"
              >
                {t('profile') || 'Profil'}
              </button>
            </nav>

            <div className="flex items-center gap-4">

              {/* Language Selector (Text-based, Pro Design) */}
              <div className="relative" ref={languageDropdownRef}>
                <button
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 cursor-pointer transition-all duration-300 group"
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                >
                  <Globe size={18} className="text-white/80 group-hover:text-white transition-colors" />
                  <span className="text-white font-bold tracking-wider text-sm">{currentLanguage.code.toUpperCase()}</span>
                  <ChevronDown
                    size={16}
                    className={`text-white/80 transition-transform duration-300 ${languageDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`absolute top-full right-0 mt-3 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/10 overflow-hidden min-w-[160px] z-50 transition-all duration-300 origin-top-right ${languageDropdownOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                    }`}
                >
                  {Object.values(languages).map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-4 py-3 transition-all border-none text-left group ${language === lang.code
                        ? 'bg-white/10 text-white'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold tracking-wider text-sm">{lang.code.toUpperCase()}</span>
                        <span className="text-[10px] opacity-60 font-medium">
                          {lang.code === 'uz' ? 'O\'zbekcha' : lang.code === 'ru' ? 'Русский' : 'English'}
                        </span>
                      </div>
                      {language === lang.code && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4b30fb] shadow-[0_0_8px_#4b30fb]"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl text-white cursor-pointer hover:bg-white/20 transition-all"
                    onClick={() => navigate(profilePath)}
                  >
                    <User size={18} className="text-white/90" />
                    <span className="text-sm font-medium">{user?.first_name || 'Foydalanuvchi'}</span>
                  </div>

                  <button
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl w-10 h-10 flex items-center justify-center cursor-pointer text-white transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    onClick={handleLogout}
                    title="Chiqish"
                  >
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl px-5 py-2 cursor-pointer transition-all duration-300 text-white hover:shadow-[0_0_20px_rgba(75,48,251,0.4)]"
                    onClick={handleLogin}
                  >
                    <LogIn size={18} />
                    <span className="text-sm font-bold tracking-wide">{t('login') || 'Kirish'}</span>
                  </button>
                  <button
                    className="flex items-center gap-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] hover:from-[#5b40ff] hover:to-[#8655b2] border-none rounded-xl px-5 py-2 cursor-pointer transition-all duration-300 text-white shadow-[0_4px_15px_rgba(75,48,251,0.4)] hover:shadow-[0_8px_25px_rgba(75,48,251,0.6)] hover:scale-105"
                    onClick={handleRegister}
                  >
                    <UserPlus size={18} />
                    <span className="text-sm font-bold tracking-wide">{t('auth_register_button') || "Ro'yxatdan o'tish"}</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {isMobile && (
          <div className="flex items-center gap-3">

            {/* Mobile Language Selector */}
            <div className="relative" ref={languageDropdownRef}>
              <button
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 cursor-pointer transition-all text-white active:scale-95"
                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              >
                <span className="text-sm font-bold tracking-wider">{currentLanguage.code.toUpperCase()}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-300 ${languageDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Mobile Dropdown Menu */}
              <div
                className={`absolute top-full right-0 mt-2 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden min-w-[140px] z-50 transition-all duration-300 origin-top-right ${languageDropdownOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}
              >
                {Object.values(languages).map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-all border-none text-left ${language === lang.code
                      ? 'bg-white/10 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <span className="font-bold text-sm tracking-wider">{lang.code.toUpperCase()}</span>
                    {language === lang.code && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4b30fb]"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-1 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] px-2 py-1 rounded-full text-white">
                  <User size={16} />
                  <span className="text-xs font-medium hidden sm:inline">{user?.first_name?.charAt(0) || 'F'}</span>
                </div>

                <button
                  className="bg-white/10 border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-white transition-colors hover:bg-white/20"
                  onClick={handleLogout}
                  title="Chiqish"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  className="bg-gradient-to-r from-[#4b30fb] to-[#764ba2] border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-white transition-colors hover:bg-white/20"
                  onClick={handleLogin}
                  title="Kirish"
                >
                  <LogIn size={16} />
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Navbar — faqat HomePage da ko'rsatiladi, dashboard sahifalarida emas (ular o'z nav ini ishlatadi) */}
      {isMobile && !location.pathname.includes('dashboard') && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-[#0f0f1a]/95 backdrop-blur-lg flex justify-around pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-white/10 z-[1000] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        >
          {[
            {
              key: "home",
              icon: Home,
              label: t("home") || "Asosiy",
              path: "/dashboard",
            },
            {
              key: "games",
              icon: HandshakeIcon,
              label: t("partner") || "Hamkorlar",
              path: "/partners",
            },
            {
              key: "profile",
              icon: User,
              label: t("profile") || "Profil",
              path: null,
            },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                className={`relative flex flex-col items-center bg-transparent border-none text-[10px] gap-0.5 cursor-pointer px-3 py-1.5 transition-all duration-200 ${isActive
                    ? "text-[#4b30fb]"
                    : "text-gray-500 active:scale-95"
                  }`}
                onClick={() =>
                  tab.path
                    ? navigate(tab.path)
                    : handleProfileClick({ preventDefault: () => { } })
                }
              >
                {isActive && (
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[#4b30fb] shadow-[0_0_8px_#4b30fb]"
                  />
                )}
                <TabIcon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span
                  className={`font-medium truncate max-w-[60px] ${isActive ? "font-bold" : ""
                    }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })
          }
        </nav>
      )}

      {/* Authentication Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={closeLoginModal}
        onSwitchToRegister={() => {
          closeLoginModal();
          handleRegister();
        }}
      />

      <RegisterModal
        isOpen={registerModalOpen}
        onClose={closeRegisterModal}
        onSwitchToLogin={() => {
          closeRegisterModal();
          handleLogin();
        }}
      />

      {/* Achievements Modal */}
      <AchievementsModal
        isOpen={achievementsModalOpen}
        onClose={() => setAchievementsModalOpen(false)}
        totalStars={totalStars}
        starsBreakdown={starsBreakdown}
        getStarsHistory={getStarsHistory}
      />
    </>
  );
};

export default Navbar;