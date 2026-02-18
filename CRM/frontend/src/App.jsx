import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';

// Pages
import CRMPage from './pages/CRMPage';
import TeacherDashboard from './pages/TeacherDashboard';
import OrganizationDashboard from './pages/OrganizationDashboard';
import OrganizationPage from './pages/OrganizationPage';
import ProfilePageTeacher from './pages/ProfilePageTeacher';

// Components
import DashboardLayout from './components/Dashboard/DashboardLayout';
import ErrorBoundary from './components/Common/ErrorBoundary';
import ToastManager from './components/Common/ToastManager';
import ProtectedRoute from './components/Auth/ProtectedRoute';

/**
 * CRM Platform App Component
 * Teacher-Student-Organization Management
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
 * CRM Platform Routes
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Home - Redirect to CRM */}
      <Route path="/" element={<Navigate to="/crm" replace />} />

      {/* CRM Main */}
      <Route
        path="/crm"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'organization', 'moderator']}>
            <CRMPage />
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

      {/* Organization Dashboard */}
      <Route
        path="/organization-dashboard"
        element={
          <ProtectedRoute allowedRoles={['organization', 'moderator']}>
            <OrganizationDashboard />
          </ProtectedRoute>
        }
      />

      {/* Organization Page */}
      <Route
        path="/organization"
        element={
          <ProtectedRoute allowedRoles={['organization', 'moderator']}>
            <OrganizationPage />
          </ProtectedRoute>
        }
      />

      {/* Teacher Profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'organization', 'moderator']}>
            <ProfilePageTeacher />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
