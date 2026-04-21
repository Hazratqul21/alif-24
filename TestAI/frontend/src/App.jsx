import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Lazy-loaded pages
const OlympiadPage = lazy(() => import('./pages/OlympiadPage'));
const QuizJoinPage = lazy(() => import('./pages/QuizJoinPage'));
const QuizPlayPage = lazy(() => import('./pages/QuizPlayPage'));
const QuizCreatePage = lazy(() => import('./pages/QuizCreatePage'));
const TestCreator = lazy(() => import('./components/test/TestCreator'));

// Common Components
import ErrorBoundary from './components/Common/ErrorBoundary';
import ToastManager from './components/Common/ToastManager';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AuthSync from './components/Auth/AuthSync';
import SEO from './components/SEO';
import PageLoader from './components/Common/PageLoader';

/**
 * TestAI Platform App Component
 * AI-powered tests and quizzes
 */
const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <AuthProvider>
            <AuthSync enforceLogin={false}>
              <SEO
                title="AI yordamida testlar"
                description="TestAI — Alif24 ning AI yordamida yaratiladigan testlar platformasi. Shaxsiylashtirilgan testlar va viktorinalar."
                keywords="test ai, sun'iy intellekt test, onlayn test, alif24 test"
                siteName="TestAI | Alif24"
              />
              <ToastManager />
              <Suspense fallback={<PageLoader />}>
                <AppRoutes />
              </Suspense>
            </AuthSync>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

/**
 * TestAI Platform Routes
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Home - Redirect to tests */}
      <Route path="/" element={<Navigate to="/olympiad" replace />} />

      {/* Olympiad */}
      <Route path="/olympiad" element={<OlympiadPage />} />

      {/* Test Creator */}
      <Route
        path="/test-creator"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'organization', 'moderator']}>
            <TestCreator />
          </ProtectedRoute>
        }
      />

      {/* Live Quiz - Join */}
      <Route path="/quiz/join" element={<QuizJoinPage />} />
      <Route path="/quiz/:quizId" element={<QuizPlayPage />} />

      {/* Teacher Quiz Control */}
      <Route
        path="/quiz/create"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'organization', 'moderator']}>
            <QuizCreatePage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
