import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LessionsHome from './pages/LessionsHome';
import LessonDetail from './pages/LessonDetail';
import ErtaklarPage from './pages/ErtaklarPage';

import AuthSync from './components/Auth/AuthSync';

/**
 * Lessions Platform App Component
 * Lessons & Stories
 * lessions.alif24.uz
 */
const App = () => {

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthSync enforceLogin={false}>
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
      </AuthSync>
    </BrowserRouter>
  );
};

export default App;
