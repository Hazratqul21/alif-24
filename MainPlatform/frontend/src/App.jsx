import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Eager imports — critical path (first paint):
//  HomePage is the landing route and must render without an extra network roundtrip.
//  LoginModal/RegisterModal are used by LoginRoute which wraps HomePage.
import HomePage from './pages/HomePage';
import LoginModal from './components/Auth/LoginModal';
import RegisterModal from './components/Auth/RegisterModal';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ErrorBoundary from './components/Common/ErrorBoundary';
import ToastManager from './components/Common/ToastManager';
import GlobalSubscriptionModal from './components/Common/GlobalSubscriptionModal';
import OlympiadBannerModal from './components/Common/OlympiadBannerModal';
import PageLoader from './components/Common/PageLoader';
import { useAuth } from './context/AuthContext';

// Lazy-loaded pages — split into separate chunks for faster initial load.
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const OrganizationDashboard = lazy(() => import('./pages/OrganizationDashboard'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PartnersPage = lazy(() => import('./pages/PartnersPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const SmartKidsAI = lazy(() => import('./pages/SmartKidsAI'));
const MathKidsAI = lazy(() => import('./pages/MathKidsAI'));
const LiveQuizStudent = lazy(() => import('./pages/LiveQuizStudent'));
const LiveQuizTeacher = lazy(() => import('./pages/LiveQuizTeacher'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const MarketplaceStore = lazy(() => import('./pages/MarketplaceStore'));

// Admin Panel — all lazy-loaded, since admin is a minority user base.
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const TeachersPage = lazy(() => import('./pages/admin/TeachersPage'));
const DatabasePage = lazy(() => import('./pages/admin/DatabasePage'));
const ContentPage = lazy(() => import('./pages/admin/ContentPage'));
const TelegramPage = lazy(() => import('./pages/admin/TelegramPage'));
const OlympiadsPage = lazy(() => import('./pages/admin/OlympiadsPage'));
const ReadingCompetitionPage = lazy(() => import('./pages/admin/ReadingCompetitionPage'));
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions'));
const AdminPromoCodes = lazy(() => import('./pages/admin/AdminPromoCodes'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));

// Sub-platform redirect helper (Harf, Games, etc. now live on their own subdomains)
const PlatformRedirect = ({ baseUrl, path = '' }) => {
  // Use replace to prevent "Back" button redirect loop
  React.useEffect(() => {
    window.location.replace(`${baseUrl}${path}`);
  }, [baseUrl, path]);
  return null;
};

// Helper component to auto-open login modal when navigating to /login
const LoginRoute = () => {
  const { isAuthenticated } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(true);
  const navigate = useNavigate();

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect');

      if (redirectUrl) {
        try {
          const parsed = new URL(redirectUrl);
          const ALLOWED_HOSTS = ['alif24.uz', 'www.alif24.uz', 'olimp.alif24.uz', 'harf.alif24.uz', 'games.alif24.uz', 'testai.alif24.uz', 'lessions.alif24.uz', 'localhost', '127.0.0.1'];
          const isAllowed = ALLOWED_HOSTS.includes(parsed.hostname);

          if (isAllowed) {
            // Loop protection: check redirect counter
            const REDIRECT_KEY = 'login_redirect_count';
            const count = parseInt(sessionStorage.getItem(REDIRECT_KEY) || '0', 10);

            if (count >= 2) {
              // Too many redirects — likely a loop. Stay on main platform.
              console.warn('LoginRoute: Redirect loop detected, staying on dashboard');
              sessionStorage.removeItem(REDIRECT_KEY);
              navigate('/student-dashboard', { replace: true });
              return;
            }

            sessionStorage.setItem(REDIRECT_KEY, String(count + 1));
            window.location.href = redirectUrl;
            return;
          }
        } catch {
          // Invalid URL — ignore
        }
      }

      navigate('/student-dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <>
      <HomePage />
      <LoginModal
        isOpen={isLoginOpen && !isAuthenticated}
        onClose={() => {
          setIsLoginOpen(false);
          if (!isAuthenticated) navigate('/', { replace: true });
        }}
        onSwitchToRegister={() => { }}
      />
    </>
  );
};

/**
 * MainPlatform App Component
 * Main application for alif24.uz
 * Features: SmartKids AI, MathKids AI, Live Quiz
 */
const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <AuthProvider>
            <ToastManager />
            <GlobalSubscriptionModal />
            <OlympiadBannerModal />
            <Suspense fallback={<PageLoader />}>
              <AppRoutes />
            </Suspense>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

/**
 * MainPlatform Routes
 * Only includes routes relevant to MainPlatform:
 * - Home/Dashboard
 * - SmartKids AI
 * - MathKids AI
 * - Live Quiz
 * - Auth
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Home Page - Child Dashboard */}
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<HomePage />} />

      {/* Auto Login Trigger Route */}
      <Route path="/login" element={<LoginRoute />} />

      {/* Student Dashboard */}
      <Route
        path="/student-dashboard"
        element={
          <ProtectedRoute allowedRoles={['student', 'organization', 'moderator']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Parent Dashboard */}
      <Route
        path="/parent-dashboard"
        element={
          <ProtectedRoute allowedRoles={['parent', 'organization', 'moderator']}>
            <ParentDashboard />
          </ProtectedRoute>
        }
      />

      {/* About, Partners & Privacy */}
      <Route path="/about" element={<AboutPage />} />
      <Route path="/partners" element={<PartnersPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />

      {/* Global Leaderboard */}
      <Route path="/leaderboard" element={<LeaderboardPage />} />

      {/* Marketplace Store */}
      <Route
        path="/market"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'organization', 'moderator', 'student', 'parent']}>
            <MarketplaceStore />
          </ProtectedRoute>
        }
      />

      {/* Teacher Dashboard */}
      <Route
        path="/teacher-dashboard"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'organization', 'moderator']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      {/* Organization/Admin Dashboard */}
      <Route
        path="/organization-dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin', 'organization', 'moderator']}>
            <OrganizationDashboard />
          </ProtectedRoute>
        }
      />

      {/* Profile Page */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['student', 'teacher', 'parent', 'admin', 'super_admin', 'organization', 'moderator']}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* SmartKids AI - Story Reading */}
      <Route path="/smartkids" element={<SmartKidsAI />} />

      {/* MathKids AI - Math Solver */}
      <Route path="/mathkids" element={<MathKidsAI />} />

      {/* Live Quiz */}
      <Route
        path="/livequiz"
        element={
          <ProtectedRoute allowedRoles={['student', 'organization', 'moderator']}>
            <LiveQuizStudent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/livequiz-teacher"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'organization', 'moderator']}>
            <LiveQuizTeacher />
          </ProtectedRoute>
        }
      />

      {/* Harf - Redirect to harf.alif24.uz */}
      <Route path="/harf" element={<PlatformRedirect baseUrl="https://harf.alif24.uz" />} />
      <Route path="/rharf" element={<PlatformRedirect baseUrl="https://harf.alif24.uz" path="/rharf" />} />
      <Route path="/eharf" element={<PlatformRedirect baseUrl="https://harf.alif24.uz" path="/eharf" />} />

      {/* Games - Redirect to games.alif24.uz */}
      <Route path="/games/letter-memory" element={<PlatformRedirect baseUrl="https://games.alif24.uz" path="/letter-memory" />} />
      <Route path="/games/math-monster" element={<PlatformRedirect baseUrl="https://games.alif24.uz" path="/math-monster" />} />

      {/* Hidden Admin Entry Routes */}
      <Route path="/hazratqul" element={<AdminLogin defaultRole="hazratqul" />} />
      <Route path="/nurali" element={<AdminLogin defaultRole="nurali" />} />
      <Route path="/pedagog" element={<AdminLogin defaultRole="pedagog" />} />

      {/* Admin Panel */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="database" element={<DatabasePage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="telegram" element={<TelegramPage />} />
        <Route path="olympiads" element={<OlympiadsPage />} />
        <Route path="reading" element={<ReadingCompetitionPage />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="promo-codes" element={<AdminPromoCodes />} />
        <Route path="payments" element={<AdminPayments />} />
      </Route>

      {/* Fallback - Redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
