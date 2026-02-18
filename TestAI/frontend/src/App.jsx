import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Pages
import OlympiadPage from './pages/OlympiadPage';
import QuizJoinPage from './pages/QuizJoinPage';
import QuizPlayPage from './pages/QuizPlayPage';
import QuizCreatePage from './pages/QuizCreatePage';
import TestCreator from './components/test/TestCreator';

// Common Components
import ErrorBoundary from './components/Common/ErrorBoundary';
import ToastManager from './components/Common/ToastManager';
import ProtectedRoute from './components/Auth/ProtectedRoute';

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
            <ToastManager />
            <AppRoutes />
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
