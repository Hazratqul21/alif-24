import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Eager: the landing page so it paints without a second network roundtrip
import LessionsHome from './pages/LessionsHome';
import AuthSync from './components/Auth/AuthSync';
import PageLoader from './components/Common/PageLoader';

// Lazy-loaded secondary pages
const LessonDetail = lazy(() => import('./pages/LessonDetail'));
const ErtaklarUzPage = lazy(() => import('./pages/ErtaklarUzPage'));
const ErtaklarRuPage = lazy(() => import('./pages/ErtaklarRuPage'));
const ErtaklarEnPage = lazy(() => import('./pages/ErtaklarEnPage'));
const KitoblarUzPage = lazy(() => import('./pages/KitoblarUzPage'));
const KitoblarRuPage = lazy(() => import('./pages/KitoblarRuPage'));
const KitoblarEnPage = lazy(() => import('./pages/KitoblarEnPage'));

/**
 * Lessions Platform App Component
 * Lessons & Stories
 * lessions.alif24.uz
 */
const App = () => {

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthSync enforceLogin={false}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Home - Lesson List */}
            <Route path="/" element={<LessionsHome />} />

            {/* Lesson Detail */}
            <Route path="/lesson/:id" element={<LessonDetail />} />

            {/* Ertaklar (Stories) */}
            <Route path="/ertaklar" element={<ErtaklarUzPage />} />
            <Route path="/ertaklar/uz" element={<ErtaklarUzPage />} />
            <Route path="/ertaklar/ru" element={<ErtaklarRuPage />} />
            <Route path="/ertaklar/en" element={<ErtaklarEnPage />} />

            {/* Kitoblar (Books) */}
            <Route path="/kitoblar" element={<KitoblarUzPage />} />
            <Route path="/kitoblar/uz" element={<KitoblarUzPage />} />
            <Route path="/kitoblar/ru" element={<KitoblarRuPage />} />
            <Route path="/kitoblar/en" element={<KitoblarEnPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthSync>
    </BrowserRouter>
  );
};

export default App;
