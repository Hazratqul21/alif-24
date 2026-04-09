import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import apiService from '../services/apiService';

const AuthContext = createContext(null);

/**
 * Authentication Provider
 * Manages authentication state throughout the application
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [subscription, setSubscription] = useState(null);

  const fetchSubscription = async () => {
    try {
      const response = await apiService.get('/coins/subscription/my');
      setSubscription(response);
      return response;
    } catch (err) {
      console.warn('Subscription fetch failed:', err?.message);
      return null;
    }
  };

  useEffect(() => {
    // Check for existing session on mount
    const initAuth = async () => {
      // Skip profile fetch on admin routes to prevent unnecessary 401 errors
      if (window.location.pathname.startsWith('/admin')) {
        setLoading(false);
        setAuthChecked(true);
        return;
      }

      try {
        const profile = await authService.getProfile();
        // Only set user if we got a valid profile (not null/undefined)
        if (profile && (profile.id || profile.user?.id)) {
          setUser(profile);
          await fetchSubscription();
        }
      } catch (err) {
        // Don't immediately clear user - might be a temporary network issue
        // Keep existing user state if we already have one
        console.warn('Auth check failed:', err?.message);
      }
      setLoading(false);
      setAuthChecked(true);
    };
    initAuth();
  }, []);

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   */
  const login = async (email, password) => {
    try {
      setError(null);
      const data = await authService.login(email, password);
      // Backend automatically sets HttpOnly Cookies now.
      setUser(data.user);
      await fetchSubscription();
      return data;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  /**
   * Register new user
   * @param {Object} userData - Registration data
   */
  const register = async (userData) => {
    try {
      setError(null);
      const data = await authService.register(userData);
      // Backend automatically sets HttpOnly Cookies now.
      setUser(data.user);
      await fetchSubscription();
      return data;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue with logout even if API call fails
    }
    setUser(null);
    setSubscription(null);
  };

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   */
  const updateProfile = async (updates) => {
    const updatedUser = await authService.updateProfile(updates);
    setUser(updatedUser);
    return updatedUser;
  };

  const value = {
    user,
    subscription,
    loading,
    error,
    isAuthenticated: !!user,
    // Role checks matching backend UserRole enum
    isModerator: user?.role === 'moderator',
    isOrganization: user?.role === 'organization',
    isTeacher: user?.role === 'teacher',
    isParent: user?.role === 'parent',
    isStudent: user?.role === 'student',
    isSuperAdmin: user?.role === 'super_admin',
    // Combined checks for convenience
    isAdmin: ['admin', 'super_admin', 'moderator', 'organization'].includes(user?.role),
    canManageContent: ['admin', 'super_admin', 'moderator', 'organization', 'teacher'].includes(user?.role),
    login,
    register,
    logout,
    updateProfile,
    fetchSubscription,
    refreshSubscription: fetchSubscription,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
