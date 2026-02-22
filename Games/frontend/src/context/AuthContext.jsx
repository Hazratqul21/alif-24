import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

/**
 * Authentication Provider
 * Manages authentication state throughout the application
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for existing session on mount
    const initAuth = async () => {
      // Accept token from URL (cross-subdomain redirect from MainPlatform)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const urlRefresh = urlParams.get('refresh');
      if (urlToken) {
        localStorage.setItem('accessToken', urlToken);
        if (urlRefresh) localStorage.setItem('refreshToken', urlRefresh);
        const url = new URL(window.location);
        url.searchParams.delete('token');
        url.searchParams.delete('refresh');
        window.history.replaceState({}, '', url);
      }

      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const profile = await authService.getProfile();
          setUser(profile);
        } catch {
          // Token invalid, clear storage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
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
      // Backend returns snake_case tokens
      const accessToken = data.access_token || data.accessToken;
      const refreshToken = data.refresh_token || data.refreshToken;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(data.user);
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
      // Backend returns snake_case tokens
      const accessToken = data.access_token || data.accessToken;
      const refreshToken = data.refresh_token || data.refreshToken;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(data.user);
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
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
