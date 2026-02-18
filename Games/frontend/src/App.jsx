import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Games
import LetterMemoryGame from './games/memory/LetterMemoryGame';
import MathMonsterGame from './games/math/MathMonsterGame';
import Tetris from './games/Tetris';
import Game2048 from './games/Game2048';

// Components
import ErrorBoundary from './components/Common/ErrorBoundary';
import ToastManager from './components/Common/ToastManager';

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
            <ToastManager />
            <AppRoutes />
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

// Game Selection Component
const GameSelection = () => (
  <div className="min-h-screen bg-gradient-to-b from-purple-600 to-indigo-800 p-6">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-white text-center mb-8">
        🎮 O'yinlar
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GameCard
          title="Xotira O'yini"
          icon="🧠"
          href="/memory"
          color="from-pink-500 to-rose-600"
        />
        <GameCard
          title="Matematika"
          icon="🤖"
          href="/math-monster"
          color="from-green-500 to-emerald-600"
        />
        <GameCard
          title="Tetris"
          icon="🧱"
          href="/tetris"
          color="from-yellow-500 to-amber-600"
        />
        <GameCard
          title="2048"
          icon="🔢"
          href="/2048"
          color="from-blue-500 to-cyan-600"
        />
      </div>
    </div>
  </div>
);

const GameCard = ({ title, icon, href, color, comingSoon }) => (
  <Link
    to={href}
    className={`block bg-gradient-to-br ${color} rounded-2xl p-6 shadow-xl hover:scale-105 transition-transform ${comingSoon ? 'opacity-60' : ''}`}
  >
    <div className="text-4xl text-center mb-2">{icon}</div>
    <div className="text-white font-bold text-center">{title}</div>
    {comingSoon && (
      <div className="text-white/70 text-xs text-center mt-1">Tez kunda</div>
    )}
  </Link>
);

const ComingSoon = ({ game }) => (
  <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center">
    <div className="text-center text-white">
      <div className="text-6xl mb-4">🚧</div>
      <h1 className="text-3xl font-bold mb-2">{game}</h1>
      <p className="text-gray-400">Tez kunda...</p>
      <Link to="/" className="mt-4 inline-block bg-purple-600 px-6 py-2 rounded-lg hover:bg-purple-700">
        Orqaga
      </Link>
    </div>
  </div>
);

export default App;
