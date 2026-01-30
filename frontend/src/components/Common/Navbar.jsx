import { useState, useEffect, useRef } from 'react';
import { Home, Menu, Trophy, X, Globe, Volume2, User, Users, HandshakeIcon, LogIn, UserPlus, LogOut, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginModal from '../Auth/LoginModal';
import RegisterModal from '../Auth/RegisterModal';
import AchievementsModal from './AchievementsModal';
// import { useStarsManager } from '../../hooks/useStarsManager'; // TODO: Create this hook

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
  
  // const { totalStars, starsBreakdown, updateStars, getStarsHistory } = useStarsManager(); // TODO: Implement
  const totalStars = 0; // Temporary placeholder
  const starsBreakdown = { harf: 0, math: 0, ertak: 0 }; // Temporary placeholder
  const updateStars = () => {}; // Temporary placeholder
  const getStarsHistory = () => []; // Temporary placeholder

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
    user.role === 'admin' ? '/admin' :
    '/profile'
  ) : '/profile';

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    } else if (path.startsWith('/profile') || path.includes('dashboard') && path !== '/dashboard') {
      setActiveTab('profile');
    } else {
      setActiveTab('home');
    }
  }, [location.pathname]);

  return (
    <>
      {/* Desktop/Mobile Navbar */}
      <header className={`flex justify-between items-center px-5 h-[70px] shadow-lg sticky top-0 z-50 rounded-b-[10px] bg-[#4b30fbcc] ${
        isMobile ? 'bg-transparent shadow-none' : ''
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
              <a 
                href="/dashboard" 
                className="text-[#dcdcdc] text-lg transition-colors hover:text-white no-underline"
              >
                {t('home') || 'Bosh sahifa'}
              </a>
              <a 
                href="/about" 
                className="text-[#dcdcdc] text-lg transition-colors hover:text-white no-underline"
              >
                {t('aboutus') || 'Biz haqimizda'}
              </a>
              <a 
                href="/partners" 
                className="text-[#dcdcdc] text-lg transition-colors hover:text-white no-underline"
              >
                {t('partner') || 'Hamkorlar'}
              </a>
              <a 
                href={profilePath}
                onClick={handleProfileClick}
                className="text-[#dcdcdc] text-lg transition-colors hover:text-white no-underline"
              >
                {t('profile') || 'Profil'}
              </a>
            </nav>

            <div className="flex items-center gap-4">
              
              {/* Language Selector with Flags */}
              <div className="relative " ref={languageDropdownRef}>
                <button 
                  className="flex items-center gap-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white border border-white/30 rounded-full px-4 py-2 cursor-pointer transition-all text-white"
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                >
                  <span className="text-2xl">{currentLanguage.flag}</span>
                  <span className="text-sm font-medium">{currentLanguage.name}</span>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {languageDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden min-w-[200px] border border-gray-200 z-50">
                    {Object.values(languages).map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all border-none text-left ${
                          language === lang.code
                            ? 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white'
                            : 'bg-white text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-3xl">{lang.flag}</span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{lang.name}</span>
                          <span className={`text-xs ${
                            language === lang.code ? 'text-white/80' : 'text-gray-500'
                          }`}>
                            {lang.fullName}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] px-4 py-2 rounded-full text-white">
                    <User size={18} />
                    <span className="text-sm font-medium">{user?.first_name || 'Foydalanuvchi'}</span>
                  </div>



                  <button 
                    className="bg-gradient-to-r from-[#4b30fb] to-[#764ba2] border-none rounded-full w-10 h-10 flex items-center justify-center cursor-pointer text-white transition-colors hover:bg-white/20"
                    onClick={handleLogout}
                    title="Chiqish"
                  >
                    <LogOut size={20} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="flex items-center gap-2 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] px-4 py-2 rounded-full cursor-pointer transition-all hover:bg-white/20 text-white border border-white/30"
                    onClick={handleLogin}
                  >
                    <LogIn size={18} />
                    <span className="text-sm font-medium">{t('login') || 'Kirish'}</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {isMobile && (
          <div className="flex items-center gap-3">
            
            {/* Mobile Language Selector */}
            <div className="relative " ref={languageDropdownRef}>
              <button 
                className="flex items-center gap-1 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] border border-white/30 rounded-full px-2 py-1 cursor-pointer transition-all text-white"
                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              >
                <span className="text-xl">{currentLanguage.flag}</span>
                <ChevronDown 
                  size={14} 
                  className={`transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Mobile Dropdown Menu */}
              {languageDropdownOpen && (
                <div className="absolute top-full right-0 mt-2  rounded-xl shadow-2xl overflow-hidden min-w-[180px] border border-gray-200 z-50">
                  {Object.values(languages).map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`w-full flex items-center  gap-2 px-3 py-2 transition-all border-none text-left ${
                        language === lang.code
                          ? 'bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white'
                          : 'bg-white text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs">{lang.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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

      {/* Mobile Bottom Navbar */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e] flex justify-around py-2 border-t border-white/10 z-[1000] shadow-lg">
          <button 
            className={`flex flex-col items-center text-gray-400 bg-none border-none text-xs gap-1 cursor-pointer p-2 transition-colors hover:text-[#4b30fb] ${
              activeTab === 'home' ? 'text-[#4b30fb]' : ''
            }`}
            onClick={() => { navigate('/dashboard'); }}
          >
            <Home size={22} />
            <span>{t('home') || 'Bosh sahifa'}</span>
          </button>
          <button 
            className={`flex flex-col items-center text-gray-400 bg-none border-none text-xs gap-1 cursor-pointer p-2 transition-colors hover:text-[#4b30fb] ${
              activeTab === 'lessons' ? 'text-[#4b30fb]' : ''
            }`}
            onClick={() => { navigate('/about'); }}
          >
            <Users size={22} />
            <span>{t('aboutus') || 'Biz haqimizda'}</span>
          </button>
          <button 
            className={`flex flex-col items-center text-gray-400 bg-none border-none text-xs gap-1 cursor-pointer p-2 transition-colors hover:text-[#4b30fb] ${
              activeTab === 'games' ? 'text-[#4b30fb]' : ''
            }`}
            onClick={() => { navigate('/partners'); }}
          >
            <HandshakeIcon size={22} />
            <span>{t('partner') || 'Hamkorlar'}</span>
          </button>
          <button 
            className={`flex flex-col items-center text-gray-400 bg-none border-none text-xs gap-1 cursor-pointer p-2 transition-colors hover:text-[#4b30fb] ${
              activeTab === 'profile' ? 'text-[#4b30fb]' : ''
            }`}
            onClick={handleProfileClick}
          >
            <User size={22} />
            <span>{t('profile') || 'Profil'}</span>
          </button>
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