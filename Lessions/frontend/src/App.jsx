import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LessionsHome from './pages/LessionsHome';
import LessonDetail from './pages/LessonDetail';
import ErtaklarPage from './pages/ErtaklarPage';

/**
 * Lessions Platform App Component
 * Lessons & Stories
 * lessions.alif24.uz
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
        {/* Home - Lesson List */}
        <Route path="/" element={<LessionsHome />} />

        {/* Lesson Detail */}
        <Route path="/lesson/:id" element={<LessonDetail />} />

        {/* Ertaklar (Stories) */}
        <Route path="/ertaklar" element={<ErtaklarPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
