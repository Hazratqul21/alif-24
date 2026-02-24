import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Role-based dashboard routes mapping
 */
const ROLE_DASHBOARDS = {
    admin: '/organization-dashboard',
    super_admin: '/organization-dashboard',
    moderator: '/organization-dashboard',
    organization: '/organization-dashboard',
    teacher: '/teacher-dashboard',
    parent: '/parent-dashboard',
    student: '/student-dashboard'
};

/**
 * ProtectedRoute
 * Higher-order component to protect routes based on authentication and roles
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    // Trigger login modal when unauthenticated user tries to access protected route
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            window.dispatchEvent(new CustomEvent('showLoginModal', {
                detail: {
                    message: 'Bu sahifaga kirish uchun tizimga kiring.',
                    returnTo: location.pathname
                }
            }));
        }
    }, [loading, isAuthenticated, location.pathname]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#1a1a2e]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to home page but save the attempted location
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
        // User role not allowed for this route - redirect to main platform dashboard
        const appropriateDashboard = ROLE_DASHBOARDS[user?.role] || '/';
        return <Navigate to={appropriateDashboard} replace />;
    }

    return children;
};

export default ProtectedRoute;

