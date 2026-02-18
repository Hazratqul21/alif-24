import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Harf Components
import Harf from './components/harf/Harf';
import Harfr from './components/rharf/Harfr';
import Eharf from './components/eharf/Eharf';

// Common Components
import ErrorBoundary from './components/Common/ErrorBoundary';
import ToastManager from './components/Common/ToastManager';

/**
 * Harf Platform App Component
 * Learning letters application
 * Features: Uzbek (Harf), Russian (Harfr), English (Eharf)
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
 * Harf Platform Routes
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Home - Redirect to Uzbek letters */}
      <Route path="/" element={<Navigate to="/harf" replace />} />

      {/* Uzbek Letters - O'zbek alifbosi */}
      <Route path="/harf" element={<Harf />} />
      <Route path="/harf/:letter" element={<Harf />} />

      {/* Russian Letters - Русский алфавит */}
      <Route path="/rharf" element={<Harfr />} />
      <Route path="/rharf/:letter" element={<Harfr />} />

      {/* English Letters - English Alphabet */}
      <Route path="/eharf" element={<Eharf />} />
      <Route path="/eharf/:letter" element={<Eharf />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/harf" replace />} />
    </Routes>
  );
};

export default App;
