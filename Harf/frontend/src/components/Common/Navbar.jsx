import { useState, useEffect, useRef } from 'react';
import { Home, Menu, X, Globe, User, LogIn, LogOut, ChevronDown, ArrowLeft, BookOpen } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginModal from '../Auth/LoginModal';
import RegisterModal from '../Auth/RegisterModal';
import AchievementsModal from './AchievementsModal';
import { useStarsManager } from '../../hooks/useStarsManager';

/**
 * Navigation Bar Component — Harf Platform
 * Fixed: removed non-existent routes, added back button to main platform
 */
const MAIN_PLATFORM_URL = 'https://alif24.uz';

const Navbar = () => {
  const { t, language, switchLanguage } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('harf');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [achievementsModalOpen, setAchievementsModalOpen] = useState(false);
  const languageDropdownRef = useRef(null);

  const { totalStars, starsBreakdown, updateStars, getStarsHistory } = useStarsManager();

  const languages = {
    uz: { code: 'uz', label: "O'zbekcha" },
    ru: { code: 'ru', label: 'Русский' },
    en: { code: 'en', label: 'English' },
  };
  const currentLanguage = languages[language] || languages.uz;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setLanguageDropdownOpen(false);
      }
    };
    if (languageDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [languageDropdownOpen]);

  // Active tab based on route
  useEffect(() => {
    const path = location.pathname || '';
    if (path.startsWith('/rharf')) setActiveTab('rharf');
    else if (path.startsWith('/eharf')) setActiveTab('eharf');
    else setActiveTab('harf');
  }, [location.pathname]);

  const setLanguage = (lang) => {
    switchLanguage(lang);
    setLanguageDropdownOpen(false);
  };

  const handleBackToMain = () => {
    window.location.href = MAIN_PLATFORM_URL;
  };

  const handleLogin = () => setLoginModalOpen(true);
  const handleRegister = () => setRegisterModalOpen(true);
  
  const closeLoginModal = () => setLoginModalOpen(false);
  const closeRegisterModal = () => setRegisterModalOpen(false);

  return (
    <>
      {/* Top Navbar */}
      <header className={`flex justify-between items-center px-5 h-[70px] shadow-lg sticky top-0 z-50 rounded-b-[10px] bg-[#4b30fbcc] ${isMobile ? 'bg-transparent shadow-none' : ''}`}>
        <div className="flex items-center gap-3">
          {/* Back to main platform */}
          <button
            onClick={handleBackToMain}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 cursor-pointer transition-all text-white"
            title="Asosiy platformaga qaytish"
          >
            <ArrowLeft size={18} />
            {!isMobile && <span className="text-sm font-medium">Orqaga</span>}
          </button>

          <div
            className="w-[55px] h-[55px] flex items-center cursor-pointer"
            onClick={() => navigate('/harf')}
          >
            <img src="/Logo.png" alt="Alifbe Logo" className="w-full h-full" />
          </div>
        </div>

        {!isMobile && (
          <>
            {/* Desktop nav — only letter tabs */}
            <nav className="flex gap-3">
              <button
                onClick={() => navigate('/harf')}
                className={`text-sm font-bold px-4 py-2 rounded-xl transition-all border-none cursor-pointer ${activeTab === 'harf' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white bg-transparent'}`}
              >
                🇺🇿 O'zbek alifbosi
              </button>
              <button
                onClick={() => navigate('/rharf')}
                className={`text-sm font-bold px-4 py-2 rounded-xl transition-all border-none cursor-pointer ${activeTab === 'rharf' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white bg-transparent'}`}
              >
                🇷🇺 Русский алфавит
              </button>
              <button
                onClick={() => navigate('/eharf')}
                className={`text-sm font-bold px-4 py-2 rounded-xl transition-all border-none cursor-pointer ${activeTab === 'eharf' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white bg-transparent'}`}
              >
                🇺🇸 English ABC
              </button>
            </nav>

            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="relative" ref={languageDropdownRef}>
                <button
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 cursor-pointer transition-all group"
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                >
                  <Globe size={18} className="text-white/80 group-hover:text-white" />
                  <span className="text-white font-bold tracking-wider text-sm">{currentLanguage.code.toUpperCase()}</span>
                  <ChevronDown size={16} className={`text-white/80 transition-transform duration-300 ${languageDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`absolute top-full right-0 mt-3 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden min-w-[160px] z-50 transition-all duration-300 origin-top-right ${languageDropdownOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                  {Object.values(languages).map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-4 py-3 transition-all border-none text-left ${language === lang.code ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold tracking-wider text-sm">{lang.code.toUpperCase()}</span>
                        <span className="text-[10px] opacity-60">{lang.label}</span>
                      </div>
                      {language === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-[#4b30fb]"></div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auth */}
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl text-white">
                    <User size={18} />
                    <span className="text-sm font-medium">{user?.first_name || 'Foydalanuvchi'}</span>
                  </div>
                 
                </>
              ) : (
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl px-5 py-2 cursor-pointer transition-all text-white" onClick={handleLogin}>
                  <LogIn size={18} />
                  <span className="text-sm font-bold">{t('login') || 'Kirish'}</span>
                </button>
              )}
            </div>
          </>
        )}

        {isMobile && (
          <div className="flex items-center gap-3">
            {/* Mobile language */}
            <div className="relative" ref={!isMobile ? undefined : languageDropdownRef}>
              <button
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 cursor-pointer text-white active:scale-95"
                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
              >
                <span className="text-sm font-bold tracking-wider">{currentLanguage.code.toUpperCase()}</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${languageDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`absolute top-full right-0 mt-2 bg-[#1a1a2e]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden min-w-[140px] z-50 transition-all duration-300 origin-top-right ${languageDropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                {Object.values(languages).map((lang) => (
                  <button key={lang.code} onClick={() => setLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-4 py-3 border-none text-left ${language === lang.code ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
                    <span className="font-bold text-sm tracking-wider">{lang.code.toUpperCase()}</span>
                    {language === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-[#4b30fb]"></div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile auth */}
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-1 bg-gradient-to-r from-[#4b30fb] to-[#764ba2] px-2 py-1 rounded-full text-white">
                  <User size={16} />
                  <span className="text-xs font-medium hidden sm:inline">{user?.first_name?.charAt(0) || 'F'}</span>
                </div>
                
              </>
            ) : (
              <button className="bg-gradient-to-r from-[#4b30fb] to-[#764ba2] border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-white" onClick={handleLogin} title="Kirish">
                <LogIn size={16} />
              </button>
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Navbar — only letter tabs + back */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e] flex justify-around py-2 border-t border-white/10 z-[1000] shadow-lg">
          <button
            className={`flex flex-col items-center text-xs gap-1 cursor-pointer p-2 border-none transition-colors ${activeTab === 'harf' ? 'text-[#4b30fb]' : 'text-gray-400 hover:text-[#4b30fb]'}`}
            onClick={() => navigate('/harf')}
          >
            <BookOpen size={20} />
            <span>O'zbek</span>
          </button>
          <button
            className={`flex flex-col items-center text-xs gap-1 cursor-pointer p-2 border-none transition-colors ${activeTab === 'rharf' ? 'text-[#4b30fb]' : 'text-gray-400 hover:text-[#4b30fb]'}`}
            onClick={() => navigate('/rharf')}
          >
            <BookOpen size={20} />
            <span>Русский</span>
          </button>
          <button
            className={`flex flex-col items-center text-xs gap-1 cursor-pointer p-2 border-none transition-colors ${activeTab === 'eharf' ? 'text-[#4b30fb]' : 'text-gray-400 hover:text-[#4b30fb]'}`}
            onClick={() => navigate('/eharf')}
          >
            <BookOpen size={20} />
            <span>English</span>
          </button>
          <button
            className="flex flex-col items-center text-gray-400 text-xs gap-1 cursor-pointer p-2 border-none transition-colors hover:text-white"
            onClick={handleBackToMain}
          >
            <ArrowLeft size={20} />
            <span>Orqaga</span>
          </button>
        </nav>
      )}

      {/* Auth Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={closeLoginModal}
        onSwitchToRegister={() => { closeLoginModal(); handleRegister(); }}
      />
      <RegisterModal
        isOpen={registerModalOpen}
        onClose={closeRegisterModal}
        onSwitchToLogin={() => { closeRegisterModal(); handleLogin(); }}
      />
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