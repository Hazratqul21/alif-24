import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Pages
import HomePage from './pages/HomePage';
import StudentDashboard from './pages/StudentDashboard';
import ParentDashboard from './pages/ParentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import OrganizationDashboard from './pages/OrganizationDashboard';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';
import PartnersPage from './pages/PartnersPage';
import SmartKidsAI from './pages/SmartKidsAI';
import MathKidsAI from './pages/MathKidsAI';
import LiveQuizStudent from './pages/LiveQuizStudent';
import LiveQuizTeacher from './pages/LiveQuizTeacher';

// Admin Panel
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import TeachersPage from './pages/admin/TeachersPage';
import DatabasePage from './pages/admin/DatabasePage';
import ContentPage from './pages/admin/ContentPage';
import TelegramPage from './pages/admin/TelegramPage';
import OlympiadsPage from './pages/admin/OlympiadsPage';

// Harf Components (Letter Learning)
import Harf from './harf/Harf';
import Harfr from './rharf/Harfr';
import Eharf from './eharf/Eharf';

// Games
import LetterMemoryGame from './lessiongames/LetterMemoryGame';
import MathMonsterGame from './mathgames/MathMonsterGame';

// Components
import DashboardLayout from './components/Dashboard/DashboardLayout';
import LoginModal from './components/Auth/LoginModal';
import RegisterModal from './components/Auth/RegisterModal';
import SmartAuthPrompt from './components/Auth/SmartAuthPrompt';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ErrorBoundary from './components/Common/ErrorBoundary';
import ToastManager from './components/Common/ToastManager';

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
            <AppRoutes />
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

      {/* About & Partners */}
      <Route path="/about" element={<AboutPage />} />
      <Route path="/partners" element={<PartnersPage />} />

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

      {/* Harf - Letter Learning */}
      <Route path="/harf" element={<Harf />} />
      <Route path="/rharf" element={<Harfr />} />
      <Route path="/eharf" element={<Eharf />} />

      {/* Games */}
      <Route path="/games/letter-memory" element={<LetterMemoryGame />} />
      <Route path="/games/math-monster" element={<MathMonsterGame />} />

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
      </Route>

      {/* Fallback - Redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
