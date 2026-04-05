import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Services
import gameService from './services/gameService';

// Games
import LetterMemoryGame from './games/memory/LetterMemoryGame';
import MathMonsterGame from './games/math/MathMonsterGame';
import MathStichGame from './games/math/MathStich';
import MevaMathGame from './games/math/Mevamath';


// TODO: Tetris and Game2048 components not yet implemented
// import Tetris from './games/Tetris';
// import Game2048 from './games/Game2048';

// Components
import ErrorBoundary from './components/Common/ErrorBoundary';
import ToastManager from './components/Common/ToastManager';
import AuthSync from './components/Auth/AuthSync';

/**
 * Games Platform App Component
 * Educational games for children
 */
const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <AuthProvider>
            <AuthSync enforceLogin={false}>
              <ToastManager />
              <AppRoutes />
            </AuthSync>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

/**
 * Games Platform Routes
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Home - Game Selection */}
      <Route path="/" element={<GameSelection />} />

      {/* Memory Game */}
      <Route path="/memory" element={<LetterMemoryGame />} />
      <Route path="/xotira" element={<LetterMemoryGame />} />

      {/* Math Monster */}
      <Route path="/math-monster" element={<MathMonsterGame />} />
      <Route path="/math" element={<MathMonsterGame />} />

      {/* Math Stich (Matchstick Puzzle) */}
      <Route path="/math-stich" element={<MathStichGame />} />
      <Route path="/gugurt" element={<MathStichGame />} />

      {/* Meva Math (Logic) */}
      <Route path="/meva-math" element={<MevaMathGame />} />
      <Route path="/mantiq" element={<MevaMathGame />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Game Selection Component — MainPlatform dark space theme
const GameSelection = () => {
  const [gamesList, setGamesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      
      // Standart o'yinlar (fallback va bizning qo'shganlarimiz)
      const defaultGames = [
        { id: 1, title: "Matematika", icon: "🤖", image: "/math.jpg", path: "/math-monster", bg_color: "from-green-500 to-emerald-600", shadow_color: "rgba(16,185,129,0.4)" },
        { id: 2, title: "Xotira o'yini", icon: "🧠", image: "/xotr.jpg", path: "/memory", bg_color: "from-pink-500 to-rose-600", shadow_color: "rgba(244,63,94,0.4)" },
        { id: 3, title: "Matematik gugurt", icon: "🔥", image: "/spichki.jpg", path: "/math-stich", bg_color: "from-amber-500 to-orange-600", shadow_color: "rgba(245,158,11,0.4)" },
        { id: 4, title: "Qiziqarli sonlar", icon: "🍎", image: "/mantiqmath.jpg", path: "/meva-math", bg_color: "from-indigo-500 to-purple-600", shadow_color: "rgba(99,102,241,0.4)" },
      ];

      try {
        const data = await gameService.getGames();
        const apiGames = data.data?.games || data.games || data.data || [];
        
        // Agar backenddan o'yinlar kelsa, ularni defaultGames bilan birlashtiramiz (id bo'yicha)
        const merged = [...apiGames];
        defaultGames.forEach(dg => {
          if (!merged.find(mg => mg.id === dg.id)) {
            merged.push(dg);
          }
        });
        setGamesList(merged.length > 0 ? merged : defaultGames);
      } catch (apiErr) {
        console.warn("Backend API not reachable, using default games:", apiErr);
        setGamesList(defaultGames);
      }
    } catch (err) {
      console.error("General error loading games:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate main domain based on environment for the "Back to Home" link
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const mainDomain = isLocalhost ? 'http://localhost:5173' : 'https://alif24.uz';
  const homeUrl = `${mainDomain}/dashboard`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
      {/* Animated background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] left-[10%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '2s' }} />
        <div className="absolute top-[15%] left-[25%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
        <div className="absolute top-[8%] left-[45%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s', animationDuration: '2.5s' }} />
        <div className="absolute top-[20%] left-[60%] w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '3.5s' }} />
        <div className="absolute top-[12%] left-[75%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.8s', animationDuration: '2.8s' }} />
        <div className="absolute top-[40%] left-[18%] w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s', animationDuration: '3.8s' }} />
        <div className="absolute top-[60%] left-[72%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.7s', animationDuration: '2.2s' }} />
        <div className="absolute top-[75%] left-[8%] w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.1s', animationDuration: '2.5s' }} />
        <div className="absolute top-[85%] left-[50%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.6s', animationDuration: '3.2s' }} />
        <div className="absolute top-[55%] left-[90%] w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '2s', animationDuration: '2.7s' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-white/10 backdrop-blur-md bg-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-xl flex items-center justify-center text-xl">🎮</div>
            <div>
              <h1 className="text-xl font-bold text-white">O'yinlar</h1>
              <p className="text-xs text-white/50">games.alif24.uz</p>
            </div>
          </div>
          <a href={homeUrl} className="text-white/60 hover:text-white text-sm transition-colors">← Bosh sahifa</a>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-3">Ta'limiy O'yinlar</h2>
        <p className="text-white/50 text-center mb-10">O'yin orqali o'rganish — eng samarali usul!</p>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-indigo-400 mt-4">Yuklanmoqda...</p>
          </div>
        ) : gamesList.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎮</div>
            <p className="text-white/50 text-lg">Hozircha o'yinlar mavjud emas</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {gamesList.map((game, i) => (
              <GameCard
                key={game.id || i}
                title={game.title}
                icon={game.icon || "🎮"}
                image={game.image}
                href={game.path || `/${game.slug || game.id}`}
                color={game.bg_color || "from-blue-500 to-indigo-600"}
                shadow={game.shadow_color || "rgba(59,130,246,0.4)"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const GameCard = ({ title, icon, image, href, color, shadow }) => (
  <Link
    to={href}
    className={`block bg-gradient-to-br ${color} rounded-2xl overflow-hidden hover:scale-105 transition-all duration-300 border border-white/10`}
    style={{ boxShadow: `0 8px 30px ${shadow || 'rgba(75,48,251,0.3)'}` }}
  >
    {image ? (
      <div className="w-full aspect-[4/3] overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover" />
      </div>
    ) : (
      <div className="text-4xl text-center pt-6 pb-3">{icon}</div>
    )}
    <div className="text-white font-bold text-center text-lg px-4 py-4">{title}</div>
  </Link>
);

const ComingSoon = ({ game }) => (
  <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
    <div className="text-center text-white">
      <div className="text-6xl mb-4">🚧</div>
      <h1 className="text-3xl font-bold mb-2">{game}</h1>
      <p className="text-white/50">Tez kunda...</p>
      <Link to="/" className="mt-4 inline-block bg-gradient-to-r from-[#4b30fb] to-[#764ba2] px-6 py-2 rounded-xl hover:scale-105 transition-transform">
        Orqaga
      </Link>
    </div>
  </div>
);

export default App;
