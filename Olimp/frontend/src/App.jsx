import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import OlimpHome from './pages/OlimpHome';
import AuthSync from './components/Auth/AuthSync';
import PageLoader from './components/Common/PageLoader';
import { ThemeProvider } from './context/ThemeContext';
import { GamificationProvider } from './context/GamificationContext';

// Lazy-loaded pages — reduce initial bundle for the olympiad list landing.
const OlympiadDetail = lazy(() => import('./pages/OlympiadDetail'));
const OlympiadAdmin = lazy(() => import('./pages/OlympiadAdmin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const OlympiadBuilder = lazy(() => import('./pages/OlympiadBuilder'));
const ReadingHome = lazy(() => import('./pages/ReadingHome'));
const ReadingAdmin = lazy(() => import('./pages/ReadingAdmin'));
const OlympiadContent = lazy(() => import('./pages/OlympiadContent'));
const LessionsHome = lazy(() => import('./pages/LessionsHome'));
const LessonDetail = lazy(() => import('./pages/LessonDetail'));
const OlimpiadErtaklarPage = lazy(() => import('./pages/OlimpiadErtaklarPage'));
const ReadingOlympiadPage = lazy(() => import('./pages/ReadingOlympiadPage'));
const OlympiadDraftEdit = lazy(() => import('./pages/OlympiadDraftEdit'));

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
            <Suspense fallback={<PageLoader />}>
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

                {/* Olympiad Draft Editor */}
                <Route path="/admin/olympiads/:olympiadId/edit" element={<OlympiadDraftEdit />} />

                {/* Reading Admin */}
                <Route path="/admin/reading" element={<ReadingAdmin />} />

                {/* Reading Competition */}
                <Route path="/reading" element={<ReadingHome />} />
                <Route path="/reading/:compId" element={<ReadingHome />} />

                {/* Reading Olympiad Page */}
                <Route path="/olympiad/:id/reading" element={<ReadingOlympiadPage />} />

                {/* Student Content Pages (scoped per olympiad) */}
                <Route path="/olympiad/:olympiadId/content" element={<OlympiadContent />} />
                <Route path="/olympiad/:olympiadId/content/lessons" element={<LessionsHome />} />
                <Route path="/olympiad/:olympiadId/content/lesson/:id" element={<LessonDetail />} />
                <Route path="/olympiad/:olympiadId/content/ertaklar" element={<OlimpiadErtaklarPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthSync>
        </BrowserRouter>
      </GamificationProvider>
    </ThemeProvider>
  );
};

export default App;
