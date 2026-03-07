import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import OlimpHome from './pages/OlimpHome';
import OlympiadDetail from './pages/OlympiadDetail';
import OlympiadAdmin from './pages/OlympiadAdmin';
import AdminDashboard from './pages/AdminDashboard';
import OlympiadBuilder from './pages/OlympiadBuilder';
import ReadingHome from './pages/ReadingHome';
import ReadingAdmin from './pages/ReadingAdmin';
import OlympiadContent from './pages/OlympiadContent';
import LessionsHome from './pages/LessionsHome';
import LessonDetail from './pages/LessonDetail';
import ErtaklarPage from './pages/ErtaklarPage';

import AuthSync from './components/Auth/AuthSync';
import { ThemeProvider } from './context/ThemeContext';
import { GamificationProvider } from './context/GamificationContext';

/**
 * Olimp Platform App Component
 * Olympiad management and competitions + Reading Competition
 * olimp.alif24.uz
 */
const App = () => {

  return (
    <ThemeProvider>
      <GamificationProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthSync enforceLogin={true}>
            <Routes>
              {/* Home - Olympiad List */}
              <Route path="/" element={<OlimpHome />} />

              {/* Olympiad Detail */}
              <Route path="/olympiad/:id" element={<OlympiadDetail />} />

              {/* Olympiad Admin — Participants */}
              <Route path="/olympiad/:olympiadId/participants" element={<OlympiadAdmin />} />

              {/* General Admin Analytics Dashboard */}
              <Route path="/admin/analytics" element={<AdminDashboard />} />

              {/* Olympiad Builder */}
              <Route path="/admin/build" element={<OlympiadBuilder />} />

              {/* Reading Admin */}
              <Route path="/admin/reading" element={<ReadingAdmin />} />

              {/* Reading Competition */}
              <Route path="/reading" element={<ReadingHome />} />
              <Route path="/reading/:compId" element={<ReadingHome />} />

              {/* Student Content Pages */}
              <Route path="/content" element={<OlympiadContent />} />
              <Route path="/content/lessons" element={<LessionsHome />} />
              <Route path="/content/lesson/:id" element={<LessonDetail />} />
              <Route path="/content/ertaklar" element={<ErtaklarPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthSync>
        </BrowserRouter>
      </GamificationProvider>
    </ThemeProvider>
  );
};

export default App;
