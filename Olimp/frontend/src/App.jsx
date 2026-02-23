import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import OlimpHome from './pages/OlimpHome';
import OlympiadDetail from './pages/OlympiadDetail';
import ReadingHome from './pages/ReadingHome';
import ReadingPlay from './pages/ReadingPlay';

import AuthSync from './components/Auth/AuthSync';

/**
 * Olimp Platform App Component
 * Olympiad management and competitions + Reading Competition
 * olimp.alif24.uz
 */
const App = () => {

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthSync>
        <Routes>
          {/* Home - Olympiad List */}
          <Route path="/" element={<OlimpHome />} />

          {/* Olympiad Detail */}
          <Route path="/olympiad/:id" element={<OlympiadDetail />} />

          {/* Reading Competition */}
          <Route path="/reading" element={<ReadingHome />} />
          <Route path="/reading/:compId" element={<ReadingHome />} />
          <Route path="/reading/:compId/:taskId" element={<ReadingPlay />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthSync>
    </BrowserRouter>
  );
};

export default App;
