import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import OlimpHome from './pages/OlimpHome';
import OlympiadDetail from './pages/OlympiadDetail';
import ReadingHome from './pages/ReadingHome';
import ReadingPlay from './pages/ReadingPlay';

/**
 * Olimp Platform App Component
 * Olympiad management and competitions + Reading Competition
 * olimp.alif24.uz
 */
const App = () => {
  // Accept token from URL (cross-subdomain redirect from MainPlatform)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlRefresh = urlParams.get('refresh');
    if (urlToken) {
      localStorage.setItem('accessToken', urlToken);
      if (urlRefresh) localStorage.setItem('refreshToken', urlRefresh);
      const url = new URL(window.location);
      url.searchParams.delete('token');
      url.searchParams.delete('refresh');
      window.history.replaceState({}, '', url);
    }
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
    </BrowserRouter>
  );
};

export default App;
