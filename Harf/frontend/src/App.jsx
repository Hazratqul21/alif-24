import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Eager: Uzbek alphabet is the default landing letter set
import Harf from './components/harf/Harf';

// Lazy: other language alphabets split into separate chunks
const Harfr = lazy(() => import('./components/rharf/Harfr'));
const Eharf = lazy(() => import('./components/eharf/Eharf'));

// Common Components
import ErrorBoundary from './components/Common/ErrorBoundary';
import ToastManager from './components/Common/ToastManager';
import AuthSync from './components/Auth/AuthSync';
import SEO from './components/SEO';
import PageLoader from './components/Common/PageLoader';

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
            <AuthSync enforceLogin={false}>
              <SEO
                title="Alifbe dunyosi"
                description="Harf — bolalar uchun alifbe va so'z o'rganish platformasi. O'zbek, rus va ingliz alifbolarini interaktiv o'rganing."
                keywords="alifbe, harflar, o'zbek alifbosi, rus alifbosi, ingliz alifbosi"
                siteName="Harf | Alif24"
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
