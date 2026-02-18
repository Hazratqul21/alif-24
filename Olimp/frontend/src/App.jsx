import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import OlimpHome from './pages/OlimpHome';
import OlympiadDetail from './pages/OlympiadDetail';

/**
 * Olimp Platform App Component
 * Olympiad management and competitions
 * olimp.alif24.uz
 */
const App = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Home - Olympiad List */}
        <Route path="/" element={<OlimpHome />} />

        {/* Olympiad Detail */}
        <Route path="/olympiad/:id" element={<OlympiadDetail />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
