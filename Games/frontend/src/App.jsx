import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Services
import gameService from './services/gameService';

// Games
import LetterMemoryGame from './games/memory/LetterMemoryGame';
import MathMonsterGame from './games/math/MathMonsterGame';
import Tetris from './games/Tetris';
import Game2048 from './games/Game2048';

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

      {/* Tetris */}
      <Route path="/tetris" element={<Tetris />} />

      {/* 2048 */}
      <Route path="/2048" element={<Game2048 />} />

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
      const data = await gameService.getGames();
      setGamesList(data.data?.games || data.games || data.data || []);
    } catch (err) {
      console.error("Error loading games:", err);
      // Fallback state if backend is empty/offline
      setGamesList([
        { id: 1, title: "Xotira O'yini", icon: "🧠", path: "/memory", bg_color: "from-pink-500 to-rose-600", shadow_color: "rgba(244,63,94,0.4)" },
        { id: 2, title: "Matematika", icon: "🤖", path: "/math-monster", bg_color: "from-green-500 to-emerald-600", shadow_color: "rgba(16,185,129,0.4)" },
        { id: 3, title: "Tetris", icon: "🧱", path: "/tetris", bg_color: "from-yellow-500 to-amber-600", shadow_color: "rgba(245,158,11,0.4)" },
        { id: 4, title: "2048", icon: "🔢", path: "/2048", bg_color: "from-blue-500 to-cyan-600", shadow_color: "rgba(59,130,246,0.4)" }
      ]);
    } finally {
      setLoading(false);
    }
  };

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
          <a href="https://alif24.uz" className="text-white/60 hover:text-white text-sm transition-colors">← Bosh sahifa</a>
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

const GameCard = ({ title, icon, href, color, shadow }) => (
  <Link
    to={href}
    className={`block bg-gradient-to-br ${color} rounded-2xl p-6 hover:scale-105 transition-all duration-300 border border-white/10`}
    style={{ boxShadow: `0 8px 30px ${shadow || 'rgba(75,48,251,0.3)'}` }}
  >
    <div className="text-4xl text-center mb-3">{icon}</div>
    <div className="text-white font-bold text-center text-lg">{title}</div>
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
