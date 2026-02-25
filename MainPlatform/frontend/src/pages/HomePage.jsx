import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, BookOpen, Gamepad2, ChevronRight, Menu, X, Type, Calculator, Car, Monitor, TreePine, Gem, Sparkles, Star, Zap, ClipboardList, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useUsageTracking, USAGE_ACTIONS } from '../hooks/useUsageTracking';
import { translations } from '../language/translations';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import FeedbackWidget from '../components/Common/FeedbackWidget';
import SmartAuthPrompt from '../components/Auth/SmartAuthPrompt';

/**
 * Home Page / Child Dashboard
 * Main dashboard for children with games and lessons
 */
const HomePage = () => {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mainFilter, setMainFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [authTrigger, setAuthTrigger] = useState(null);
  const { trackAction, shouldShowRegistrationPrompt } = useUsageTracking();

  const t = translations[language] || translations.uz;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // O'yinlar va darslar ma'lumotlari
  const games = [
    { id: 1, title: t.game_read, rating: 74, image: '/ertak.jpg', category: 'alifbe', type: 'lessons' },
    { id: 2, title: t.game_homework, rating: 67, image: '/uygavaz.jpg', category: 'math', type: 'lessons' },
    { id: 3, title: t.game_uz_alphabet, rating: 76, image: '/alifbe.jpg', category: 'harflar', type: 'lessons' },
    { id: 4, title: t.game_en_alphabet, rating: 87, image: '/texno.jpg', category: 'letters', type: 'lessons' },
    { id: 5, title: t.game_ru_alphabet, rating: 66, image: '/bukv.jpg', category: 'harflar', type: 'lessons' },
    { id: 6, title: t.game_memory_game, rating: 74, image: '/xotira.jpg', category: 'letters', type: 'games' },
    { id: 7, title: t.game_math_monster, rating: 78, image: '/matem.jpg', category: 'math', type: 'games' },


    /*
    { id: 8, title: 'Farm Building', rating: 83, image: '/uqish.jpg', category: 'tabiat', type: 'lessons', premium: true },
    { id: 9, title: 'Desert Shooter', rating: 68, image: '🔫', category: 'harflar', type: 'games' },
    { id: 10, title: 'War Plane', rating: 71, image: '✈️', category: 'tabiat', type: 'games', premium: true },
    { id: 11, title: 'Tetris', rating: 82, image: '🟦', category: 'sonlar', type: 'games' },
    { id: 12, title: 'Fireboy & Watergirl', rating: 74, image: '🔥', category: 'robot', type: 'lessons' },
    { id: 13, title: 'FIFA World Cup', rating: 65, image: '⚽', category: 'informatika', type: 'games' },
    { id: 14, title: 'Card Games', rating: 90, image: '🃏', category: 'math', type: 'lessons' },
    { id: 15, title: '2048', rating: 88, image: '🔢', category: 'math', type: 'games' },
    { id: 16, title: '2+3', rating: 55, image: '🔢', category: 'math', type: 'lessons' },
    { id: 17, title: 'Alifbe Darsi', rating: 91, image: '📖', category: 'alifbe', type: 'lessons' },
    { id: 18, title: 'Robot Yasash', rating: 85, image: '🤖', category: 'robot', type: 'lessons', premium: true },*/
  ];

  // Sidebar kategoriyalari
  const categories = [
    { id: 'harflar', nameKey: 'letters', icon: Type },
    { id: 'alifbe', nameKey: 'alphabet', icon: BookOpen },
    { id: 'math', nameKey: 'math', icon: Calculator },
    { id: 'texnika', nameKey: 'technique', icon: Car },
    { id: 'informatika', nameKey: 'informatics', icon: Monitor },
    { id: 'tabiat', nameKey: 'nature', icon: TreePine },
    { id: 'boshqalar', nameKey: 'others', icon: Gem },
  ];

  // Filtrlangan elementlar
  const filteredItems = games.filter(item => {
    const matchesMainFilter = mainFilter === 'all' || item.type === mainFilter;
    const matchesCategoryFilter = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesMainFilter && matchesCategoryFilter;
  });

  // Redirect to sub-platform — HttpOnly cookies handle auth automatically
  const redirectToPlatform = (baseUrl, path = '') => {
    window.location.href = `${baseUrl}${path}`;
  };

  const handleGameClick = (game) => {
    // Check if user is authenticated and game is premium
    if (!isAuthenticated && game.premium) {
      setAuthTrigger('restricted_content');
      return;
    }

    // Track usage for unauthenticated users
    if (!isAuthenticated) {
      trackAction(USAGE_ACTIONS.COURSE_VIEW);
      if (shouldShowRegistrationPrompt()) {
        setAuthTrigger('usage_limit');
        return;
      }
    }

    // Redirect to sub-platforms
    const gid = String(game.id);
    if (gid === '1') return redirectToPlatform('https://lessions.alif24.uz', '/ertaklar');  // Ertak o'qish
    if (gid === '2') return navigate('/mathkids');   // Matematika (MainPlatform ichida)
    if (gid === '3') return redirectToPlatform('https://harf.alif24.uz');        // O'zbek alifbesi
    if (gid === '4') return redirectToPlatform('https://harf.alif24.uz'); // Ingliz alifbesi
    if (gid === '5') return redirectToPlatform('https://harf.alif24.uz'); // Rus alifbes
    if (gid === '6') return redirectToPlatform('https://games.alif24.uz'); // Xotira o'yini
    if (gid === '7') return redirectToPlatform('https://games.alif24.uz');  // Matematika o'yini

    // Fallback
    redirectToPlatform(game.type === 'lessons' ? 'https://lessions.alif24.uz' : 'https://games.alif24.uz');
  };

  const handleCategoryClick = (categoryId) => {
    setCategoryFilter(categoryId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleMainFilterClick = (filter) => {
    setMainFilter(filter);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative">
      {/* Animated background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stars */}
        <div className="absolute top-[5%] left-[10%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0s', animationDuration: '2s' }} />
        <div className="absolute top-[15%] left-[25%] w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
        <div className="absolute top-[8%] left-[45%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '1s', animationDuration: '2.5s' }} />
        <div className="absolute top-[20%] left-[60%] w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '1.5s', animationDuration: '3.5s' }} />
        <div className="absolute top-[12%] left-[75%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0.8s', animationDuration: '2.8s' }} />
        <div className="absolute top-[25%] left-[90%] w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '2s', animationDuration: '3.2s' }} />

        <div className="absolute top-[35%] left-[5%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '1.2s', animationDuration: '2.3s' }} />
        <div className="absolute top-[40%] left-[18%] w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0.3s', animationDuration: '3.8s' }} />
        <div className="absolute top-[38%] left-[35%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '2.2s', animationDuration: '2.6s' }} />
        <div className="absolute top-[45%] left-[52%] w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0.9s', animationDuration: '3.4s' }} />
        <div className="absolute top-[42%] left-[68%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '1.7s', animationDuration: '2.9s' }} />
        <div className="absolute top-[48%] left-[82%] w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0.6s', animationDuration: '3.1s' }} />

        <div className="absolute top-[55%] left-[12%] w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '1.4s', animationDuration: '2.7s' }} />
        <div className="absolute top-[60%] left-[28%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '2.5s', animationDuration: '3.3s' }} />
        <div className="absolute top-[58%] left-[42%] w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0.4s', animationDuration: '2.4s' }} />
        <div className="absolute top-[65%] left-[55%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '1.9s', animationDuration: '3.6s' }} />
        <div className="absolute top-[62%] left-[72%] w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0.7s', animationDuration: '2.2s' }} />
        <div className="absolute top-[68%] left-[88%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '2.8s', animationDuration: '3.7s' }} />

        <div className="absolute top-[75%] left-[8%] w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '1.1s', animationDuration: '2.5s' }} />
        <div className="absolute top-[80%] left-[22%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0.2s', animationDuration: '3.9s' }} />
        <div className="absolute top-[78%] left-[38%] w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '2.3s', animationDuration: '2.8s' }} />
        <div className="absolute top-[85%] left-[50%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '1.6s', animationDuration: '3.2s' }} />
        <div className="absolute top-[82%] left-[65%] w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0.1s', animationDuration: '2.6s' }} />
        <div className="absolute top-[88%] left-[78%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '2.7s', animationDuration: '3.5s' }} />
        <div className="absolute top-[92%] left-[92%] w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '1.3s', animationDuration: '2.1s' }} />

        <div className="absolute top-[3%] left-[33%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '2.1s', animationDuration: '3.4s' }} />
        <div className="absolute top-[28%] left-[48%] w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0.5s', animationDuration: '2.9s' }} />
        <div className="absolute top-[50%] left-[95%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '1.8s', animationDuration: '3.1s' }} />
        <div className="absolute top-[72%] left-[15%] w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '2.6s', animationDuration: '2.3s' }} />
        <div className="absolute top-[18%] left-[85%] w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '0.9s', animationDuration: '3.7s' }} />
        <div className="absolute top-[95%] left-[40%] w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ animationDelay: '2.4s', animationDuration: '2.7s' }} />

        {/* Comets */}
        <div className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8),0_0_20px_4px_rgba(100,200,255,0.6)]" style={{ animation: 'comet 6s linear infinite', animationDelay: '0s', top: '10%', left: '-50px' }} />
        <div className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8),0_0_20px_4px_rgba(100,200,255,0.6)]" style={{ animation: 'comet 5s linear infinite', animationDelay: '5s', top: '30%', left: '-50px' }} />
        <div className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8),0_0_20px_4px_rgba(100,200,255,0.6)]" style={{ animation: 'comet 7s linear infinite', animationDelay: '10s', top: '50%', left: '-50px' }} />
      </div>

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-70px)] relative">
        {/* Sidebar - Neon Design */}
        <aside
          className={`fixed top-[70px] pb-[120px] left-0 h-[calc(100vh-70px)] bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f1624] shadow-[2px_0_20px_rgba(75,48,251,0.5)] z-[998] overflow-y-auto transition-all duration-300 border-r-2 border-[rgba(75,48,251,0.3)] w-[240px] sm:w-[280px] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className={`transition-all duration-300 ${sidebarOpen ? 'p-3' : 'p-2'}`}>
            {/* Toggle Sidebar Button */}
            <button
              className={`w-full bg-gradient-to-br from-[#ff00ff] to-[#00ffff] border-none text-white rounded-xl cursor-pointer flex items-center justify-center transition-all duration-300 shadow-[0_4px_15px_rgba(255,0,255,0.6)] hover:shadow-[0_8px_25px_rgba(0,255,255,0.8)] hover:scale-110 mb-3 ${sidebarOpen ? 'p-3' : 'p-2.5'}`}
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={20} />}
            </button>

            {/* All Category Button */}
            <button
              className={`w-full flex items-center gap-3 mb-3 border-none rounded-xl cursor-pointer transition-all duration-300 text-white text-base font-bold transform hover:scale-110 shadow-lg ${sidebarOpen ? 'p-3 justify-start' : 'p-2.5 justify-center'
                } ${categoryFilter === 'all'
                  ? 'bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] shadow-[0_4px_20px_rgba(255,107,107,0.6)]'
                  : 'bg-gradient-to-r from-[#4ecdc4] to-[#44a08d] shadow-[0_4px_15px_rgba(78,205,196,0.5)]'
                }`}
              onClick={() => handleCategoryClick('all')}
            >
              <ClipboardList size={22} />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">
                    {t.all}
                  </span>
                  <ChevronRight size={16} className="opacity-80" />
                </>
              )}
            </button>

            {/* Category Buttons */}
            {categories.map((cat, index) => {
              const colors = [
                { from: '#ff6b9d', to: '#c44569', shadow: 'rgba(255,107,157,0.6)' },
                { from: '#feca57', to: '#ff9ff3', shadow: 'rgba(254,202,87,0.6)' },
                { from: '#48dbfb', to: '#0abde3', shadow: 'rgba(72,219,251,0.6)' },
                { from: '#1dd1a1', to: '#10ac84', shadow: 'rgba(29,209,161,0.6)' },
                { from: '#ff9ff3', to: '#ee5a6f', shadow: 'rgba(255,159,243,0.6)' },
                { from: '#54a0ff', to: '#2e86de', shadow: 'rgba(84,160,255,0.6)' },
                { from: '#5f27cd', to: '#341f97', shadow: 'rgba(95,39,205,0.6)' },
                { from: '#00d2d3', to: '#01a3a4', shadow: 'rgba(0,210,211,0.6)' },
                { from: '#ff6348', to: '#ff4757', shadow: 'rgba(255,99,72,0.6)' },
              ];
              const color = colors[index % colors.length];

              return (
                <button
                  key={cat.id}
                  className={`w-full flex items-center gap-3 mb-3 border-none rounded-xl cursor-pointer transition-all duration-300 text-white text-base font-bold transform hover:scale-110 shadow-lg ${sidebarOpen ? 'p-3 justify-start' : 'p-2.5 justify-center'
                    } ${categoryFilter === cat.id
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a2e]'
                      : ''
                    }`}
                  onClick={() => handleCategoryClick(cat.id)}
                  style={{
                    background: `linear-gradient(135deg, ${color.from} 0%, ${color.to} 100%)`,
                    boxShadow: `0 4px 15px ${color.shadow}`,
                    animation: `slideInLeft 0.3s ease-out ${index * 0.05}s both`
                  }}
                >
                  <cat.icon size={24} className="flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left">
                        {t[cat.nameKey]}
                      </span>
                      <ChevronRight size={16} className="opacity-80" />
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          className={`flex-1 transition-all duration-300 relative z-10 ${sidebarOpen ? 'ml-[240px] sm:ml-[280px]' : 'ml-0'
            }`}
        >
          <div className="p-5 pb-[100px]">
            {/* Header Controls */}
            <div className="flex items-center gap-4 mb-7 flex-wrap">
              {/* Sidebar Toggle Button */}
              <button
                onClick={toggleSidebar}
                className="px-4 py-3 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white rounded-xl font-semibold border-none cursor-pointer flex items-center gap-2 transition-all duration-300 shadow-[0_4px_15px_rgba(75,48,251,0.4)] hover:shadow-[0_8px_25px_rgba(75,48,251,0.6)] hover:scale-110"
              >
                <Menu size={20} />

              </button>

              <button
                className={`px-6 py-3 border-none rounded-xl font-semibold text-base cursor-pointer flex items-center gap-2 transition-all duration-300 ${mainFilter === 'all'
                  ? 'bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white shadow-[0_4px_15px_rgba(75,48,251,0.4)]'
                  : 'bg-white/30 text-white hover:bg-white/20 hover:-translate-y-0.5'
                  }`}
                onClick={() => handleMainFilterClick('all')}
              >
                <Home size={20} />
                <span className={isMobile ? 'hidden' : ''}>{t.all}</span>
              </button>

              <button
                className={`px-6 py-3 border-none rounded-xl font-semibold text-base cursor-pointer flex items-center gap-2 transition-all duration-300 ${mainFilter === 'lessons'
                  ? 'bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white shadow-[0_4px_15px_rgba(75,48,251,0.4)]'
                  : 'bg-white/30 text-white hover:bg-white/20 hover:-translate-y-0.5'
                  }`}
                onClick={() => handleMainFilterClick('lessons')}
              >
                <BookOpen size={20} />
                <span className={isMobile ? 'hidden' : ''}>{t.lessons}</span>
              </button>

              <button
                className={`px-6 py-3 border-none rounded-xl font-semibold text-base cursor-pointer flex items-center gap-2 transition-all duration-300 ${mainFilter === 'games'
                  ? 'bg-gradient-to-br from-[#4b30fb] to-[#764ba2] text-white shadow-[0_4px_15px_rgba(75,48,251,0.4)]'
                  : 'bg-white/30 text-white hover:bg-white/20 hover:-translate-y-0.5'
                  }`}
                onClick={() => handleMainFilterClick('games')}
              >
                <Gamepad2 size={20} />
                <span className={isMobile ? 'hidden' : ''}>{t.games}</span>
              </button>

              {/*<input 
                type="text" 
                placeholder={t.search}
                className="flex-1 min-w-[200px] px-5 py-3 border-2 border-white/20 rounded-xl bg-white/10 text-white text-base transition-all duration-300 placeholder:text-white/50 focus:outline-none focus:border-[#4b30fb] focus:bg-white/15 focus:shadow-[0_0_20px_rgba(75,48,251,0.3)]"
              />*/}
            </div>

            {/* Games Grid */}
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-2.5' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'}`}>
              {filteredItems.map((game, index) => (
                <div
                  key={game.id}
                  className="group cursor-pointer transition-all duration-300 hover:-translate-y-2"
                  onClick={() => handleGameClick(game)}
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.08}s both`
                  }}
                >
                  <div className="bg-gradient-to-br from-[#2a2a3e] to-[#1e1e2f] rounded-2xl overflow-hidden border border-[rgba(75,48,251,0.15)] relative shadow-[0_4px_15px_rgba(0,0,0,0.3)] group-hover:border-[#4b30fb] group-hover:shadow-[0_8px_30px_rgba(75,48,251,0.35)] transition-all duration-300">
                    {game.premium && (
                      <span className="absolute top-2 right-2 bg-gradient-to-br from-[#ffd700] to-[#ff8c00] text-[#1e1e2f] px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-[0_2px_10px_rgba(255,215,0,0.5)] z-10 animate-pulse">
                        {t.premium}
                      </span>
                    )}
                    <div className="absolute top-2 left-2 z-10">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${game.type === 'lessons'
                        ? 'bg-emerald-500/80 text-white'
                        : 'bg-amber-500/80 text-white'
                        }`}>
                        {game.type === 'lessons' ? <BookOpen size={12} className="inline" /> : <Gamepad2 size={12} className="inline" />} {game.type === 'lessons' ? (t.lessons || 'Dars') : (t.games || "O'yin")}
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
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#4b30fb] to-[#00d4ff]"
                            style={{ width: `${game.rating}%` }}
                          />
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
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/70 z-[997] backdrop-blur-[5px] top-[70px]"
          onClick={toggleSidebar}
        />
      )}

      {/* Smart Authentication Prompt */}
      <SmartAuthPrompt
        trigger={authTrigger}
        onAuthSuccess={() => {
          setAuthTrigger(null);
        }}
      />

      {/* Feedback Widget */}
      <FeedbackWidget page="home" />

      {/* Footer */}
      {!isMobile && <Footer />}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes comet {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateX(calc(100vw + 100px)) translateY(200px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;