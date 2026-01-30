import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import {
  HomePage,
  AboutPage,
  PartnerPage,
  ProfilePageTeacher,
  AdminPage,
  TeacherDashboard,
  StudentDashboard,
  ParentDashboard,
  TestAIPage
} from './pages';
import Harf from './harf/Harf';
import Harfr from './rharf/Harfr';
import LetterMemoryGame from './lessiongames/LetterMemoryGame';
import MathMonsterGame from './mathgames/MathMonsterGame';
import KidsReadingPlatformMobile from './ertak/ertak';
import SmartKidsAI from './pages/SmartKidsAI';
import MathKidsAI from './pages/MathKidsAI';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import TestCreator from './test/TestCreator';
import SmartAuthPrompt from './components/Auth/SmartAuthPrompt';
import LoginModal from './components/Auth/LoginModal';
import RegisterModal from './components/Auth/RegisterModal';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/Auth/ProtectedRoute';

import ErrorBoundary from './components/Common/ErrorBoundary';

/**
 * Main App Component
 */
const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

/**
 * App Routes
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Home Page - Direct entry point */}
      <Route path="/" element={<HomePage />} />

      {/* Child Dashboard - With Navbar */}
      <Route path="/dashboard" element={<HomePage />} />

      {/* Info Pages - With Navbar */}
      <Route path="/about" element={<AboutPage />} />
      <Route path="/partners" element={<PartnerPage />} />

      {/* Profile and Dashboards - PROTECTED */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePageTeacher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher-dashboard"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin', 'super_admin']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent-dashboard"
        element={
          <ProtectedRoute allowedRoles={['parent', 'admin', 'super_admin']}>
            <ParentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student-dashboard"
        element={
          <ProtectedRoute allowedRoles={['student', 'admin', 'super_admin']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-creator"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin', 'super_admin']}>
            <TestCreator />
          </ProtectedRoute>
        }
      />

      {/* Admin Page - PROTECTED */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <AdminPage />
          </ProtectedRoute>
        }
      />

      {/* Harf learning page */}
      <Route path="/harf" element={<Harf />} />
      <Route path="/rharf" element={<Harfr />} />

      {/* Games */}
      <Route path="/games/letter-memory" element={<LetterMemoryGame />} />
      <Route path="/games/math-monster" element={<MathMonsterGame />} />
      <Route path="/ertak" element={<KidsReadingPlatformMobile />} />

      {/* SmartKids AI */}
      <Route path="/smartkids-ai" element={<SmartKidsAI />} />

      {/* MathKids AI */}
      <Route path="/mathkids-ai" element={<MathKidsAI />} />

      {/* Admin Dashboard - NO navigation, secret access only - PROTECTED */}
      <Route
        path="/nurali"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* TestAI Platform - Teacher Only */}
      <Route
        path="/teacher/test-ai"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin', 'super_admin']}>
            <TestAIPage />
          </ProtectedRoute>
        }
      />

      {/* 404 Route */}
      <Route
        path="*"
        element={
          <div className="not-found" style={{
            textAlign: 'center',
            padding: '100px 20px',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: '#ffffff'
          }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>404</h1>
            <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)' }}>
              Sahifa topilmadi
            </p>
          </div>
        }
      />
    </Routes>
  );
};

export default App;
