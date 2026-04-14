import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, BookOpen, Gamepad2, ChevronRight, Menu, X,
  Type, Calculator, Car, Monitor, TreePine, Gem,
  Star, ClipboardList, Search, Camera,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useUsageTracking, USAGE_ACTIONS } from '../hooks/useUsageTracking';
import { translations } from '../language/translations';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import SmartAuthPrompt from '../components/Auth/SmartAuthPrompt';
import apiService from '../services/apiService';

const HomePage = () => {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mainFilter, setMainFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [authTrigger, setAuthTrigger] = useState(null);
  const [dynamicDict, setDynamicDict] = useState({});
  const { trackAction, shouldShowRegistrationPrompt } = useUsageTracking();
  const sidebarRef = useRef(null);

  const baseT = translations[language] || translations.uz;
  const t = { ...baseT, ...(dynamicDict[language] || {}) };

  const defaultGames = [
    { id: 1, title: t.game_read, rating: 74, image: '/oqi.jpg', category: 'alifbe', type: 'lessons' },
    { id: 2, title: t.game_homework, rating: 67, image: '/matem.jpg', category: 'math', type: 'lessons' },
    { id: 3, title: t.game_uz_alphabet, rating: 76, image: '/alifbe.jpg', category: 'harflar', type: 'lessons' },
    { id: 4, title: t.game_en_alphabet, rating: 87, image: '/texno.jpg', category: 'letters', type: 'lessons' },
    { id: 5, title: t.game_ru_alphabet, rating: 66, image: '/bukv.jpg', category: 'harflar', type: 'lessons' },
    { id: 6, title: t.game_memory_game, rating: 74, image: '/xotira.jpg', category: 'letters', type: 'games' },
  ];

  const [gamesList, setGamesList] = useState(defaultGames);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Fetch dynamic content from Admin Panel
    apiService.getPublicContent().then(res => {
      if (res?.data) {
        // Parse raw string or use object directly
        let remoteData = res.data;
        if (typeof remoteData === 'string') {
          try { remoteData = JSON.parse(remoteData); } catch (e) { }
        }

        // 1. Override translations dynamically
        if (remoteData?.translations) {
          setDynamicDict(remoteData.translations);
        }

        // 2. Override games array dynamically
        if (remoteData?.games && Array.isArray(remoteData.games)) {
          setGamesList(remoteData.games);
        }
      }
    }).catch(console.error);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const categories = [
    { id: 'harflar', nameKey: 'letters', icon: Camera },
    { id: 'letters', nameKey: 'letters', icon: Type },
    { id: 'alifbe', nameKey: 'alphabet', icon: BookOpen },
    { id: 'math', nameKey: 'math', icon: Calculator },
    { id: 'texnika', nameKey: 'technique', icon: Car },
    { id: 'informatika', nameKey: 'informatics', icon: Monitor },
    { id: 'tabiat', nameKey: 'nature', icon: TreePine },
    { id: 'boshqalar', nameKey: 'others', icon: Gem },
  ];

  const catColors = [
    { from: '#ff6b9d', to: '#c44569', shadow: 'rgba(255,107,157,0.55)' },
    { from: '#feca57', to: '#ff9ff3', shadow: 'rgba(254,202,87,0.55)' },
    { from: '#48dbfb', to: '#0abde3', shadow: 'rgba(72,219,251,0.55)' },
    { from: '#1dd1a1', to: '#10ac84', shadow: 'rgba(29,209,161,0.55)' },
    { from: '#ff9ff3', to: '#ee5a6f', shadow: 'rgba(255,159,243,0.55)' },
    { from: '#54a0ff', to: '#2e86de', shadow: 'rgba(84,160,255,0.55)' },
    { from: '#5f27cd', to: '#341f97', shadow: 'rgba(95,39,205,0.55)' },
  ];

  // Update default titles when language changes, if not replaced by remote
  useEffect(() => {
    setGamesList(prev => prev.map(g => {
      // Re-map default title overrides based on ID mapping
      let title = g.title;
      if (g.id === 1) title = t.game_read || title;
      if (g.id === 2) title = t.game_homework || title;
      if (g.id === 3) title = t.game_uz_alphabet || title;
      if (g.id === 4) title = t.game_en_alphabet || title;
      if (g.id === 5) title = t.game_ru_alphabet || title;
      if (g.id === 6) title = t.game_memory_game || title;
      return { ...g, title };
    }));
  }, [language, dynamicDict]);

  const filteredItems = gamesList.filter(item => {
    const matchesMain = mainFilter === 'all' || item.type === mainFilter;
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesMain && matchesCat;
  });

  const redirectToPlatform = (baseUrl, path = '') => {
    window.location.href = `${baseUrl}${path}`;
  };

  const handleGameClick = (game) => {
    if (!isAuthenticated && game.premium) { setAuthTrigger('restricted_content'); return; }
    if (!isAuthenticated) {
      trackAction(USAGE_ACTIONS.COURSE_VIEW);
      if (shouldShowRegistrationPrompt()) { setAuthTrigger('usage_limit'); return; }
    }
    const gid = String(game.id);
    if (gid === '1') return redirectToPlatform('https://lessions.alif24.uz', '/ertaklar');
    if (gid === '2') return navigate('/mathkids');
    if (gid === '3') return redirectToPlatform('https://harf.alif24.uz');
    if (gid === '4') return redirectToPlatform('https://harf.alif24.uz', '/eharf');
    if (gid === '5') return redirectToPlatform('https://harf.alif24.uz', '/rharf');
    if (gid === '6') return redirectToPlatform('https://games.alif24.uz');
    if (gid === '7') return redirectToPlatform('https://games.alif24.uz');
    redirectToPlatform(game.type === 'lessons' ? 'https://lessions.alif24.uz' : 'https://games.alif24.uz');
  };

  const handleCategoryClick = (id) => {
    setCategoryFilter(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative overflow-x-hidden">

      {/* ── Animated stars ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          ['5%', '10%', 'w-1 h-1', '0s', '2s'], ['15%', '25%', 'w-1.5 h-1.5', '0.5s', '3s'],
          ['8%', '45%', 'w-1 h-1', '1s', '2.5s'], ['20%', '60%', 'w-2 h-2', '1.5s', '3.5s'],
          ['12%', '75%', 'w-1 h-1', '0.8s', '2.8s'], ['25%', '90%', 'w-1.5 h-1.5', '2s', '3.2s'],
          ['35%', '5%', 'w-1 h-1', '1.2s', '2.3s'], ['40%', '18%', 'w-2 h-2', '0.3s', '3.8s'],
          ['38%', '35%', 'w-1 h-1', '2.2s', '2.6s'], ['45%', '52%', 'w-1.5 h-1.5', '0.9s', '3.4s'],
          ['42%', '68%', 'w-1 h-1', '1.7s', '2.9s'], ['48%', '82%', 'w-2 h-2', '0.6s', '3.1s'],
          ['55%', '12%', 'w-1.5 h-1.5', '1.4s', '2.7s'], ['60%', '28%', 'w-1 h-1', '2.5s', '3.3s'],
          ['65%', '55%', 'w-1 h-1', '1.9s', '3.6s'], ['62%', '72%', 'w-1.5 h-1.5', '0.7s', '2.2s'],
          ['75%', '8%', 'w-2 h-2', '1.1s', '2.5s'], ['80%', '22%', 'w-1 h-1', '0.2s', '3.9s'],
          ['85%', '50%', 'w-1 h-1', '1.6s', '3.2s'], ['82%', '65%', 'w-2 h-2', '0.1s', '2.6s'],
        ].map(([top, left, sz, d, dur], i) => (
          <div key={i}
            className={`absolute ${sz} bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]`}
            style={{ top, left, animationDelay: d, animationDuration: dur }} />
        ))}
        {/* Comets */}
        {[['0s', '10%'], ['5s', '30%'], ['10s', '50%']].map(([d, top], i) => (
          <div key={i}
            className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8),0_0_20px_4px_rgba(100,200,255,0.6)]"
            style={{ animation: 'comet 6s linear infinite', animationDelay: d, top, left: '-50px' }} />
        ))}
      </div>

      {/* Navbar */}
      <Navbar />

      {/* ── Sidebar Overlay backdrop ──────────────────────────────────────────── */}
      <div
        onClick={() => setSidebarOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          top: 70,           // below navbar
          zIndex: 1000,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          transition: 'opacity 0.3s',
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? 'auto' : 'none',
        }}
      />

      {/* ── Sidebar Panel — slides in over content ────────────────────────────── */}
      <div
        ref={sidebarRef}
        style={{
          position: 'fixed',
          top: 70,
          left: 0,
          bottom: 0,
          width: 268,
          zIndex: 1001,
          background: 'linear-gradient(180deg,#1a1a2e 0%,#16213e 60%,#0f1624 100%)',
          borderRight: '2px solid rgba(75,48,251,0.3)',
          boxShadow: '4px 0 32px rgba(75,48,251,0.35)',
          overflowY: 'auto',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="p-3">
          {/* Close button inside sidebar */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center justify-center gap-2 mb-3 p-3 rounded-xl text-white font-bold border-none cursor-pointer transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#ff00ff,#00ffff)', boxShadow: '0 4px 15px rgba(255,0,255,0.5)' }}
          >
            <X size={22} />
          </button>

          {/* All */}
          <button
            onClick={() => handleCategoryClick('all')}
            className="w-full flex items-center gap-3 p-3 mb-3 rounded-xl text-white font-bold border-none cursor-pointer transition-all hover:scale-105 shadow-lg"
            style={{
              background: categoryFilter === 'all'
                ? 'linear-gradient(135deg,#ff6b6b,#ff8e53)'
                : 'linear-gradient(135deg,#4ecdc4,#44a08d)',
              boxShadow: categoryFilter === 'all'
                ? '0 4px 20px rgba(255,107,107,0.55)'
                : '0 4px 15px rgba(78,205,196,0.45)',
            }}
          >
            <ClipboardList size={22} className="shrink-0" />
            <span className="flex-1 text-left">{t.all}</span>
            <ChevronRight size={15} className="opacity-70" />
          </button>

          {/* Categories */}
          {categories.map((cat, idx) => {
            const color = catColors[idx % catColors.length];
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`w-full flex items-center gap-3 p-3 mb-3 rounded-xl text-white font-bold border-none cursor-pointer transition-all hover:scale-105 shadow-lg
                  ${categoryFilter === cat.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a2e]' : ''}`}
                style={{
                  background: `linear-gradient(135deg,${color.from},${color.to})`,
                  boxShadow: `0 4px 15px ${color.shadow}`,
                  animation: `slideInLeft 0.3s ease-out ${idx * 0.04}s both`,
                }}
              >
                <cat.icon size={22} className="shrink-0" />
                <span className="flex-1 text-left">{t[cat.nameKey]}</span>
                <ChevronRight size={15} className="opacity-70" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content — NEVER shifts ───────────────────────────────────────── */}
      <main className="relative z-10">
        <div className="p-5 pb-24">

          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-7 flex-wrap">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="px-4 py-3 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white rounded-xl font-semibold border-none cursor-pointer flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(75,48,251,0.4)] hover:shadow-[0_8px_25px_rgba(75,48,251,0.6)] hover:scale-105"
            >
              <Menu size={20} />
            </button>

            {[
              { key: 'all', icon: Home, label: t.all },
              { key: 'lessons', icon: BookOpen, label: t.lessons },
              { key: 'games', icon: Gamepad2, label: t.games },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setMainFilter(key)}
                className={`px-5 py-3 rounded-xl font-semibold text-base border-none cursor-pointer flex items-center gap-2 transition-all
                  ${mainFilter === key
                    ? 'bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white shadow-[0_4px_15px_rgba(75,48,251,0.4)]'
                    : 'bg-white/20 text-white hover:bg-white/25 hover:-translate-y-0.5'}`}
              >
                <Icon size={19} />
                <span className={isMobile ? 'hidden' : ''}>{label}</span>
              </button>
            ))}
          </div>

          {/* Games grid */}
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-2 gap-2.5' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
            {filteredItems.map((game, index) => (
              <div
                key={game.id}
                className="group cursor-pointer transition-all duration-300 hover:-translate-y-2"
                onClick={() => handleGameClick(game)}
                style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.08}s both` }}
              >
                <div className="bg-gradient-to-br from-[#2a2a3e] to-[#1e1e2f] rounded-2xl overflow-hidden border border-[rgba(75,48,251,0.15)] relative shadow-[0_4px_15px_rgba(0,0,0,0.3)] group-hover:border-[#4b30fb] group-hover:shadow-[0_8px_30px_rgba(75,48,251,0.35)] transition-all duration-300">
                  {game.premium && (
                    <span className="absolute top-2 right-2 bg-gradient-to-br from-[#ffd700] to-[#ff8c00] text-[#1e1e2f] px-2.5 py-0.5 rounded-full text-[10px] font-bold z-10 animate-pulse">
                      {t.premium}
                    </span>
                  )}
                  <div className="absolute top-2 left-2 z-10">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${game.type === 'lessons' ? 'bg-emerald-500/80 text-white' : 'bg-amber-500/80 text-white'}`}>
                      {game.type === 'lessons'
                        ? <><BookOpen size={11} className="inline mr-0.5" />{t.lessons || 'Dars'}</>
                        : <><Gamepad2 size={11} className="inline mr-0.5" />{t.games || "O'yin"}</>
                      }
                    </span>
                  </div>
                  <div className="w-full relative" style={{ paddingTop: '65%' }}>
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[rgba(75,48,251,0.1)] to-[rgba(118,75,162,0.1)] overflow-hidden">
                      {typeof game.image === 'string' && game.image.startsWith('/') ? (
                        <img src={game.image} alt={game.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <span className="text-6xl lg:text-7xl transition-transform duration-300 group-hover:scale-110">{game.image}</span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e2f] via-transparent to-transparent opacity-60" />
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-white font-bold text-xs sm:text-sm md:text-base truncate mb-2">{game.title}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#4b30fb] to-[#00d4ff] transition-all duration-500"
                          style={{ width: `${game.rating}%` }} />
                      </div>
                      <span className="text-white/50 text-xs font-medium flex items-center gap-0.5">
                        <Star size={10} className="text-yellow-400 fill-yellow-400" />
                        {game.rating}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-16 text-white/60">
              <div className="mb-5 opacity-50 animate-bounce"><Search size={80} /></div>
              <p className="text-xl font-semibold">{t.nothing_found}</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      {!isMobile && <Footer />}

      {/* Smart auth prompt */}
      <SmartAuthPrompt
        trigger={authTrigger}
        onAuthSuccess={() => setAuthTrigger(null)}
      />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes comet {
          0%   { transform: translateX(0) translateY(0); opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translateX(calc(100vw + 100px)) translateY(200px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default HomePage;