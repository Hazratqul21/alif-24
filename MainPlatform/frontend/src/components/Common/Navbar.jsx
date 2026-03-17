import { useState, useEffect, useRef } from 'react';
import {
  Home, BookOpen, Gamepad2, Trophy, User, Globe, LogIn, UserPlus,
  LogOut, ChevronDown, Menu, X, Info, HandshakeIcon, ShieldCheck,
  Medal,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginModal from '../Auth/LoginModal';
import RegisterModal from '../Auth/RegisterModal';
import AchievementsModal from './AchievementsModal';
import { useStarsManager } from '../../hooks/useStarsManager';

/* ─────────────────────────────────────────────────────────────────────────────
   Drawer (shared — slides in from right)
───────────────────────────────────────────────────────────────────────────── */
function DrawerMenu({ open, onClose, items, onLogout, isAuthenticated, user, onLogin, profilePath, navigate }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.3s',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
      <div
        ref={drawerRef}
        style={{
          position: 'fixed', top: 0, right: 0, height: '100%', width: '288px',
          zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f1624 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ color:'white', fontWeight:700, fontSize:15, letterSpacing:'0.02em' }}>Menyu</span>
          <button
            onClick={onClose}
            style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'rgba(255,255,255,0.07)', border:'none', color:'rgba(255,255,255,0.6)', cursor:'pointer' }}
          >
            <X size={17} />
          </button>
        </div>

        <nav style={{ flex:1, overflowY:'auto', padding:'10px 12px' }}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => { item.action(); onClose(); }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:12,
                  padding:'11px 14px', borderRadius:12,
                  color:'rgba(255,255,255,0.72)', background:'none', border:'none',
                  cursor:'pointer', fontSize:14, fontWeight:500, textAlign:'left',
                  transition:'background 0.15s, color 0.15s',
                  marginBottom:2,
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='white'; }}
                onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='rgba(255,255,255,0.72)'; }}
              >
                <Icon size={17} style={{ color:'#7c6bff', flexShrink:0 }} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding:'12px 12px 24px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          {isAuthenticated ? (
            <>
              <div
                onClick={() => { navigate(profilePath); onClose(); }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,0.05)', cursor:'pointer', marginBottom:8 }}
              >
                <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#4b30fb,#764ba2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <User size={16} style={{ color:'white' }} />
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ color:'white', fontWeight:600, fontSize:14, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {user?.first_name || 'Foydalanuvchi'}
                  </p>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {user?.email || ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { onLogout(); onClose(); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:12, background:'rgba(239,68,68,0.1)', border:'none', color:'#f87171', cursor:'pointer', fontSize:14, fontWeight:500 }}
              >
                <LogOut size={16} style={{ flexShrink:0 }} />
                Profildan chiqish
              </button>
            </>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button
                onClick={() => { onLogin('login'); onClose(); }}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:12, background:'rgba(255,255,255,0.09)', border:'none', color:'white', fontSize:14, fontWeight:600, cursor:'pointer' }}
              >
                <LogIn size={15} /> Kirish
              </button>
              <button
                onClick={() => { onLogin('register'); onClose(); }}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:12, background:'linear-gradient(135deg,#4b30fb,#764ba2)', border:'none', color:'white', fontSize:14, fontWeight:600, cursor:'pointer' }}
              >
                <UserPlus size={15} /> Ro'yxatdan o'tish
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Navbar
───────────────────────────────────────────────────────────────────────────── */
const Navbar = () => {
  const { t, language, switchLanguage } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [achievementsModalOpen, setAchievementsModalOpen] = useState(false);
  const langRef = useRef(null);

  const { totalStars, starsBreakdown, getStarsHistory } = useStarsManager();

  const LANGUAGES = {
    uz: { code: 'uz', label: "O'zbekcha" },
    ru: { code: 'ru', label: 'Русский' },
    en: { code: 'en', label: 'English' },
  };
  const currentLang = LANGUAGES[language] || LANGUAGES.uz;

  const profilePath = isAuthenticated && user ? (
    user.role === 'student'   ? '/student-dashboard' :
    user.role === 'teacher'   ? '/teacher-dashboard' :
    user.role === 'parent'    ? '/parent-dashboard' :
    ['admin','super_admin','moderator','organization'].includes(user.role)
      ? '/organization-dashboard'
      : '/profile'
  ) : '/profile';

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const h = () => setLoginModalOpen(true);
    window.addEventListener('showLoginModal', h);
    return () => window.removeEventListener('showLoginModal', h);
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    const h = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [langOpen]);

  const handleProfileClick = () => {
    if (isAuthenticated) navigate(profilePath);
    else setLoginModalOpen(true);
  };
  const handleLogout = () => { logout(); navigate('/'); };
  const handleAuthModal = (type) => {
    if (type === 'login') setLoginModalOpen(true);
    else setRegisterModalOpen(true);
  };

  const desktopDrawerItems = [
    { key: 'about',    icon: Info,          label: 'Biz haqimizda',      action: () => navigate('/about') },
    { key: 'partners', icon: HandshakeIcon, label: 'Hamkorlar',          action: () => navigate('/partners') },
    { key: 'privacy',  icon: ShieldCheck,   label: 'Maxfiylik siyosati', action: () => navigate('/privacy') },
  ];

  const mobileDrawerItems = [
    { key: 'home',        icon: Home,          label: 'Bosh sahifa',        action: () => navigate('/dashboard') },
    { key: 'games',       icon: Gamepad2,      label: "O'yinlar",           action: () => window.location.href = 'https://games.alif24.uz' },
    { key: 'olympiad',    icon: Medal,         label: 'Olimpiada',          action: () => window.location.href = 'https://olimp.alif24.uz' },
    { key: 'leaderboard', icon: Trophy,        label: 'Reyting',            action: () => navigate('/leaderboard') },
    { key: 'profile',     icon: User,          label: 'Mening profilim',    action: handleProfileClick },
    { key: 'about',       icon: Info,          label: 'Biz haqimizda',      action: () => navigate('/about') },
    { key: 'partners',    icon: HandshakeIcon, label: 'Hamkorlar',          action: () => navigate('/partners') },
    { key: 'privacy',     icon: ShieldCheck,   label: 'Maxfiylik siyosati', action: () => navigate('/privacy') },
  ];

  const navBtnClass = (path) => {
    const active = path && location.pathname.startsWith(path);
    return [
      'text-sm font-medium px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all',
      active
        ? 'bg-white/15 text-white'
        : 'bg-transparent text-white/65 hover:text-white hover:bg-white/8',
    ].join(' ');
  };

  // ── Desktop nav links (internal + external) ──────────────────────────────
  const desktopNavLinks = [
    { label: 'Bosh sahifa', path: '/dashboard' },
    { label: "O'yinlar",    external: 'https://games.alif24.uz' },
    { label: 'Olimpiada',   external: 'https://olimp.alif24.uz' },
    { label: 'Reyting',     path: '/leaderboard' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 h-[70px] flex items-center justify-between px-4 bg-[#4b30fb]/80 backdrop-blur-md border-b border-white/10 shadow-lg">

        {/* Logo */}
        <div className="w-14 h-14 cursor-pointer shrink-0" onClick={() => navigate('/dashboard')}>
          <img src="/Logo.png" alt="Alifbe" className="w-full h-full object-contain" />
        </div>

        {/* ── DESKTOP center nav ───────────────────────────────────────────── */}
        {!isMobile && (
          <nav className="flex items-center gap-0.5">
            {desktopNavLinks.map(({ label, path, external }) => (
              <button
                key={external || path}
                onClick={() => external ? window.location.href = external : navigate(path)}
                className={navBtnClass(path)}
              >
                {label}
              </button>
            ))}
            <button onClick={handleProfileClick} className={navBtnClass(profilePath)}>
              Profil
            </button>
          </nav>
        )}

        {/* ── DESKTOP right ────────────────────────────────────────────────── */}
        {!isMobile && (
          <div className="flex items-center gap-2 shrink-0">

            {/* Language selector */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/18 border border-white/15 rounded-xl px-3 py-2 text-white text-sm font-bold cursor-pointer transition-all"
              >
                <Globe size={14} className="text-white/70" />
                {currentLang.code.toUpperCase()}
                <ChevronDown size={12} className={`text-white/60 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`absolute top-full right-0 mt-2 w-44 bg-[#1a1a2e]/96 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all duration-200 origin-top-right
                ${langOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}>
                {Object.values(LANGUAGES).map((lang) => (
                  <button key={lang.code}
                    onClick={() => { switchLanguage(lang.code); setLangOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm border-none text-left cursor-pointer transition-all
                      ${language === lang.code ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                    {lang.label}
                    {language === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-[#4b30fb]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* User pill */}
            {isAuthenticated && (
              <button
                onClick={() => navigate(profilePath)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/18 border border-white/15 rounded-xl px-3 py-2 text-white text-sm font-medium cursor-pointer transition-all"
              >
                <User size={14} className="text-white/80" />
                {user?.first_name || 'Profil'}
              </button>
            )}

            {/* Login button */}
            {!isAuthenticated && (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/18 border border-white/15 rounded-xl px-4 py-2 text-white text-sm font-semibold cursor-pointer transition-all"
              >
                <LogIn size={14} /> Kirish
              </button>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/18 border border-white/15 text-white cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <Menu size={18} />
            </button>
          </div>
        )}

        {/* ── MOBILE right ─────────────────────────────────────────────────── */}
        {isMobile && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.location.href = 'https://olimp.alif24.uz'}
              className="flex items-center gap-1 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 text-white text-xs font-semibold cursor-pointer transition-all active:scale-95"
            >
              <Medal size={13} /> Olimpiada
            </button>
            <button
              onClick={handleProfileClick}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 border border-white/15 text-white cursor-pointer transition-all active:scale-95"
            >
              <User size={16} />
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 border border-white/15 text-white cursor-pointer transition-all active:scale-95"
            >
              <Menu size={18} />
            </button>
          </div>
        )}
      </header>

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      <DrawerMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={isMobile ? mobileDrawerItems : desktopDrawerItems}
        onLogout={handleLogout}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogin={handleAuthModal}
        profilePath={profilePath}
        navigate={navigate}
      />

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSwitchToRegister={() => { setLoginModalOpen(false); setRegisterModalOpen(true); }}
      />
      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSwitchToLogin={() => { setRegisterModalOpen(false); setLoginModalOpen(true); }}
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